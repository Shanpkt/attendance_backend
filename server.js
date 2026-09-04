const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");

const Attendance = require("./models/Attendance");
const Employee = require("./models/Employee");
const Leave = require("./models/Leave");
const Setting = require("./models/Setting");
const settingsRoutes = require("./routes/settings");
const { isWithinOffice } = require("./utils/geo");

const app = express();

const PORT = process.env.PORT || 5000;

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ==================================================
// MONGODB CONNECTION
// ==================================================

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://wings:wings@cluster0.epqncfr.mongodb.net/attendance";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("================================");
    console.log("MongoDB connected successfully");
    console.log("================================");
  })
  .catch((error) => {
    console.error(
      "MongoDB connection error:",
      error.message
    );
  });

// ==================================================
// REVERSE GEOCODING
// ==================================================

const getLocationName = async (
  latitude,
  longitude
) => {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: "jsonv2",
          addressdetails: 1,
          zoom: 18,
          "accept-language": "en",
        },

        headers: {
          "User-Agent":
            "AttendanceManagementSystem/1.0",
        },

        timeout: 15000,
      }
    );

    const data = response.data;

    const address = data?.address || {};

    const parts = [
      address.house_number,
      address.building,
      address.road,
      address.residential,
      address.neighbourhood,
      address.quarter,
      address.suburb,
      address.city_district,
      address.village,
      address.town,
      address.city,
      address.municipality,
      address.state,
      address.postcode,
    ];

    const locationName = [
      ...new Set(
        parts
          .filter(
            (item) =>
              item &&
              String(item).trim()
          )
          .map((item) =>
            String(item).trim()
          )
      ),
    ].join(", ");

    return (
      locationName ||
      data?.display_name ||
      "Location unavailable"
    );
  } catch (error) {
    console.error(
      "Reverse geocoding error:",
      error.message
    );

    return "Location unavailable";
  }
};

// ==================================================
// HOME ROUTE
// ==================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message:
      "Attendance Backend is working!",
  });
});

// ==================================================
// CHECK ATTENDANCE STATUS
// GET /api/attendance/status/:mobileNumber
// ==================================================

app.get(
  "/api/attendance/status/:mobileNumber",
  async (req, res) => {
    try {
      const mobileNumber = String(
        req.params.mobileNumber
      ).trim();

      const date = req.query.date;

      if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid 10-digit mobile number.",
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          message:
            "Date is required.",
        });
      }

      const attendance =
        await Attendance.findOne({
          mobileNumber,
          date,
        });

      // ============================================
      // NO ATTENDANCE
      // ============================================

      if (!attendance) {
        return res.status(200).json({
          success: true,
          exists: false,
          status: null,
          action: "PUNCH_IN",
          message: "Ready for Punch In.",
          data: null,
        });
      }

      // ============================================
      // PUNCHED IN
      // ============================================

      if (
        attendance.status ===
        "Punched In"
      ) {
        return res.status(200).json({
          success: true,
          exists: true,
          status: attendance.status,
          action: "PUNCH_OUT",
          message: "Ready for Punch Out.",
          data: attendance,
        });
      }

      // ============================================
      // PUNCHED OUT
      // ============================================

      return res.status(200).json({
        success: true,
        exists: true,
        status: attendance.status,
        action: "ALREADY_COMPLETED",
        message:
          "Attendance already completed for today.",
        data: attendance,
      });
    } catch (error) {
      console.error(
        "Attendance status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to check attendance status.",
        error: error.message,
      });
    }
  }
);

// ==================================================
// POST ATTENDANCE
// ==================================================

