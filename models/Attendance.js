const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },

    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    accuracy: {
      type: Number,
      required: true,
    },

    locationName: {
      type: String,
      default: "Location unavailable",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);