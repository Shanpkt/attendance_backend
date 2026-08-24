const express = require("express");
const cors = require("cors");

const app = express();

const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ===============================
// GET ROUTE
// ===============================

app.get("/", (req, res) => {
  res.send("Backend is working!");
});

// ===============================
// POST ROUTE - ATTENDANCE
// ===============================

app.post("/api/attendance", (req, res) => {
  console.log("Attendance data received:");

  console.log(req.body);

  res.status(200).json({
    success: true,
    message: "Attendance data received successfully",
    data: req.body,
  });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});