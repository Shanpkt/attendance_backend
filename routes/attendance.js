const express = require("express");
const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const Setting = require("../models/Setting");
const {
  isWithinOffice,
  shouldKeepGpsTolerance,
} = require("../utils/geo");
const { getLocationName } = require("../utils/geocode");
const {
  resolveDayLimits,
  computeAttendanceFlags,
} = require("../utils/attendanceFlags");
const {
  getSettingsKeyForWorkspace,
} = require("../utils/settingsKeys");

const router = express.Router();

const getPunchGapBlock = (employee, punchInTimestamp, now) => {
  const minHours = Number(employee?.minPunchGapHours);

  if (
    !Number.isFinite(minHours) ||
    minHours <= 0 ||
    !punchInTimestamp
  ) {
    return null;
  }

  const punchInMs = new Date(punchInTimestamp).getTime();

  if (Number.isNaN(punchInMs)) {
    return null;
  }

  const allowedAtMs = punchInMs + minHours * 60 * 60 * 1000;
  const remainingMs = allowedAtMs - now.getTime();

  if (remainingMs <= 0) {
    return null;
  }

  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const waitLabel =
    hours > 0 && minutes > 0
      ? `${hours} hr ${minutes} min`
      : hours > 0
        ? `${hours} hr`
        : `${Math.max(totalMinutes, 1)} min`;

  return {
    minPunchGapHours: minHours,
    punchOutAllowedAt: new Date(allowedAtMs).toISOString(),
    message: `Punch out is locked for ${minHours} hour${
      minHours === 1 ? "" : "s"
    } after punch in. Please wait ${waitLabel}.`,
  };
};

const getOfficeSettingsForEmployee = async (employee) => {
  const key = getSettingsKeyForWorkspace(
    employee?.workspace
  );

  return Setting.findOne({ key });
};

// GET /api/attendance/status/:mobileNumber
router.get(
  "/status/:mobileNumber",
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
          message: "Date is required.",
        });
      }

      const attendance = await Attendance.findOne({
        mobileNumber,
        date,
      });

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

      if (attendance.status === "Punched In") {
        const employee = await Employee.findOne({
          mobileNumber,
        });
        const punchGap = getPunchGapBlock(
          employee,
          attendance.punchIn?.timestamp,
          new Date()
        );

        return res.status(200).json({
          success: true,
          exists: true,
          status: attendance.status,
          action: punchGap ? "PUNCH_OUT_LOCKED" : "PUNCH_OUT",
          message: punchGap
            ? punchGap.message
            : "Ready for Punch Out.",
          minPunchGapHours: punchGap
            ? punchGap.minPunchGapHours
            : Number(employee?.minPunchGapHours) || 0,
          punchOutAllowedAt: punchGap
            ? punchGap.punchOutAllowedAt
            : null,
          data: attendance,
        });
      }

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

// GET /api/attendance/manage/:mobileNumber
// Admin punch edit: no monthly-attendance access gate.
router.get(
  "/manage/:mobileNumber",
  async (req, res) => {
    try {
      const mobileNumber = String(
        req.params.mobileNumber
      ).trim();

      const employee = await Employee.findOne({
        mobileNumber,
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "This mobile number is not registered.",
        });
      }

      const attendance = await Attendance.find({
        mobileNumber,
      }).sort({
        "punchIn.timestamp": -1,
      });

      return res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch employee attendance.",
        error: error.message,
      });
    }
  }
);

// GET /api/attendance/employee/:mobileNumber
router.get(
  "/employee/:mobileNumber",
  async (req, res) => {
    try {
      const mobileNumber = String(
        req.params.mobileNumber
      ).trim();

      const employee = await Employee.findOne({
        mobileNumber,
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message:
            "This mobile number is not registered.",
        });
      }

      if (
        employee.monthlyAttendanceAccess !==
        "enabled"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Monthly attendance is not enabled for this employee.",
        });
      }

      const attendance = await Attendance.find({
        mobileNumber,
      }).sort({
        "punchIn.timestamp": -1,
      });

      return res.status(200).json({
        success: true,
        count: attendance.length,
        data: attendance,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch employee attendance.",
        error: error.message,
      });
    }
  }
);

// GET /api/attendance
router.get("/", async (req, res) => {
  try {
    const attendanceData =
      await Attendance.find().sort({
        "punchIn.timestamp": -1,
      });

    return res.status(200).json({
      success: true,
      count: attendanceData.length,
      data: attendanceData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance.",
      error: error.message,
    });
  }
});

