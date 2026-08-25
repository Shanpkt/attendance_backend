const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Attendance = require("./models/Attendance");
const Employee = require("./models/Employee");

const app = express();

const PORT = process.env.PORT || 5000;


// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());

app.use(express.json());


// =====================================
// MONGODB CONNECTION
// =====================================

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


// =====================================
// GET HOME ROUTE
// =====================================

app.get(
  "/",
  (req, res) => {

    res.send(
      "Backend is working!"
    );

  }
);


// ==================================================
//                    ATTENDANCE
// ==================================================


// =====================================
// POST ATTENDANCE
// =====================================

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


      // =================================
      // VALIDATION
      // =================================

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


      // =================================
      // CREATE ATTENDANCE
      // =================================

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


      // =================================
      // SAVE
      // =================================

      const savedAttendance =
        await attendance.save();


      console.log(
        "Attendance saved successfully:"
      );

      console.log(
        savedAttendance
      );


      // =================================
      // RESPONSE
      // =================================

      res.status(201).json({

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

      res.status(500).json({

        success: false,

        message:
          "Failed to save attendance.",

        error:
          error.message,

      });

    }

  }
);


// =====================================
// GET ALL ATTENDANCE
// =====================================

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


      res.status(200).json({

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

      res.status(500).json({

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


// =====================================
// POST NEW EMPLOYEE
// =====================================

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


      // =================================
      // GET DATA FROM FRONTEND
      // =================================

      const {
        name,
        mobileNumber,
        email,
        joiningDate,
      } = req.body;


      // =================================
      // VALIDATION
      // =================================

      if (!name) {

        return res.status(400).json({

          success: false,

          message:
            "Employee name is required.",

        });

      }


      if (!mobileNumber) {

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


      // =================================
      // CHECK DUPLICATE MOBILE
      // =================================

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


      // =================================
      // CREATE EMPLOYEE
      // =================================

      const employee =
        new Employee({

          name:
            name,

          mobileNumber:
            mobileNumber,

          email:
            email || "",

          joiningDate:
            joiningDate,

        });


      // =================================
      // SAVE TO MONGODB
      // =================================

      const savedEmployee =
        await employee.save();


      console.log(
        "Employee saved successfully:"
      );

      console.log(
        savedEmployee
      );


      // =================================
      // RESPONSE
      // =================================

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


// =====================================
// GET ALL EMPLOYEES
// =====================================

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


// =====================================
// START SERVER
// =====================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on http://localhost:${PORT}`
    );

  }
);