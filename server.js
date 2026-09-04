const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");

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

const MONGODB_URI = "mongodb+srv://wings:wings@cluster0.epqncfr.mongodb.net/attendance";

if (!MONGODB_URI) {
  console.error(
    "❌ MONGODB_URI is not defined in environment variables."
  );
} else {
  mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
      console.log("================================");
      console.log("✅ MongoDB connected successfully");
      console.log("================================");
    })
    .catch((error) => {
      console.error(
        "❌ MongoDB connection error:",
        error.message
      );
    });
}

// ==================================================
// MONGOOSE CONNECTION EVENTS
// ==================================================

mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (error) => {
  console.error(
    "❌ MongoDB runtime error:",
    error.message
  );
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

// ==================================================
// REVERSE GEOCODING
// LATITUDE + LONGITUDE
//          ↓
// DETAILED ADDRESS
// ==================================================

const getLocationName = async (
  latitude,
  longitude
) => {
  try {
    console.log("================================");
    console.log("Getting detailed address...");
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);

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

    const address =
      data?.address || {};

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

    console.log(
      "FINAL DETAILED ADDRESS:",
      locationName
    );

    return (
      locationName ||
      data?.display_name ||
      "Location unavailable"
    );
  } catch (error) {
    console.error(
      "Reverse geocoding error:",
      error.response?.data ||
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
//                    ATTENDANCE
// ==================================================

// ==================================================
// POST ATTENDANCE
//
// FIRST REQUEST  = PUNCH IN
// SECOND REQUEST = PUNCH OUT
// THIRD REQUEST  = REJECT
// ==================================================

app.post(
  "/api/attendance",
  async (req, res) => {
    try {
      console.log("================================");
      console.log(
        "Attendance request received:"
      );
      console.log(req.body);
      console.log("================================");

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
            "Please enter a valid 10 digit mobile number.",
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

      // ==========================================
      // FIND TODAY'S ATTENDANCE
      // ==========================================

      let attendance =
        await Attendance.findOne({
          mobileNumber:
            cleanMobileNumber,
          date,
        });

      // ==========================================
      // GET LOCATION NAME
      // ==========================================

      const locationName =
        await getLocationName(
          latitude,
          longitude
        );

      // ==========================================
      // SERVER TIMESTAMP
      // ==========================================

      const currentTime =
        new Date();

      // ==========================================
      // FIRST PUNCH
      // PUNCH IN
      // ==========================================

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
            },

            punchOut: {
              timestamp: null,
              latitude: null,
              longitude: null,
              accuracy: null,
              locationName: null,
            },

            status:
              "Punched In",
          });

        const savedAttendance =
          await attendance.save();

        console.log(
          "================================"
        );

        console.log(
          "✅ PUNCH IN successful"
        );

        console.log(
          "Employee:",
          cleanMobileNumber
        );

        console.log(
          "Date:",
          date
        );

        console.log(
          "Time:",
          currentTime
        );

        console.log(
          "================================"
        );

        return res.status(201).json({
          success: true,

          action:
            "PUNCH_IN",

          message:
            "Punch In successful.",

          data:
            savedAttendance,
        });
      }

      // ==========================================
      // SECOND PUNCH
      // PUNCH OUT
      // ==========================================

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
        };

        attendance.status =
          "Punched Out";

        const updatedAttendance =
          await attendance.save();

        console.log(
          "================================"
        );

        console.log(
          "✅ PUNCH OUT successful"
        );

        console.log(
          "Employee:",
          cleanMobileNumber
        );

        console.log(
          "Date:",
          date
        );

        console.log(
          "Time:",
          currentTime
        );

        console.log(
          "================================"
        );

        return res.status(200).json({
          success: true,

          action:
            "PUNCH_OUT",

          message:
            "Punch Out successful.",

          data:
            updatedAttendance,
        });
      }

      // ==========================================
      // THIRD PUNCH
      // ALREADY COMPLETED
      // ==========================================

      if (
        attendance.status ===
        "Punched Out"
      ) {
        return res.status(409).json({
          success: false,

          action:
            "ALREADY_COMPLETED",

          message:
            "Attendance already completed for today.",

          data:
            attendance,
        });
      }

      // ==========================================
      // INVALID STATUS
      // ==========================================

      return res.status(400).json({
        success: false,

        action:
          "INVALID_STATUS",

        message:
          "Invalid attendance status.",

        data:
          attendance,
      });
    } catch (error) {
      console.error(
        "================================"
      );

      console.error(
        "❌ Attendance processing error:"
      );

      console.error(error);

      console.error(
        "================================"
      );

      // ==========================================
      // DUPLICATE ATTENDANCE
      // ==========================================

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,

          action:
            "DUPLICATE_ATTENDANCE",

          message:
            "Attendance already exists for this employee today.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Failed to process attendance.",

        error:
          error.message,
      });
    }
  }
);

// ==================================================
// GET ALL ATTENDANCE
// GET /api/attendance
// ==================================================

