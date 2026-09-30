const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const attendanceRoutes = require("./routes/attendance");
const employeesRoutes = require("./routes/employees");
const leavesRoutes = require("./routes/leaves");
const settingsRoutes = require("./routes/settings");
const holidaysRoutes = require("./routes/holidays");
const {
  router: adminAuthRoutes,
  ensureDefaultAdmin,
} = require("./routes/adminAuth");

const app = express();
const PORT = process.env.PORT || 5000;

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://wings:wings@cluster0.epqncfr.mongodb.net/attendance";

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ==================================================
// MONGODB CONNECTION
// ==================================================

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("================================");
    console.log("MongoDB connected successfully");
    console.log("================================");

    try {
      await ensureDefaultAdmin();
    } catch (error) {
      console.error(
        "Default admin seed error:",
        error.message
      );
    }
  })
  .catch((error) => {
    console.error(
      "MongoDB connection error:",
      error.message
    );
  });

// ==================================================
// ROUTES
// ==================================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Attendance Backend is working!",
  });
});

app.use("/api/attendance", attendanceRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/leaves", leavesRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/holidays", holidaysRoutes);
app.use("/api/admin", adminAuthRoutes);

// ==================================================
// 404
// ==================================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, () => {
  console.log("================================");
  console.log(`Server running on port ${PORT}`);
  console.log("================================");
});
