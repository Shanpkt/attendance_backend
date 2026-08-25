const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Attendance = require("./models/Attendance");
const Employee = require("./models/Employee");

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


      // ==========================================
      // RESPONSE
      // ==========================================

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


      // ==========================================
      // MOBILE VALIDATION
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
            $ne: employeeId,
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
      // SAVE UPDATED EMPLOYEE
      // ==========================================

      const updatedEmployee =
        await employee.save();


      console.log(
        "Employee updated successfully:"
      );

      console.log(
        updatedEmployee
      );


      // ==========================================
      // RESPONSE
      // ==========================================

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


      // ==========================================
      // INVALID MONGODB ID
      // ==========================================

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
      // DELETE
      // ==========================================

      await Employee.findByIdAndDelete(
        employeeId
      );


      console.log(
        "Employee deleted successfully:"
      );

      console.log(
        employee
      );


      // ==========================================
      // RESPONSE
      // ==========================================

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


      // ==========================================
      // INVALID MONGODB ID
      // ==========================================

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