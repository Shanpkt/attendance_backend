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

    sundayLateComingTime: {
      type: String,
      default: "10:00",
      trim: true,
    },

    sundayHalfDayTime: {
      type: String,
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

    tolerance: {
      type: Number,
      default: 30,
    },

    punchAccuracy: {
      type: Number,
      default: 30,
    },

    gpsTolerance: {
      type: Boolean,
      default: true,
    },

    showMonthlyAttendance: {
      type: Boolean,
      default: false,
    },

    paidLeaves: {
      type: Number,
      default: 0,
      min: 0,
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
