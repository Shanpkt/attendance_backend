const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// =====================================================
// APP SETUP
// =====================================================

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// MONGODB CONNECTION
// =====================================================

const MONGODB_URI = "mongodb+srv://wings:wings@cluster0.epqncfr.mongodb.net/";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables.");
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log("✅ MongoDB connected successfully");
    })
    .catch((error) => {
      console.error("❌ MongoDB connection error:", error);
    });
}

// =====================================================
// ATTENDANCE MODEL
// =====================================================

const attendanceSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    punchIn: {
      timestamp: {
        type: Date,
      },

      latitude: {
        type: Number,
      },

      longitude: {
        type: Number,
      },

      accuracy: {
        type: Number,
      },

      locationName: {
        type: String,
      },
    },

    punchOut: {
      timestamp: {
        type: Date,
      },

      latitude: {
        type: Number,
      },

      longitude: {
        type: Number,
      },

      accuracy: {
        type: Number,
      },

      locationName: {
        type: String,
      },
    },

    status: {
      type: String,
      default: "Punched In",
    },
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model(
  "Attendance",
  attendanceSchema
);

// =====================================================
// LOCATION NAME FUNCTION
// =====================================================

async function getLocationName(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "AttendanceApp/1.0",
        },
      }
    );

    if (!response.ok) {
      console.log("Location API failed");

      return "Unknown Location";
    }

    const data = await response.json();

    if (data && data.display_name) {
      return data.display_name;
    }

    return "Unknown Location";
  } catch (error) {
    console.error(
      "Location name error:",
      error.message
    );

    return "Unknown Location";
  }
}

// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Attendance backend is working!",
  });
});

// =====================================================
// POST ATTENDANCE
// PUNCH IN / PUNCH OUT
// =====================================================

app.post("/api/attendance", async (req, res) => {
  try {
    console.log("================================");
    console.log("Attendance data received:");
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
        message: "Mobile number is required.",
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
      latitude === null ||
      longitude === undefined ||
      longitude === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Location is required.",
      });
    }

    if (
      accuracy === undefined ||
      accuracy === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Location accuracy is required.",
      });
    }

    // ==========================================
    // GET LOCATION NAME
    // ==========================================

    const locationName = await getLocationName(
      latitude,
      longitude
    );

    console.log(
      "Location:",
      locationName
    );

    // ==========================================
    // CHECK TODAY'S ATTENDANCE
    // ==========================================

    const existingAttendance =
      await Attendance.findOne({
        mobileNumber,
        date,
      });

    // ==========================================
    // FIRST PUNCH = PUNCH IN
    // ==========================================

    if (!existingAttendance) {
      const attendance = new Attendance({
        mobileNumber,
        date,

        punchIn: {
          timestamp: new Date(),
          latitude,
          longitude,
          accuracy,
          locationName,
        },

        status: "Punched In",
      });

      const savedAttendance =
        await attendance.save();

      console.log(
        "✅ Punch In saved"
      );

      return res.status(201).json({
        success: true,
        punchType: "PUNCH_IN",
        message: "Punch In successful.",
        data: savedAttendance,
      });
    }

    // ==========================================
    // SECOND PUNCH = PUNCH OUT
    // ==========================================

    if (
      !existingAttendance.punchOut ||
      !existingAttendance.punchOut.timestamp
    ) {
      existingAttendance.punchOut = {
        timestamp: new Date(),
        latitude,
        longitude,
        accuracy,
        locationName,
      };

      existingAttendance.status =
        "Punched Out";

      const updatedAttendance =
        await existingAttendance.save();

      console.log(
        "✅ Punch Out saved"
      );

      return res.status(200).json({
        success: true,
        punchType: "PUNCH_OUT",
        message: "Punch Out successful.",
        data: updatedAttendance,
      });
    }

    // ==========================================
    // ALREADY PUNCHED OUT
    // ==========================================

    return res.status(400).json({
      success: false,
      message:
        "You have already punched out today.",
      data: existingAttendance,
    });
  } catch (error) {
    console.error(
      "❌ Attendance save error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to save attendance.",
      error: error.message,
    });
  }
});

// =====================================================
// GET ALL ATTENDANCE
// =====================================================

app.get(
  "/api/attendance",
  async (req, res) => {
    try {
      const attendance =
        await Attendance.find().sort({
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
      });
    } catch (error) {
      console.error(
        "Fetch attendance error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance.",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ATTENDANCE BY DATE
// =====================================================

app.get(
  "/api/attendance/date/:date",
  async (req, res) => {
    try {
      const { date } = req.params;

      const attendance =
        await Attendance.find({
          date,
        }).sort({
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
      });
    } catch (error) {
      console.error(
        "Fetch attendance by date error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance.",
        error: error.message,
      });
    }
  }
);

// =====================================================
// GET ATTENDANCE BY EMPLOYEE
// =====================================================

app.get(
  "/api/attendance/employee/:mobileNumber",
  async (req, res) => {
    try {
      const { mobileNumber } =
        req.params;

      const attendance =
        await Attendance.find({
          mobileNumber,
        }).sort({
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
      });
    } catch (error) {
      console.error(
        "Fetch employee attendance error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch employee attendance.",
        error: error.message,
      });
    }
  }
);

// =====================================================
// SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});