// POST /api/attendance
router.post("/", async (req, res) => {
  try {
    console.log("================================");
    console.log("Attendance request received");
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

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required.",
      });
    }

    const cleanMobileNumber =
      String(mobileNumber).trim();

    if (!/^[6-9]\d{9}$/.test(cleanMobileNumber)) {
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

    if (!selfieUrl) {
      return res.status(400).json({
        success: false,
        message: "Selfie URL is required.",
      });
    }

    const employee = await Employee.findOne({
      mobileNumber: cleanMobileNumber,
    });

    const officeSettings =
      (await getOfficeSettingsForEmployee(employee)) ||
      (await Setting.findOne({
        key: "attendanceLimits",
      }));

    const skipGpsCheck = !shouldKeepGpsTolerance(
      officeSettings?.gpsTolerance
    );

    if (!skipGpsCheck) {
      if (
        latitude === undefined ||
        latitude === null
      ) {
        return res.status(400).json({
          success: false,
          message: "Latitude is required.",
        });
      }

      if (
        longitude === undefined ||
        longitude === null
      ) {
        return res.status(400).json({
          success: false,
          message: "Longitude is required.",
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
    }

    let attendance = await Attendance.findOne({
      mobileNumber: cleanMobileNumber,
      date,
    });

    const locationName = skipGpsCheck
      ? "GPS check skipped"
      : await getLocationName(latitude, longitude);

    const punchLatitude = skipGpsCheck
      ? null
      : Number(latitude);

    const punchLongitude = skipGpsCheck
      ? null
      : Number(longitude);

    const punchAccuracy = skipGpsCheck
      ? null
      : Number(accuracy);

    const currentTime = new Date();

    const dayLimits = resolveDayLimits(
      officeSettings,
      employee,
      date
    );

    if (!attendance) {
      const flags = computeAttendanceFlags({
        punchInTimestamp: currentTime,
        punchOutTimestamp: null,
        lateComingTime: dayLimits.lateComingTime,
        halfDayTime: dayLimits.halfDayTime,
      });

      attendance = new Attendance({
        mobileNumber: cleanMobileNumber,
        date,
        punchIn: {
          timestamp: currentTime,
          latitude: punchLatitude,
          longitude: punchLongitude,
          accuracy: punchAccuracy,
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
        limits: dayLimits,
        flags,
        status: "Punched In",
      });

      const savedAttendance =
        await attendance.save();

      console.log("PUNCH IN successful");

      return res.status(201).json({
        success: true,
        action: "PUNCH_IN",
        message: "Punch In successful.",
        data: savedAttendance,
      });
    }

    if (attendance.status === "Punched In") {
      const punchGap = getPunchGapBlock(
        employee,
        attendance.punchIn?.timestamp,
        currentTime
      );

      if (punchGap) {
        return res.status(403).json({
          success: false,
          action: "PUNCH_OUT_LOCKED",
          code: "PUNCH_GAP",
          message: punchGap.message,
          minPunchGapHours: punchGap.minPunchGapHours,
          punchOutAllowedAt: punchGap.punchOutAllowedAt,
        });
      }

      attendance.punchOut = {
        timestamp: currentTime,
        latitude: punchLatitude,
        longitude: punchLongitude,
        accuracy: punchAccuracy,
        locationName,
        selfieUrl,
      };

      attendance.status = "Punched Out";

      // Keep original day limits if already saved; otherwise snapshot now
      if (
        !attendance.limits?.lateComingTime ||
        !attendance.limits?.halfDayTime
      ) {
        attendance.limits = dayLimits;
      }

      const savedLimits = {
        lateComingTime:
          attendance.limits?.lateComingTime ||
          dayLimits.lateComingTime,
        halfDayTime:
          attendance.limits?.halfDayTime ||
          dayLimits.halfDayTime,
      };

      attendance.limits = savedLimits;
      attendance.flags = computeAttendanceFlags({
        punchInTimestamp:
          attendance.punchIn?.timestamp,
        punchOutTimestamp: currentTime,
        lateComingTime: savedLimits.lateComingTime,
        halfDayTime: savedLimits.halfDayTime,
      });

      const updatedAttendance =
        await attendance.save();

      console.log("PUNCH OUT successful");

      return res.status(200).json({
        success: true,
        action: "PUNCH_OUT",
        message: "Punch Out successful.",
        data: updatedAttendance,
      });
    }

    return res.status(409).json({
      success: false,
      action: "ALREADY_COMPLETED",
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
      message: "Failed to process attendance.",
      error: error.message,
    });
  }
});

const isValidTime = (value) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    String(value || "").trim()
  );
};

