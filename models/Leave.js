const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    // ==========================================
    // EMPLOYEE
    // ==========================================

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // LEAVE DETAILS
    // ==========================================

    leaveType: {
      type: String,
      required: true,
      trim: true,
      default: "Casual Leave",
    },

    startDate: {
      type: String,
      required: true,
    },

    endDate: {
      type: String,
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    // ==========================================
    // STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "Scheduled",
        "Cancelled",
      ],
      default: "Scheduled",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Leave",
  leaveSchema
);