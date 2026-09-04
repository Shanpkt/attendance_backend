const express = require("express");

const Setting = require("../models/Setting");

const router = express.Router();

const DEFAULT_SETTINGS = {
  lateComingTime: "10:00",
  halfDayTime: "13:30",
};

const isValidTime = (value) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    String(value || "").trim()
  );
};

const getOrCreateSettings = async () => {
  let settings = await Setting.findOne({
    key: "attendanceLimits",
  });

  if (!settings) {
    settings = await Setting.create({
      key: "attendanceLimits",
      lateComingTime:
        DEFAULT_SETTINGS.lateComingTime,
      halfDayTime:
        DEFAULT_SETTINGS.halfDayTime,
    });
  }

  return settings;
};

// ==================================================
// GET ATTENDANCE LIMITS
// GET /api/settings
// ==================================================

router.get("/", async (req, res) => {
  try {
    const settings =
      await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error(
      "Fetch settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch settings.",
      error: error.message,
    });
  }
});

// ==================================================
// UPDATE ATTENDANCE LIMITS
// PUT /api/settings
// ==================================================

router.put("/", async (req, res) => {
  try {
    const lateComingTime = String(
      req.body.lateComingTime || ""
    ).trim();

    const halfDayTime = String(
      req.body.halfDayTime || ""
    ).trim();

    if (
      !isValidTime(lateComingTime) ||
      !isValidTime(halfDayTime)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid late coming time and half day time are required (HH:MM).",
      });
    }

    const settings =
      await Setting.findOneAndUpdate(
        {
          key: "attendanceLimits",
        },
        {
          key: "attendanceLimits",
          lateComingTime,
          halfDayTime,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Settings updated successfully.",
      data: settings,
    });
  } catch (error) {
    console.error(
      "Update settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update settings.",
      error: error.message,
    });
  }
});

module.exports = router;
