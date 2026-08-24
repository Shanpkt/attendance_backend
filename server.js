const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Attendance = require("./models/Attendance");

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

app.get("/", (req, res) => {
  res.send("Backend is working!");
});

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

      console.log(req.body);

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

          // Server timestamp
          timestamp: new Date(),

          latitude,

          longitude,

          accuracy,

        });

      // =================================
      // SAVE TO MONGODB
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
      // SEND RESPONSE
      // =================================

      res.status(201).json({

        success: true,

        message:
          "Attendance saved successfully.",

        data: savedAttendance,

      });

    } catch (error) {

      console.error(
        "Attendance save error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to save attendance.",

        error: error.message,

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

      // Get all attendance
      // Latest first

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

      // =================================
      // SEND RESPONSE
      // =================================

      res.status(200).json({

        success: true,

        message:
          "Attendance data fetched successfully.",

        count:
          attendanceData.length,

        data:
          attendanceData,

      });

    } catch (error) {

      console.error(
        "Attendance fetch error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Failed to fetch attendance data.",

        error: error.message,

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