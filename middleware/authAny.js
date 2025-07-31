// middleware/authAny.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Driver = require('../models/Driver');
const User = require('../models/User');

exports.verifyTokenAny = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(403).json({ message: 'No token provided!' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Essayons d'abord de trouver un Driver
    let driver = await Driver.findById(decoded.id).select('-password');
    if (driver) {
      if (!driver.isVerified) {
        return res.status(403).json({ message: 'Driver email not verified' });
      }
      req.driver = driver;
      req.userType = 'driver';
      return next();
    }

    // Sinon, essayons un User
    let user = await User.findById(decoded.id).select('-password');
    if (user) {
      if (!user.isVerified) {
        return res.status(403).json({ message: 'User email not verified' });
      }
      req.user = user;
      req.userType = 'user';
      return next();
    }

    return res.status(401).json({ message: 'User or Driver not found' });

  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
};