app.get(
  "/api/attendance",
  async (req, res) => {
    try {
      const attendanceData =
        await Attendance.find().sort({
          "punchIn.timestamp": -1,
        });

      console.log(
        "Attendance data fetched:",
        attendanceData.length
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
    } catch (error) {
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
        String(
          req.params.mobileNumber
        ).trim();

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,

          message:
            "Mobile number is required.",
        });
      }

      const attendance =
        await Attendance.find({
          mobileNumber,
        }).sort({
          "punchIn.timestamp": -1,
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
    } catch (error) {
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
// GET ATTENDANCE STATUS
//
// GET /api/attendance/status/:mobileNumber?date=4/9/2026
//
// NO RECORD     = PUNCH IN
// PUNCHED IN    = PUNCH OUT
// PUNCHED OUT   = COMPLETED
// ==================================================

app.get(
  "/api/attendance/status/:mobileNumber",
  async (req, res) => {
    try {
      const mobileNumber =
        String(
          req.params.mobileNumber
        ).trim();

      const { date } = req.query;

      console.log(
        "================================"
      );

      console.log(
        "Attendance status request"
      );

      console.log(
        "Mobile:",
        mobileNumber
      );

      console.log(
        "Date:",
        date
      );

      console.log(
        "================================"
      );

      // ==========================================
      // VALIDATE MOBILE NUMBER
      // ==========================================

      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is required.",
        });
      }

      if (
        !/^[6-9]\d{9}$/.test(
          mobileNumber
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10 digit mobile number.",
        });
      }

      // ==========================================
      // VALIDATE DATE
      // ==========================================

      if (!date) {
        return res.status(400).json({
          success: false,
          message:
            "Date is required.",
        });
      }

      // ==========================================
      // FIND ATTENDANCE
      // ==========================================

      const attendance =
        await Attendance.findOne({
          mobileNumber,
          date,
        });

      // ==========================================
      // NO ATTENDANCE
      // READY FOR PUNCH IN
      // ==========================================

      if (!attendance) {
        return res.status(200).json({
          success: true,

          exists: false,

          status: null,

          action:
            "PUNCH_IN",

          message:
            "Ready for Punch In.",

          data: null,
        });
      }

      // ==========================================
      // PUNCHED IN
      // READY FOR PUNCH OUT
      // ==========================================

      if (
        attendance.status ===
        "Punched In"
      ) {
        return res.status(200).json({
          success: true,

          exists: true,

          status:
            "Punched In",

          action:
            "PUNCH_OUT",

          message:
            "Ready for Punch Out.",

          data:
            attendance,
        });
      }

      // ==========================================
      // PUNCHED OUT
      // COMPLETED
      // ==========================================

      if (
        attendance.status ===
        "Punched Out"
      ) {
        return res.status(200).json({
          success: true,

          exists: true,

          status:
            "Punched Out",

          action:
            "COMPLETED",

          message:
            "Attendance already completed for today.",

          data:
            attendance,
        });
      }

      // ==========================================
      // UNKNOWN STATUS
      // ==========================================

      return res.status(200).json({
        success: true,

        exists: true,

        status:
          attendance.status,

        action:
          "PUNCH_IN",

        message:
          "Attendance status could not be determined.",

        data:
          attendance,
      });
    } catch (error) {
      console.error(
        "Attendance status fetch error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch attendance status.",

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

      console.log(req.body);

      console.log(
        "================================"
      );

      const {
        name,
        mobileNumber,
        email,
        joiningDate,
      } = req.body;

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
          mobileNumber.trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number must contain exactly 10 digits.",
        });
      }

      const existingEmployee =
        await Employee.findOne({
          mobileNumber:
            mobileNumber.trim(),
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
            mobileNumber.trim(),

          email:
            email
              ? email.trim()
              : "",

          joiningDate,
        });

      const savedEmployee =
        await employee.save();

      console.log(
        "✅ Employee created successfully"
      );

      return res.status(201).json({
        success: true,

        message:
          "Employee created successfully.",

        data:
          savedEmployee,
      });
    } catch (error) {
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
        await Employee.find().sort({
          createdAt: -1,
        });

      console.log(
        "Employees fetched:",
        employees.length
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
    } catch (error) {
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

        message:
          "Employee fetched successfully.",

        data:
          employee,
      });
    } catch (error) {
      console.error(
        "Employee fetch error:",
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
      const employeeId =
        req.params.id;

      const {
        name,
        mobileNumber,
        email,
        joiningDate,
      } = req.body;

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
          mobileNumber.trim()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number must contain exactly 10 digits.",
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

      const existingEmployee =
        await Employee.findOne({
          mobileNumber:
            mobileNumber.trim(),

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

      return res.status(200).json({
        success: true,

        message:
          "Employee deleted successfully.",

        data:
          employee,
      });
    } catch (error) {
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

      console.log(req.body);

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

      const overlappingLeave =
        await Leave.findOne({
          employeeId:
            employee._id,

          status:
            "Scheduled",

          startDate: {
            $lte: endDate,
          },

          endDate: {
            $gte: startDate,
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
            reason
              ? reason.trim()
              : "",

          status:
            "Scheduled",
        });

      const savedLeave =
        await leave.save();

      console.log(
        "✅ Leave scheduled successfully"
      );

      return res.status(201).json({
        success: true,

        message:
          "Leave scheduled successfully.",

        data:
          savedLeave,
      });
    } catch (error) {
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
// GET /api/leaves
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

      if (status) {
        filter.status =
          status;
      }

      if (date) {
        filter.startDate = {
          $lte: date,
        };

        filter.endDate = {
          $gte: date,
        };
      }

      const leaves =
        await Leave.find(
          filter
        ).sort({
          startDate: 1,
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,

        message:
          "Leave data fetched successfully.",

        count:
          leaves.length,

        data:
          leaves,
      });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
// 404 ROUTE
// ==================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,

    message:
      `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==================================================
// GLOBAL ERROR HANDLER
// ==================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    res.status(500).json({
      success: false,

      message:
        "Internal server error.",

      error:
        error.message,
    });
  }
);

// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  () => {
    console.log(
      "================================"
    );

    console.log(
      `🚀 Server running on port ${PORT}`
    );

    console.log(
      `Environment: ${
        process.env.NODE_ENV ||
        "development"
      }`
    );

    console.log(
      "================================"
    );
  }
);