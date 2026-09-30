const express = require("express");

const Leave = require("../models/Leave");
const Employee = require("../models/Employee");

const router = express.Router();

// POST /api/leaves
router.post("/", async (req, res) => {
  try {
    const {
      employeeId,
      leaveType,
      startDate,
      endDate,
      reason,
    } = req.body;

    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message:
          "Employee, start date and end date are required.",
      });
    }

    const employee = await Employee.findById(
      employeeId
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const leave = new Leave({
      employeeId: employee._id,
      employeeName: employee.name,
      mobileNumber: employee.mobileNumber,
      leaveType: leaveType || "Casual Leave",
      startDate,
      endDate,
      reason: reason?.trim() || "",
      status: "Scheduled",
    });

    const savedLeave = await leave.save();

    return res.status(201).json({
      success: true,
      message: "Leave scheduled successfully.",
      data: savedLeave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to schedule leave.",
      error: error.message,
    });
  }
});

// GET /api/leaves
router.get("/", async (req, res) => {
  try {
    const leaves = await Leave.find().sort({
      startDate: -1,
    });

    return res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaves.",
      error: error.message,
    });
  }
});

// GET /api/leaves/employee/:mobileNumber
router.get(
  "/employee/:mobileNumber",
  async (req, res) => {
    try {
      const leaves = await Leave.find({
        mobileNumber: req.params.mobileNumber,
      }).sort({
        startDate: -1,
      });

      return res.status(200).json({
        success: true,
        count: leaves.length,
        data: leaves,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch employee leaves.",
        error: error.message,
      });
    }
  }
);

// DELETE /api/leaves/:id
router.delete("/:id", async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(
      req.params.id
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Leave deleted successfully.",
      data: leave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete leave.",
      error: error.message,
    });
  }
});

module.exports = router;
