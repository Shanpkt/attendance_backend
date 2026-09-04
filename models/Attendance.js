const mongoose = require("mongoose");

const punchSchema = new mongoose.Schema(
  {
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
      default: "Location unavailable",
    },
  },
  { _id: false }
);

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

    // ==========================================
    // PUNCH IN
    // ==========================================

    punchIn: {
      type: punchSchema,
      default: () => ({
        timestamp: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        locationName: "Location unavailable",
      }),
    },

    // ==========================================
    // PUNCH OUT
    // ==========================================

    punchOut: {
      type: punchSchema,
      default: () => ({
        timestamp: null,
        latitude: null,
        longitude: null,
        accuracy: null,
        locationName: null,
      }),
    },

    // ==========================================
    // STATUS
    // ==========================================

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

// ==========================================
// ONE ATTENDANCE PER EMPLOYEE PER DAY
// ==========================================

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