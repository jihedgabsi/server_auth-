const mongoose = require("mongoose");

const CommissionSchema = new mongoose.Schema({
  valeur: {
    type: Number,
    required: true,
    default: 10 // par exemple 10%
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Commission", CommissionSchema);
