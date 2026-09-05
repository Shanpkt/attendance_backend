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

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    accuracy: {
      type: Number,
      default: null,
    },

    gpsTolerance: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

module.exports = mongoose.model(
  "Setting",
  settingSchema
);
