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
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Location is required.",
      });
    }

    if (accuracy === undefined) {
      return res.status(400).json({
        success: false,
        message: "Location accuracy is required.",
      });
    }

    // ==========================================
    // GET LOCATION NAME
    // ==========================================

    const locationName =
      await getLocationName(
        latitude,
        longitude
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
      const attendance =
        new Attendance({
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

      return res.status(201).json({
        success: true,
        punchType: "PUNCH_IN",
        message:
          "Punch In successful.",
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

      return res.status(200).json({
        success: true,
        punchType: "PUNCH_OUT",
        message:
          "Punch Out successful.",
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
      "Attendance save error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save attendance.",
      error: error.message,
    });
  }
});