const isValidDateKey = (value) => {
  const date = String(value || "").trim();

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) ||
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)
  );
};

const readTimestamp = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

const keepPunchDetails = (punch, timestamp) => {
  if (!timestamp) {
    return {
      timestamp: null,
      latitude: null,
      longitude: null,
      accuracy: null,
      locationName: null,
      selfieUrl: null,
    };
  }

  return {
    timestamp,
    latitude:
      punch?.latitude ?? null,
    longitude:
      punch?.longitude ?? null,
    accuracy:
      punch?.accuracy ?? null,
    locationName:
      punch?.locationName || "Corrected by admin",
    selfieUrl:
      punch?.selfieUrl ?? null,
  };
};

// PUT /api/attendance/correct
router.put("/correct", async (req, res) => {
  try {
    const mobileNumber = String(
      req.body.mobileNumber || ""
    ).trim();

    const date = String(
      req.body.date || ""
    ).trim();

    const lateComingTime = String(
      req.body.lateComingTime || ""
    ).trim();

    const punchInTime = readTimestamp(
      req.body.punchInTime
    );

    const hasPunchOut = Object.prototype.hasOwnProperty.call(
      req.body,
      "punchOutTime"
    );

    const punchOutTime = hasPunchOut
      ? readTimestamp(req.body.punchOutTime)
      : null;

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a valid 10-digit mobile number.",
      });
    }

    if (!isValidDateKey(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must be YYYY-MM-DD.",
      });
    }

    if (!isValidTime(lateComingTime)) {
      return res.status(400).json({
        success: false,
        message:
          "Late time limit must be a valid time (HH:MM).",
      });
    }

    if (
      punchInTime === undefined ||
      punchOutTime === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Punch in and punch out must be valid times.",
      });
    }

    if (!punchInTime) {
      return res.status(400).json({
        success: false,
        message: "Punch in time is required.",
      });
    }

    if (
      punchOutTime &&
      punchOutTime.getTime() <= punchInTime.getTime()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Punch out must be later than punch in.",
      });
    }

    const employee = await Employee.findOne({
      mobileNumber,
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found.",
      });
    }

    const officeSettings =
      await getOfficeSettingsForEmployee(employee);

    const dayLimits = resolveDayLimits(
      officeSettings,
      employee,
      date
    );

    let attendance = await Attendance.findOne({
      mobileNumber,
      date,
    });

    const halfDayTime =
      attendance?.limits?.halfDayTime ||
      dayLimits.halfDayTime;

    if (halfDayTime <= lateComingTime) {
      return res.status(400).json({
        success: false,
        message:
          "Late time limit must be earlier than the half day time.",
      });
    }

    const limits = {
      lateComingTime,
      halfDayTime,
    };

    const flags = computeAttendanceFlags({
      punchInTimestamp: punchInTime,
      punchOutTimestamp: punchOutTime,
      lateComingTime,
      halfDayTime,
    });

    const status = punchOutTime
      ? "Punched Out"
      : "Punched In";

    if (!attendance) {
      attendance = new Attendance({
        mobileNumber,
        date,
        punchIn: keepPunchDetails(
          null,
          punchInTime
        ),
        punchOut: keepPunchDetails(
          null,
          punchOutTime
        ),
        limits,
        flags,
        status,
      });
    } else {
      attendance.punchIn = keepPunchDetails(
        attendance.punchIn,
        punchInTime
      );
      attendance.punchOut = keepPunchDetails(
        attendance.punchOut,
        punchOutTime
      );
      attendance.limits = limits;
      attendance.flags = flags;
      attendance.status = status;
    }

    const savedAttendance = await attendance.save();

    return res.status(200).json({
      success: true,
      message: "Punch data updated.",
      data: savedAttendance,
    });
  } catch (error) {
    console.error(
      "Attendance correction error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update punch data.",
      error: error.message,
    });
  }
});

// DELETE /api/attendance
router.delete("/", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids
      : [];

    const validIds = ids
      .map((id) => String(id || "").trim())
      .filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attendance ids are required.",
      });
    }

    const result = await Attendance.deleteMany({
      _id: {
        $in: validIds,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Attendance records deleted.",
      deleted: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete attendance.",
      error: error.message,
    });
  }
});

module.exports = router;
