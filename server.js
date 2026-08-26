const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Attendance = require("./models/Attendance");
const Employee = require("./models/Employee");
const Leave = require("./models/Leave");

const app = express();

const PORT = process.env.PORT || 5000;


// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());

app.use(express.json());


// ==================================================
// MONGODB CONNECTION
// ==================================================

mongoose
  .connect(
    "mongodb+srv://wings:wings@cluster0.epqncfr.mongodb.net/attendance"
  )
  .then(() => {

    console.log(
      "MongoDB connected successfully"
    );

  })
  .catch((error) => {

    console.error(
      "MongoDB connection error:",
      error
    );

  });


// ==================================================
// HOME ROUTE
// ==================================================

app.get(
  "/",
  (req, res) => {

    res.send(
      "Attendance Backend is working!"
    );

  }
);


// ==================================================
//                    ATTENDANCE
// ==================================================


// ==================================================
// POST ATTENDANCE
// ==================================================

app.post(
  "/api/attendance",
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "Attendance data received:"
      );

      console.log(
        req.body
      );

      console.log(
        "================================"
      );


      const {
        mobileNumber,
        date,
        latitude,
        longitude,
        accuracy,
      } = req.body;


      // ==========================================
      // VALIDATION
      // ==========================================

      if (!mobileNumber) {

        return res.status(400).json({

          success: false,

          message:
            "Mobile number is required.",

        });

      }


      if (!date) {

        return res.status(400).json({

          success: false,

          message:
            "Date is required.",

        });

      }


      if (
        latitude === undefined ||
        longitude === undefined
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Location is required.",

        });

      }


      // ==========================================
      // CREATE ATTENDANCE
      // ==========================================

      const attendance =
        new Attendance({

          mobileNumber,

          date,

          timestamp:
            new Date(),

          latitude,

          longitude,

          accuracy,

        });


      // ==========================================
      // SAVE ATTENDANCE
      // ==========================================

      const savedAttendance =
        await attendance.save();


      console.log(
        "Attendance saved successfully:"
      );

      console.log(
        savedAttendance
      );


      // ==========================================
      // RESPONSE
      // ==========================================

      return res.status(201).json({

        success: true,

        message:
          "Attendance saved successfully.",

        data:
          savedAttendance,

      });

    }
    catch (error) {

      console.error(
        "Attendance save error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to save attendance.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// GET ALL ATTENDANCE
// ==================================================

app.get(
  "/api/attendance",
  async (req, res) => {

    try {

      const attendanceData =
        await Attendance.find()
          .sort({
            timestamp: -1,
          });


      console.log(
        "Attendance data fetched:"
      );

      console.log(
        attendanceData
      );


      return res.status(200).json({

        success: true,

        message:
          "Attendance data fetched successfully.",

        count:
          attendanceData.length,

        data:
          attendanceData,

      });

    }
    catch (error) {

      console.error(
        "Attendance fetch error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch attendance data.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// GET EMPLOYEE ATTENDANCE
// GET /api/attendance/employee/:mobileNumber
// ==================================================

app.get(
  "/api/attendance/employee/:mobileNumber",
  async (req, res) => {

    try {

      const mobileNumber =
        req.params.mobileNumber;


      if (!mobileNumber) {

        return res.status(400).json({

          success: false,

          message:
            "Mobile number is required.",

        });

      }


      const attendance =
        await Attendance.find({

          mobileNumber:
            mobileNumber,

        }).sort({

          timestamp: -1,

        });


      return res.status(200).json({

        success: true,

        message:
          "Employee attendance fetched successfully.",

        count:
          attendance.length,

        data:
          attendance,

      });

    }
    catch (error) {

      console.error(
        "Employee attendance fetch error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch employee attendance.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
//                     EMPLOYEES
// ==================================================


// ==================================================
// CREATE EMPLOYEE
// POST /api/employees
// ==================================================

app.post(
  "/api/employees",
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "New employee data received:"
      );

      console.log(
        req.body
      );

      console.log(
        "================================"
      );


      const {
        name,
        mobileNumber,
        email,
        joiningDate,
      } = req.body;


      // ==========================================
      // VALIDATION
      // ==========================================

      if (!name || !name.trim()) {

        return res.status(400).json({

          success: false,

          message:
            "Employee name is required.",

        });

      }


      if (
        !mobileNumber ||
        !mobileNumber.trim()
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Mobile number is required.",

        });

      }


      if (!joiningDate) {

        return res.status(400).json({

          success: false,

          message:
            "Joining date is required.",

        });

      }


      // ==========================================
      // MOBILE NUMBER VALIDATION
      // ==========================================

      if (
        !/^\d{10}$/.test(
          mobileNumber
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Mobile number must contain exactly 10 digits.",

        });

      }


      // ==========================================
      // CHECK DUPLICATE MOBILE
      // ==========================================

      const existingEmployee =
        await Employee.findOne({

          mobileNumber:
            mobileNumber,

        });


      if (existingEmployee) {

        return res.status(409).json({

          success: false,

          message:
            "Employee with this mobile number already exists.",

        });

      }


      // ==========================================
      // CREATE EMPLOYEE
      // ==========================================

      const employee =
        new Employee({

          name:
            name.trim(),

          mobileNumber:
            mobileNumber.trim(),

          email:
            email
              ? email.trim()
              : "",

          joiningDate:
            joiningDate,

        });


      // ==========================================
      // SAVE EMPLOYEE
      // ==========================================

      const savedEmployee =
        await employee.save();


      console.log(
        "Employee created successfully:"
      );

      console.log(
        savedEmployee
      );


      return res.status(201).json({

        success: true,

        message:
          "Employee created successfully.",

        data:
          savedEmployee,

      });

    }
    catch (error) {

      console.error(
        "Employee creation error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to create employee.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// GET ALL EMPLOYEES
// GET /api/employees
// ==================================================

app.get(
  "/api/employees",
  async (req, res) => {

    try {

      const employees =
        await Employee.find()
          .sort({
            createdAt: -1,
          });


      console.log(
        "Employees fetched:"
      );

      console.log(
        employees
      );


      return res.status(200).json({

        success: true,

        message:
          "Employees fetched successfully.",

        count:
          employees.length,

        data:
          employees,

      });

    }
    catch (error) {

      console.error(
        "Employee fetch error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch employees.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// GET SINGLE EMPLOYEE
// GET /api/employees/:id
// ==================================================

app.get(
  "/api/employees/:id",
  async (req, res) => {

    try {

      const employeeId =
        req.params.id;


      const employee =
        await Employee.findById(
          employeeId
        );


      if (!employee) {

        return res.status(404).json({

          success: false,

          message:
            "Employee not found.",

        });

      }


      return res.status(200).json({

        success: true,

        message:
          "Employee fetched successfully.",

        data:
          employee,

      });

    }
    catch (error) {

      console.error(
        "Employee fetch error:",
        error
      );


      if (
        error.name === "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid employee ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch employee.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// UPDATE EMPLOYEE
// PUT /api/employees/:id
// ==================================================

app.put(
  "/api/employees/:id",
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "Update employee request:"
      );

      console.log(
        "Employee ID:",
        req.params.id
      );

      console.log(
        "New data:",
        req.body
      );

      console.log(
        "================================"
      );


      const employeeId =
        req.params.id;


      const {
        name,
        mobileNumber,
        email,
        joiningDate,
      } = req.body;


      // ==========================================
      // VALIDATION
      // ==========================================

      if (!name || !name.trim()) {

        return res.status(400).json({

          success: false,

          message:
            "Employee name is required.",

        });

      }


      if (
        !mobileNumber ||
        !mobileNumber.trim()
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Mobile number is required.",

        });

      }


      if (!joiningDate) {

        return res.status(400).json({

          success: false,

          message:
            "Joining date is required.",

        });

      }


      if (
        !/^\d{10}$/.test(
          mobileNumber
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Mobile number must contain exactly 10 digits.",

        });

      }


      // ==========================================
      // FIND EMPLOYEE
      // ==========================================

      const employee =
        await Employee.findById(
          employeeId
        );


      if (!employee) {

        return res.status(404).json({

          success: false,

          message:
            "Employee not found.",

        });

      }


      // ==========================================
      // CHECK DUPLICATE MOBILE
      // ==========================================

      const existingEmployee =
        await Employee.findOne({

          mobileNumber:
            mobileNumber,

          _id: {
            $ne:
              employeeId,
          },

        });


      if (existingEmployee) {

        return res.status(409).json({

          success: false,

          message:
            "Another employee with this mobile number already exists.",

        });

      }


      // ==========================================
      // UPDATE DATA
      // ==========================================

      employee.name =
        name.trim();

      employee.mobileNumber =
        mobileNumber.trim();

      employee.email =
        email
          ? email.trim()
          : "";

      employee.joiningDate =
        joiningDate;


      // ==========================================
      // SAVE
      // ==========================================

      const updatedEmployee =
        await employee.save();


      console.log(
        "Employee updated successfully:"
      );

      console.log(
        updatedEmployee
      );


      return res.status(200).json({

        success: true,

        message:
          "Employee updated successfully.",

        data:
          updatedEmployee,

      });

    }
    catch (error) {

      console.error(
        "Employee update error:",
        error
      );


      if (
        error.name ===
        "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid employee ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Failed to update employee.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// DELETE EMPLOYEE
// DELETE /api/employees/:id
// ==================================================

app.delete(
  "/api/employees/:id",
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "Delete employee request:"
      );

      console.log(
        "Employee ID:",
        req.params.id
      );

      console.log(
        "================================"
      );


      const employeeId =
        req.params.id;


      const employee =
        await Employee.findById(
          employeeId
        );


      if (!employee) {

        return res.status(404).json({

          success: false,

          message:
            "Employee not found.",

        });

      }


      await Employee.findByIdAndDelete(
        employeeId
      );


      console.log(
        "Employee deleted successfully:"
      );

      console.log(
        employee
      );


      return res.status(200).json({

        success: true,

        message:
          "Employee deleted successfully.",

        data:
          employee,

      });

    }
    catch (error) {

      console.error(
        "Employee delete error:",
        error
      );


      if (
        error.name ===
        "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid employee ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Failed to delete employee.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
//                    LEAVE SYSTEM
// ==================================================


// ==================================================
// SCHEDULE LEAVE
//
// POST /api/leaves
// ==================================================

app.post(
  "/api/leaves",
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "Schedule leave request:"
      );

      console.log(
        req.body
      );

      console.log(
        "================================"
      );


      const {
        employeeId,
        leaveType,
        startDate,
        endDate,
        reason,
      } = req.body;


      // ==========================================
      // VALIDATION
      // ==========================================

      if (!employeeId) {

        return res.status(400).json({

          success: false,

          message:
            "Employee is required.",

        });

      }


      if (!startDate) {

        return res.status(400).json({

          success: false,

          message:
            "Start date is required.",

        });

      }


      if (!endDate) {

        return res.status(400).json({

          success: false,

          message:
            "End date is required.",

        });

      }


      // ==========================================
      // DATE VALIDATION
      // ==========================================

      const start =
        new Date(startDate);

      const end =
        new Date(endDate);


      if (
        Number.isNaN(
          start.getTime()
        ) ||
        Number.isNaN(
          end.getTime()
        )
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid leave date.",

        });

      }


      if (start > end) {

        return res.status(400).json({

          success: false,

          message:
            "End date cannot be before start date.",

        });

      }


      // ==========================================
      // FIND EMPLOYEE
      // ==========================================

      const employee =
        await Employee.findById(
          employeeId
        );


      if (!employee) {

        return res.status(404).json({

          success: false,

          message:
            "Employee not found.",

        });

      }


      // ==========================================
      // CHECK OVERLAPPING LEAVE
      // ==========================================

      const overlappingLeave =
        await Leave.findOne({

          employeeId:
            employee._id,

          status:
            "Scheduled",

          startDate: {
            $lte:
              endDate,
          },

          endDate: {
            $gte:
              startDate,
          },

        });


      if (overlappingLeave) {

        return res.status(409).json({

          success: false,

          message:
            "Employee already has scheduled leave during this date range.",

          data:
            overlappingLeave,

        });

      }


      // ==========================================
      // CREATE LEAVE
      // ==========================================

      const leave =
        new Leave({

          employeeId:
            employee._id,

          employeeName:
            employee.name,

          mobileNumber:
            employee.mobileNumber,

          leaveType:
            leaveType ||
            "Casual Leave",

          startDate:
            startDate,

          endDate:
            endDate,

          reason:
            reason
              ? reason.trim()
              : "",

          status:
            "Scheduled",

        });


      // ==========================================
      // SAVE
      // ==========================================

      const savedLeave =
        await leave.save();


      console.log(
        "Leave scheduled successfully:"
      );

      console.log(
        savedLeave
      );


      // ==========================================
      // RESPONSE
      // ==========================================

      return res.status(201).json({

        success: true,

        message:
          "Leave scheduled successfully.",

        data:
          savedLeave,

      });

    }
    catch (error) {

      console.error(
        "Schedule leave error:",
        error
      );


      if (
        error.name ===
        "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid employee ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Failed to schedule leave.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// GET ALL LEAVES
//
// GET /api/leaves
//
// Optional:
// ?date=2026-08-26
// ?status=Scheduled
// ==================================================

app.get(
  "/api/leaves",
  async (req, res) => {

    try {

      const {
        date,
        status,
      } = req.query;


      let filter = {};


      // ==========================================
      // STATUS FILTER
      // ==========================================

      if (status) {

        filter.status =
          status;

      }


      // ==========================================
      // DATE FILTER
      //
      // Returns leave where selected date
      // falls between startDate and endDate.
      // ==========================================

      if (date) {

        filter.startDate = {
          $lte:
            date,
        };

        filter.endDate = {
          $gte:
            date,
        };

      }


      const leaves =
        await Leave.find(
          filter
        ).sort({

          startDate: 1,

          createdAt: -1,

        });


      console.log(
        "Leaves fetched:"
      );

      console.log(
        leaves
      );


      return res.status(200).json({

        success: true,

        message:
          "Leave data fetched successfully.",

        count:
          leaves.length,

        data:
          leaves,

      });

    }
    catch (error) {

      console.error(
        "Leave fetch error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch leave data.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// GET EMPLOYEE LEAVES
//
// GET /api/leaves/employee/:mobileNumber
// ==================================================

app.get(
  "/api/leaves/employee/:mobileNumber",
  async (req, res) => {

    try {

      const mobileNumber =
        req.params.mobileNumber;


      if (!mobileNumber) {

        return res.status(400).json({

          success: false,

          message:
            "Mobile number is required.",

        });

      }


      const leaves =
        await Leave.find({

          mobileNumber:
            mobileNumber,

        }).sort({

          startDate: -1,

          createdAt: -1,

        });


      return res.status(200).json({

        success: true,

        message:
          "Employee leave data fetched successfully.",

        count:
          leaves.length,

        data:
          leaves,

      });

    }
    catch (error) {

      console.error(
        "Employee leave fetch error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch employee leave data.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// GET SINGLE LEAVE
//
// GET /api/leaves/:id
// ==================================================

app.get(
  "/api/leaves/:id",
  async (req, res) => {

    try {

      const leave =
        await Leave.findById(
          req.params.id
        );


      if (!leave) {

        return res.status(404).json({

          success: false,

          message:
            "Leave not found.",

        });

      }


      return res.status(200).json({

        success: true,

        message:
          "Leave fetched successfully.",

        data:
          leave,

      });

    }
    catch (error) {

      console.error(
        "Single leave fetch error:",
        error
      );


      if (
        error.name ===
        "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid leave ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Failed to fetch leave.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// CANCEL LEAVE
//
// PUT /api/leaves/:id/cancel
// ==================================================

app.put(
  "/api/leaves/:id/cancel",
  async (req, res) => {

    try {

      const leave =
        await Leave.findById(
          req.params.id
        );


      if (!leave) {

        return res.status(404).json({

          success: false,

          message:
            "Leave not found.",

        });

      }


      if (
        leave.status ===
        "Cancelled"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Leave is already cancelled.",

        });

      }


      leave.status =
        "Cancelled";


      const updatedLeave =
        await leave.save();


      return res.status(200).json({

        success: true,

        message:
          "Leave cancelled successfully.",

        data:
          updatedLeave,

      });

    }
    catch (error) {

      console.error(
        "Cancel leave error:",
        error
      );


      if (
        error.name ===
        "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid leave ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Failed to cancel leave.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// DELETE LEAVE
//
// DELETE /api/leaves/:id
// ==================================================

app.delete(
  "/api/leaves/:id",
  async (req, res) => {

    try {

      const leave =
        await Leave.findById(
          req.params.id
        );


      if (!leave) {

        return res.status(404).json({

          success: false,

          message:
            "Leave not found.",

        });

      }


      await Leave.findByIdAndDelete(
        req.params.id
      );


      return res.status(200).json({

        success: true,

        message:
          "Leave deleted successfully.",

        data:
          leave,

      });

    }
    catch (error) {

      console.error(
        "Delete leave error:",
        error
      );


      if (
        error.name ===
        "CastError"
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid leave ID.",

        });

      }


      return res.status(500).json({

        success: false,

        message:
          "Failed to delete leave.",

        error:
          error.message,

      });

    }

  }
);


// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on http://localhost:${PORT}`
    );

  }
);