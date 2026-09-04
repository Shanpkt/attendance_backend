const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: String,
      required: true,
    },

    punchIn: {
      timestamp: {
        type: Date,
        default: null,
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

      locationName: {
        type: String,
        default: null,
      },

      selfieUrl: {
        type: String,
        default: null,
      },
    },

    punchOut: {
      timestamp: {
        type: Date,
        default: null,
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

      locationName: {
        type: String,
        default: null,
      },

      selfieUrl: {
        type: String,
        default: null,
      },
    },

    status: {
      type: String,
      enum: ["Punched In", "Punched Out"],
      default: "Punched In",
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index(
  {
    mobileNumber: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "Attendance",
  attendanceSchema
);