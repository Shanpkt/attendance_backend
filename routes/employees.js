const express = require("express");

const Employee = require("../models/Employee");
const Setting = require("../models/Setting");

const router = express.Router();

const isValidTime = (value) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    String(value || "").trim()
  );
};

const readOptionalTime = (body, key) => {
  if (
    !Object.prototype.hasOwnProperty.call(
      body,
      key
    )
  ) {
    return {
      provided: false,
      value: "",
    };
  }

  const value = String(body[key] || "").trim();

  if (!value) {
    return {
      provided: true,
      value: "",
    };
  }

  if (!isValidTime(value)) {
    return {
      provided: true,
      value: null,
    };
  }

  return {
    provided: true,
    value,
  };
};

// POST /api/employees
router.post("/", async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      joiningDate,
      profilePic,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Employee name is required.",
      });
    }

    if (
      !mobileNumber ||
      !/^\d{10}$/.test(String(mobileNumber).trim())
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid mobile number is required.",
      });
    }

    if (!joiningDate) {
      return res.status(400).json({
        success: false,
        message: "Joining date is required.",
      });
    }

    const cleanMobileNumber =
      String(mobileNumber).trim();

    const existingEmployee =
      await Employee.findOne({
        mobileNumber: cleanMobileNumber,
      });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message:
          "Employee with this mobile number already exists.",
      });
    }

    const employee = new Employee({
      name: name.trim(),
      mobileNumber: cleanMobileNumber,
      email: email?.trim() || "",
      joiningDate,
      profilePic: String(profilePic || "").trim(),
    });

    const savedEmployee = await employee.save();

    return res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      data: savedEmployee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create employee.",
      error: error.message,
    });
  }
});

// GET /api/employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees.",
      error: error.message,
    });
  }
});

// GET /api/employees/:id
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(
      req.params.id
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee.",
      error: error.message,
    });
  }
});

// PUT /api/employees/:id
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      email,
      joiningDate,
      profilePic,
    } = req.body;

    const employee = await Employee.findById(
      req.params.id
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    if (name !== undefined) {
      employee.name = name.trim();
    }

    if (mobileNumber !== undefined) {
      employee.mobileNumber = String(
        mobileNumber
      ).trim();
    }

    if (email !== undefined) {
      employee.email = email.trim();
    }

    if (joiningDate !== undefined) {
      employee.joiningDate = joiningDate;
    }

    if (profilePic !== undefined) {
      employee.profilePic = String(
        profilePic || ""
      ).trim();
    }

    const lateComingTime = readOptionalTime(
      req.body,
      "lateComingTime"
    );

    const halfDayTime = readOptionalTime(
      req.body,
      "halfDayTime"
    );

    if (
      lateComingTime.value === null ||
      halfDayTime.value === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Late mark and half day times must be empty or HH:MM.",
      });
    }

    if (lateComingTime.provided) {
      employee.lateComingTime =
        lateComingTime.value;
    }

    if (halfDayTime.provided) {
      employee.halfDayTime = halfDayTime.value;
    }

    const officeSettings = await Setting.findOne({
      key: "attendanceLimits",
    });

    const resolvedLateTime =
      employee.lateComingTime ||
      officeSettings?.lateComingTime ||
      "10:00";

    const resolvedHalfDayTime =
      employee.halfDayTime ||
      officeSettings?.halfDayTime ||
      "13:30";

    if (
      resolvedHalfDayTime <= resolvedLateTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Half day time must be later than the late mark time.",
      });
    }

    const updatedEmployee = await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully.",
      data: updatedEmployee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update employee.",
      error: error.message,
    });
  }
});

// DELETE /api/employees/:id
router.delete("/:id", async (req, res) => {
  try {
    const employee =
      await Employee.findByIdAndDelete(
        req.params.id
      );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully.",
      data: employee,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete employee.",
      error: error.message,
    });
  }
});

module.exports = router;