app.post(
  "/api/attendance",
  async (req, res) => {
    try {
      console.log("================================");
      console.log(
        "Attendance request received"
      );
      console.log(req.body);
      console.log("================================");

      const {
        mobileNumber,
        date,
        latitude,
        longitude,
        accuracy,
        selfieUrl,
      } = req.body;

      // ============================================
      // VALIDATION
      // ============================================

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is required.",
        });
      }

      const cleanMobileNumber =
        String(mobileNumber).trim();

      if (
        !/^[6-9]\d{9}$/.test(
          cleanMobileNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit mobile number.",
        });
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          message: "Date is required.",
        });
      }

      if (
        latitude === undefined ||
        latitude === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Latitude is required.",
        });
      }

      if (
        longitude === undefined ||
        longitude === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Longitude is required.",
        });
      }

      if (
        accuracy === undefined ||
        accuracy === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Location accuracy is required.",
        });
      }

      if (!selfieUrl) {
        return res.status(400).json({
          success: false,
          message:
            "Selfie URL is required.",
        });
      }

      const officeSettings =
        await Setting.findOne({
          key: "attendanceLimits",
        });

      const geofence = isWithinOffice(
        officeSettings,
        Number(latitude),
        Number(longitude)
      );

      if (!geofence.ok) {
        return res.status(403).json({
          success: false,
          message: geofence.message,
          code: geofence.code,
          distance: geofence.distance,
          radius: geofence.radius,
        });
      }

      // ============================================
      // FIND ATTENDANCE
      // ============================================

      let attendance =
        await Attendance.findOne({
          mobileNumber:
            cleanMobileNumber,
          date,
        });

      // ============================================
      // GET LOCATION
      // ============================================

      const locationName =
        await getLocationName(
          latitude,
          longitude
        );

      const currentTime =
        new Date();

      // ============================================
      // PUNCH IN
      // ============================================

      if (!attendance) {
        attendance =
          new Attendance({
            mobileNumber:
              cleanMobileNumber,

            date,

            punchIn: {
              timestamp:
                currentTime,

              latitude:
                Number(latitude),

              longitude:
                Number(longitude),

              accuracy:
                Number(accuracy),

              locationName,

              selfieUrl,
            },

            punchOut: {
              timestamp: null,
              latitude: null,
              longitude: null,
              accuracy: null,
              locationName: null,
              selfieUrl: null,
            },

            status:
              "Punched In",
          });

        const savedAttendance =
          await attendance.save();

        console.log(
          "PUNCH IN successful"
        );

        return res.status(201).json({
          success: true,
          action: "PUNCH_IN",
          message:
            "Punch In successful.",
          data: savedAttendance,
        });
      }

      // ============================================
      // PUNCH OUT
      // ============================================

      if (
        attendance.status ===
        "Punched In"
      ) {
        attendance.punchOut = {
          timestamp:
            currentTime,

          latitude:
            Number(latitude),

          longitude:
            Number(longitude),

          accuracy:
            Number(accuracy),

          locationName,

          selfieUrl,
        };

        attendance.status =
          "Punched Out";

        const updatedAttendance =
          await attendance.save();

        console.log(
          "PUNCH OUT successful"
        );

        return res.status(200).json({
          success: true,
          action: "PUNCH_OUT",
          message:
            "Punch Out successful.",
          data: updatedAttendance,
        });
      }

      // ============================================
      // ALREADY COMPLETED
      // ============================================

      return res.status(409).json({
        success: false,
        action:
          "ALREADY_COMPLETED",
        message:
          "Attendance already completed for today.",
        data: attendance,
      });
    } catch (error) {
      console.error(
        "Attendance processing error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to process attendance.",
        error: error.message,
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
        await Attendance.find().sort({
          "punchIn.timestamp": -1,
        });

      return res.status(200).json({
        success: true,
        count:
          attendanceData.length,
        data:
          attendanceData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance.",
        error:
          error.message,
      });
    }
  }
);

// ==================================================
// GET EMPLOYEE ATTENDANCE
// ==================================================

