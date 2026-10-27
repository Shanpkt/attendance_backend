const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      default: "",
    },

    joiningDate: {
      type: String,
      required: true,
    },

    profilePic: {
      type: String,
      trim: true,
      default: "",
    },

    // Empty means use the company attendance limits.
    lateComingTime: {
      type: String,
      trim: true,
      default: "",
    },

    halfDayTime: {
      type: String,
      trim: true,
      default: "",
    },

    // disabled: cannot view, requested: waiting, enabled: can view own month
    monthlyAttendanceAccess: {
      type: String,
      enum: ["disabled", "requested", "enabled"],
      default: "disabled",
    },

    monthlyAttendanceRequestedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Employee = mongoose.model(
  "Employee",
  employeeSchema
);

module.exports = Employee;