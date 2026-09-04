const express = require("express");

const Setting = require("../models/Setting");

const router = express.Router();

const DEFAULT_SETTINGS = {
  lateComingTime: "10:00",
  halfDayTime: "13:30",
  latitude: null,
  longitude: null,
  accuracy: null,
};

const isValidTime = (value) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(
    String(value || "").trim()
  );
};

const parseOptionalNumber = (
  body,
  key,
  min,
  max
) => {
  if (
    !Object.prototype.hasOwnProperty.call(
      body,
      key
    )
  ) {
    return {
      provided: false,
      value: null,
    };
  }

  const value = body[key];

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return {
      provided: true,
      value: null,
    };
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max
  ) {
    return {
      provided: true,
      value: undefined,
    };
  }

  return {
    provided: true,
    value: number,
  };
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
      latitude: DEFAULT_SETTINGS.latitude,
      longitude: DEFAULT_SETTINGS.longitude,
      accuracy: DEFAULT_SETTINGS.accuracy,
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

    const latitude = parseOptionalNumber(
      req.body,
      "latitude",
      -90,
      90
    );

    const longitude = parseOptionalNumber(
      req.body,
      "longitude",
      -180,
      180
    );

    const accuracy = parseOptionalNumber(
      req.body,
      "accuracy",
      0,
      100000
    );

    if (
      latitude.value === undefined ||
      longitude.value === undefined ||
      accuracy.value === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude must be -90 to 90, longitude -180 to 180, and accuracy 0 or more meters.",
      });
    }

    const existing =
      await getOrCreateSettings();

    const nextLatitude = latitude.provided
      ? latitude.value
      : existing.latitude;

    const nextLongitude = longitude.provided
      ? longitude.value
      : existing.longitude;

    const nextAccuracy = accuracy.provided
      ? accuracy.value
      : existing.accuracy;

    const settings =
      await Setting.findOneAndUpdate(
        {
          key: "attendanceLimits",
        },
        {
          $set: {
            lateComingTime,
            halfDayTime,
            latitude: nextLatitude,
            longitude: nextLongitude,
            accuracy: nextAccuracy,
          },
          $setOnInsert: {
            key: "attendanceLimits",
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
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