app.get(
  "/api/attendance/employee/:mobileNumber",
  async (req, res) => {
    try {
      const mobileNumber =
        String(
          req.params.mobileNumber
        ).trim();

      const attendance =
        await Attendance.find({
          mobileNumber,
        }).sort({
          "punchIn.timestamp": -1,
        });

      return res.status(200).json({
        success: true,
        count:
          attendance.length,
        data:
          attendance,
      });
    } catch (error) {
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
// CREATE EMPLOYEE
// ==================================================

app.post(
  "/api/employees",
  async (req, res) => {
    try {
      const {
        name,
        mobileNumber,
        email,
        joiningDate,
      } = req.body;

      if (!name?.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Employee name is required.",
        });
      }

      if (
        !mobileNumber ||
        !/^\d{10}$/.test(
          String(mobileNumber).trim()
        )
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
          message:
            "Joining date is required.",
        });
      }

      const cleanMobileNumber =
        String(mobileNumber).trim();

      const existingEmployee =
        await Employee.findOne({
          mobileNumber:
            cleanMobileNumber,
        });

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message:
            "Employee with this mobile number already exists.",
        });
      }

      const employee =
        new Employee({
          name:
            name.trim(),
          mobileNumber:
            cleanMobileNumber,
          email:
            email?.trim() || "",
          joiningDate,
        });

      const savedEmployee =
        await employee.save();

      return res.status(201).json({
        success: true,
        message:
          "Employee created successfully.",
        data:
          savedEmployee,
      });
    } catch (error) {
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
// ==================================================

app.get(
  "/api/employees",
  async (req, res) => {
    try {
      const employees =
        await Employee.find().sort({
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,
        count:
          employees.length,
        data:
          employees,
      });
    } catch (error) {
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
// GET EMPLOYEE BY ID
// ==================================================

app.get(
  "/api/employees/:id",
  async (req, res) => {
    try {
      const employee =
        await Employee.findById(
          req.params.id
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
        data:
          employee,
      });
    } catch (error) {
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
// ==================================================

app.put(
  "/api/employees/:id",
  async (req, res) => {
    try {
      const {
        name,
        mobileNumber,
        email,
        joiningDate,
      } = req.body;

      const employee =
        await Employee.findById(
          req.params.id
        );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "Employee not found.",
        });
      }

      if (
        name !== undefined
      ) {
        employee.name =
          name.trim();
      }

      if (
        mobileNumber !== undefined
      ) {
        employee.mobileNumber =
          String(
            mobileNumber
          ).trim();
      }

      if (
        email !== undefined
      ) {
        employee.email =
          email.trim();
      }

      if (
        joiningDate !== undefined
      ) {
        employee.joiningDate =
          joiningDate;
      }

      const updatedEmployee =
        await employee.save();

      return res.status(200).json({
        success: true,
        message:
          "Employee updated successfully.",
        data:
          updatedEmployee,
      });
    } catch (error) {
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
// ==================================================

app.delete(
  "/api/employees/:id",
  async (req, res) => {
    try {
      const employee =
        await Employee.findByIdAndDelete(
          req.params.id
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
          "Employee deleted successfully.",
        data:
          employee,
      });
    } catch (error) {
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
// SCHEDULE LEAVE
// ==================================================

app.post(
  "/api/leaves",
  async (req, res) => {
    try {
      const {
        employeeId,
        leaveType,
        startDate,
        endDate,
        reason,
      } = req.body;

      if (
        !employeeId ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Employee, start date and end date are required.",
        });
      }

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

          startDate,
          endDate,

          reason:
            reason?.trim() || "",

          status:
            "Scheduled",
        });

      const savedLeave =
        await leave.save();

      return res.status(201).json({
        success: true,
        message:
          "Leave scheduled successfully.",
        data:
          savedLeave,
      });
    } catch (error) {
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
// ==================================================

app.get(
  "/api/leaves",
  async (req, res) => {
    try {
      const leaves =
        await Leave.find().sort({
          startDate: -1,
        });

      return res.status(200).json({
        success: true,
        count:
          leaves.length,
        data:
          leaves,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch leaves.",
        error:
          error.message,
      });
    }
  }
);

// ==================================================
// GET EMPLOYEE LEAVES
// ==================================================

app.get(
  "/api/leaves/employee/:mobileNumber",
  async (req, res) => {
    try {
      const leaves =
        await Leave.find({
          mobileNumber:
            req.params.mobileNumber,
        }).sort({
          startDate: -1,
        });

      return res.status(200).json({
        success: true,
        count:
          leaves.length,
        data:
          leaves,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch employee leaves.",
        error:
          error.message,
      });
    }
  }
);

// ==================================================
// DELETE LEAVE
// ==================================================

app.delete(
  "/api/leaves/:id",
  async (req, res) => {
    try {
      const leave =
        await Leave.findByIdAndDelete(
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
          "Leave deleted successfully.",
        data:
          leave,
      });
    } catch (error) {
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
// SETTINGS
// ==================================================

app.use("/api/settings", settingsRoutes);

// ==================================================
// 404 ROUTE
// ==================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {
  console.log("================================");
  console.log(
    `Server running on port ${PORT}`
  );
  console.log("================================");
});