const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Driver = require('../models/Driver');
const config = require('../config/config');
const nodemailer = require('nodemailer');
const axios = require('axios');

const router = express.Router();
// Helper function to send email
const sendEmail = async (options) => {
  // Setup email transporter
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });

  // Send email
  await transporter.sendMail({
    from: config.email.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  });
};

// Generate random numeric code
const generateVerificationCode = (length) => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
};

// Register a new Driver
router.post('/signup', async (req, res) => {
  try {
    // 1. Valider les champs de la requête
    if (!req.body.username || !req.body.email || !req.body.password || !req.body.phoneNumber) {
      return res.status(400).json({ message: 'Tous les champs sont requis (username, email, password, phoneNumber).' });
    }

    // 2. Chercher un utilisateur existant par email ou nom d'utilisateur
    const existingUser = await Driver.findOne({
      $or: [
        { email: req.body.email },
        { username: req.body.username }
      ]
    });

    // 3. Gérer le cas où l'utilisateur existe déjà
    if (existingUser) {
      // Cas A: L'utilisateur existe et son compte est déjà vérifié
      console.log('Valeur de isVerified:', existingUser.isVerified, '| Type:', typeof existingUser.isVerified);
      if (existingUser.isVerified) {
        return res.status(409).json({ message: 'Valeur de isVerified:', existingUser.isVerified, '| Type:', typeof existingUser.isVerified });
      } 
      
      // Cas B: L'utilisateur existe mais n'est PAS vérifié (C'est ici que la nouvelle logique est ajoutée)
      else {
        console.log(`L'utilisateur ${existingUser.username} existe mais n'est pas vérifié. Envoi d'un nouveau code.`);

        // Générer un nouveau code de vérification
        const newVerificationCode = generateVerificationCode(config.verificationCodeLength);
        
        // Mettre à jour l'utilisateur avec le nouveau code et la nouvelle date d'expiration
        existingUser.verificationCode = newVerificationCode;
        existingUser.verificationCodeExpires = Date.now() + config.verificationCodeExpiry;
        await existingUser.save();

        // Envoyer le nouveau code par email
        await sendEmail({
          to: existingUser.email,
          subject: 'Nouveau Code de Vérification',
          text: `Votre nouveau code de vérification est : ${newVerificationCode}. Il expirera dans 1 heure.`,
          html: `
            <h1>Vérification de votre compte</h1>
            <p>Quelqu'un a tenté de s'inscrire avec votre email. Voici un nouveau code de vérification :</p>
            <p><strong>${newVerificationCode}</strong></p>
            <p>Ce code expirera dans 1 heure.</p>
          `
        });

        // Envoyer le nouveau code par WhatsApp
        const cleanPhoneNumber = existingUser.phoneNumber.startsWith('+')
          ? existingUser.phoneNumber.substring(1)
          : existingUser.phoneNumber;

        try {
          await axios.post(`${config.whatsappApi.baseUrl}/send`, {
            phone: cleanPhoneNumber,
            message: `Votre nouveau code de vérification est : ${newVerificationCode}`
          }, {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (whatsappError) {
          console.error('Erreur lors de l\'envoi WhatsApp pour un utilisateur existant:', whatsappError.message);
          // On ne bloque pas le processus si WhatsApp échoue, l'email a déjà été envoyé.
        }

        // Renvoyer une réponse indiquant qu'un nouveau code a été envoyé
        return res.status(200).json({
          message: 'Ce compte existe déjà mais n\'est pas vérifié. Un nouveau code a été envoyé par email et WhatsApp.',
          userId: existingUser._id
        });
      }
    }

    // 4. Si l'utilisateur n'existe pas, créer un nouveau compte
    console.log(`Création d'un nouvel utilisateur : ${req.body.username}`);
    const verificationCode = generateVerificationCode(config.verificationCodeLength);
    
    const driver = new Driver({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password, // Le mot de passe sera haché par le pre-save hook dans le modèle
      phoneNumber: req.body.phoneNumber,
      roles: req.body.roles || ['user'],
      verificationCode: verificationCode,
      verificationCodeExpires: Date.now() + config.verificationCodeExpiry,
      isVerified: false
    });

    await driver.save();

    // 5. Envoyer l'email de vérification initial
    await sendEmail({
      to: driver.email,
      subject: 'Bienvenue ! Vérifiez votre email',
      text: `Votre code de vérification est : ${verificationCode}. Il expirera dans 1 heure.`,
      html: `
        <h1>Bienvenue !</h1>
        <p>Merci de vous être inscrit. Votre code de vérification est : <strong>${verificationCode}</strong></p>
        <p>Il expirera dans 1 heure.</p>
      `
    });
    
    // 6. Envoyer le code de vérification initial par WhatsApp
    const cleanPhoneNumber = driver.phoneNumber.startsWith('+')
      ? driver.phoneNumber.substring(1)
      : driver.phoneNumber;

    try {
      await axios.post(`${config.whatsappApi.baseUrl}/send`, {
        phone: cleanPhoneNumber,
        message: `Votre code de vérification est : ${verificationCode}`
      }, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (whatsappError) {
      console.error('Erreur lors de l\'envoi WhatsApp pour un nouvel utilisateur:', whatsappError.message);
    }

    // 7. Renvoyer une réponse de succès pour la nouvelle inscription
    res.status(201).json({
      message: 'Utilisateur enregistré avec succès ! Veuillez consulter vos emails et WhatsApp pour le code de vérification.',
      userId: driver._id
    });

  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Une erreur interne est survenue.", error: error.message });
  }
});
//==================================================================================================
// Login Driver
router.post('/signin', async (req, res) => {
  try {
    // Find Driver by email
    const driver = await Driver.findOne({ email: req.body.email });
    
    if (!driver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check password
    const passwordIsValid = await driver.comparePassword(req.body.password);
    
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Check if driver email is verified
    if (!driver.isVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email first.',
        userId: driver._id
      });
    }

    // Update FCM token if provided in the request
    if (req.body.fcmToken) {
      driver.fcmToken = req.body.fcmToken;
      await driver.save();
    }

    // Create token
    const token = jwt.sign(
      { id: driver._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );

    // Return driver info & token
    res.status(200).json({
      id: driver._id,
      username: driver.username,
      email: driver.email,
      roles: driver.roles,
      accessToken: token,
      fcmToken: driver.fcmToken // Include fcmToken in the response
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
// Verify email with code
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, verificationCode } = req.body;

    if (!userId || !verificationCode) {
      return res.status(400).json({ message: 'User ID and verification code are required' });
    }

    // Find driver by ID
    const driver = await Driver.findById(userId);

    if (!driver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if Driver is already verified
    if (driver.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Check if verification code is valid and not expired
    if (
      driver.verificationCode !== verificationCode ||
      driver.verificationCodeExpires < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Update Driver as verified
    driver.isVerified = true;
    driver.verificationCode = null;
    driver.verificationCodeExpires = null;
    await driver.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { email,phoneNumber } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find Driver by email
    const driver = await Driver.findOne({ email });

    if (!driver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if driver is already verified
    if (driver.isVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode(config.verificationCodeLength);
    
    // Update driver with new verification code
    driver.verificationCode = verificationCode;
    driver.verificationCodeExpires = Date.now() + config.verificationCodeExpiry;
    await driver.save();

    // Send verification email
    await sendEmail({
      to: driver.email,
      subject: 'Email Verification Code (Resent)',
      text: `Your verification code is: ${verificationCode}. It will expire in 1 hour.`,
      html: `
        <h1>Email Verification</h1>
        <p>Your verification code is: <strong>${verificationCode}</strong></p>
        <p>It will expire in 1 hour.</p>
      `
    });

     const cleanPhoneNumber = phoneNumber.startsWith('+')
  ? phoneNumber.substring(1)
  : phoneNumber;

try {
  await axios.post(`${config.whatsappApi.baseUrl}/send`, {
    phone: cleanPhoneNumber,
    message: `Votre code de vérification est : ${verificationCode}`
  }, {
    headers: { 'Content-Type': 'application/json' }
  });
} catch (whatsappError) {
  console.error('Erreur WhatsApp:', whatsappError.message);
}

    res.status(200).json({ 
      message: 'Verification code resent successfully! Please check your email.',
      userId: driver._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
//==================================================================================================
router.post('/send-reset-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find Driver by email
    const driver = await Driver.findOne({ email });
    
    if (!driver) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate 6-digit verification code
    const resetCode = generateVerificationCode(6);
    
    // Set code and expiry on Driver document (expires in 15 minutes)
    driver.resetPasswordCode = resetCode;
    driver.resetPasswordExpires = Date.now() + (15 * 60 * 1000); // 15 minutes
    
    await driver.save();

    // Send email with verification code
    await sendEmail({
      to: driver.email,
      subject: 'Password Reset Verification Code',
      text: `Your password reset verification code is: ${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Password Reset Verification</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 3px;">${resetCode}</h1>
          </div>
          <p style="color: #666; text-align: center;">
            Enter this 6-digit code in the app to reset your password.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center;">
            This code will expire in 15 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      `
    });

    res.status(200).json({ message: 'Verification code sent successfully' });
  } catch (error) {
    console.error('Send reset code error:', error);
    
    // Clean up on error
    if (error.driver) {
      error.driver.resetPasswordCode = undefined;
      error.driver.resetPasswordExpires = undefined;
      await error.driver.save();
    }
    
    res.status(500).json({ message: 'Could not send verification code' });
  }
});

//==================================================================================================
// NEW: Reset password with verification code
router.post('/reset-password-with-code', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        message: 'Email, verification code, and new password are required' 
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Find driver with matching email and code
    const driver = await Driver.findOne({ 
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!driver) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification code' 
      });
    }

    // Set new password and clear reset fields
    driver.password = newPassword; // This will be hashed by the pre-save hook in your model
    driver.resetPasswordCode = undefined;
    driver.resetPasswordExpires = undefined;
    
    await driver.save();

    // Send confirmation email
    await sendEmail({
      to: driver.email,
      subject: 'Password Reset Successful',
      text: 'Your password has been successfully reset. If you did not make this change, please contact support immediately.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745; text-align: center;">Password Reset Successful</h2>
          <p style="color: #333; text-align: center;">
            Your password has been successfully reset.
          </p>
          <p style="color: #666; text-align: center;">
            You can now log in with your new password.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you did not make this change, please contact support immediately.
          </p>
        </div>
      `
    });

    res.status(200).json({ 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('Reset password with code error:', error);
    res.status(500).json({ message: 'Could not reset password' });
  }
});

//==================================================================================================
// NEW: Verify reset code (optional - to check if code is valid before password reset)
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    const driver = await Driver.findOne({ 
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!driver) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    res.status(200).json({ message: 'Code is valid' });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Could not verify code' });
  }
});

//==================================================================================================
// LEGACY: Keep old forgot-password endpoint for backward compatibility (optional)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find Driver by email
    const driver = await Driver.findOne({ email });
    
    if (!driver) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token and expiry on Driver document
    driver.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    driver.resetPasswordExpires = Date.now() + config.resetPasswordExpiry;
    
    await driver.save();

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

    // Create email message
    const message = `You requested a password reset. Please click on the following link to reset your password: \n\n ${resetUrl} \n\n If you didn't request this, please ignore this email.`;

    // Send email
    await sendEmail({
      to: driver.email,
      subject: 'Password Reset Request',
      text: message
    });

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    if (driver) {
      driver.resetPasswordToken = undefined;
      driver.resetPasswordExpires = undefined;
      await driver.save();
    }
    
    res.status(500).json({ message: 'Could not send reset email' });
  }
});


//==================================================================================================
// Reset password - validate token and set new password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const { token } = req.params;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Hash the token from URL
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find Driver with token and valid expiry
    const driver = await Driver.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!driver) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password and clear reset token fields
    driver.password = password;
    driver.resetPasswordToken = undefined;
    driver.resetPasswordExpires = undefined;
    
    await driver.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Could not reset password' });
  }
});
//==================================================================================================
// Validate reset token without setting a new password
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Hash the token from URL
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find Driver with token and valid expiry
    const driver = await Driver.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!driver) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ message: 'Could not validate token' });
  }
});

module.exports = router;
