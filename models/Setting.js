const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "attendanceLimits",
      trim: true,
    },

    lateComingTime: {
      type: String,
      required: true,
      default: "10:00",
      trim: true,
    },

    halfDayTime: {
      type: String,
      required: true,
      default: "13:30",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Setting",
  settingSchema
);
