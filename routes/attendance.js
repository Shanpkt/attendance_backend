const express = require("express");
const mongoose = require("mongoose");

const Attendance = require("../models/Attendance");
const Setting = require("../models/Setting");
const {
  isWithinOffice,
  shouldKeepGpsTolerance,
} = require("../utils/geo");
const { getLocationName } = require("../utils/geocode");
const {
  getDayLimitsFromSettings,
  computeAttendanceFlags,
} = require("../utils/attendanceFlags");

const router = express.Router();

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
        return res.status(200).json({
          success: true,
          exists: true,
          status: attendance.status,
          action: "PUNCH_OUT",
          message: "Ready for Punch Out.",
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

// GET /api/attendance/employee/:mobileNumber
router.get(
  "/employee/:mobileNumber",
  async (req, res) => {
    try {
      const mobileNumber = String(
        req.params.mobileNumber
      ).trim();

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

    const officeSettings = await Setting.findOne({
      key: "attendanceLimits",
    });

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

    const dayLimits = getDayLimitsFromSettings(
      officeSettings
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
