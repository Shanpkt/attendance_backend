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

    // FIRST PUNCH
    punchIn: {
      timestamp: {
        type: Date,
      },
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
      accuracy: {
        type: Number,
      },
      locationName: {
        type: String,
        default: "Location unavailable",
      },
    },

    // SECOND PUNCH
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

// Prevent multiple attendance records for the same employee on the same date
attendanceSchema.index(
  { mobileNumber: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);