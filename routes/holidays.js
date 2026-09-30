const express = require("express");

const Holiday = require("../models/Holiday");

const router = express.Router();

const isValidDate = (value) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "").trim()
  );
};

const isValidMonth = (value) => {
  return /^\d{4}-\d{2}$/.test(
    String(value || "").trim()
  );
};

const isValidYear = (value) => {
  return /^\d{4}$/.test(
    String(value || "").trim()
  );
};

// ==================================================
// GET /api/holidays
// Optional: ?date=YYYY-MM-DD | ?month=YYYY-MM | ?year=YYYY
// ==================================================

router.get("/", async (req, res) => {
  try {
    const { date, month, year } = req.query;
    const filter = {};

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message:
            "Valid date is required (YYYY-MM-DD).",
        });
      }

      filter.date = String(date).trim();
    } else if (month) {
      if (!isValidMonth(month)) {
        return res.status(400).json({
          success: false,
          message:
            "Valid month is required (YYYY-MM).",
        });
      }

      filter.date = {
        $regex: `^${String(month).trim()}`,
      };
    } else if (year) {
      if (!isValidYear(year)) {
        return res.status(400).json({
          success: false,
          message:
            "Valid year is required (YYYY).",
        });
      }

      filter.date = {
        $regex: `^${String(year).trim()}`,
      };
    }

    const holidays = await Holiday.find(filter)
      .sort({ date: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    console.error(
      "Get holidays error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch holidays.",
    });
  }
});

// ==================================================
// POST /api/holidays
// ==================================================

router.post("/", async (req, res) => {
  try {
    const date = String(
      req.body.date || ""
    ).trim();
    const name = String(
      req.body.name || "Holiday"
    ).trim();
    const note = String(
      req.body.note || ""
    ).trim();

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid date is required (YYYY-MM-DD).",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Holiday name is required.",
      });
    }

    const existing = await Holiday.findOne({
      date,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday is already marked on this date.",
        data: existing,
      });
    }

    const holiday = await Holiday.create({
      date,
      name,
      note,
    });

    return res.status(201).json({
      success: true,
      message: "Holiday marked successfully.",
      data: holiday,
    });
  } catch (error) {
    console.error(
      "Create holiday error:",
      error.message
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday is already marked on this date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to mark holiday.",
    });
  }
});

// ==================================================
// PUT /api/holidays/:id
// ==================================================

router.put("/:id", async (req, res) => {
  try {
    const updates = {};

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "name"
      )
    ) {
      const name = String(
        req.body.name || ""
      ).trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Holiday name is required.",
        });
      }

      updates.name = name;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "note"
      )
    ) {
      updates.note = String(
        req.body.note || ""
      ).trim();
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body,
        "date"
      )
    ) {
      const date = String(
        req.body.date || ""
      ).trim();

      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message:
            "Valid date is required (YYYY-MM-DD).",
        });
      }

      updates.date = date;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No updates provided.",
      });
    }

    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully.",
      data: holiday,
    });
  } catch (error) {
    console.error(
      "Update holiday error:",
      error.message
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A holiday is already marked on this date.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update holiday.",
    });
  }
});

// ==================================================
// DELETE /api/holidays/:id
// ==================================================

router.delete("/:id", async (req, res) => {
  try {
    const holiday =
      await Holiday.findByIdAndDelete(
        req.params.id
      );

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: "Holiday not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Holiday removed successfully.",
      data: holiday,
    });
  } catch (error) {
    console.error(
      "Delete holiday error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to remove holiday.",
    });
  }
});

module.exports = router;
