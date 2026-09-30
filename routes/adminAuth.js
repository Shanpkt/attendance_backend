const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "shop-attendance-admin-secret-key";

const JWT_EXPIRES_IN = "7d";

const DEFAULT_ADMIN = {
  username: "capetown",
  password: "daimond",
};

const createToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      username: admin.username,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

// Seed default admin if none exists
const ensureDefaultAdmin = async () => {
  const count = await Admin.countDocuments();

  if (count > 0) {
    return;
  }

  const hashedPassword = await bcrypt.hash(
    DEFAULT_ADMIN.password,
    10
  );

  await Admin.create({
    username: DEFAULT_ADMIN.username,
    password: hashedPassword,
  });

  console.log(
    "Default admin created (password stored encrypted)."
  );
};

// ==================================================
// POST /api/admin/login
// ==================================================

router.post("/login", async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const username = String(
      req.body.username || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ""
    );

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Username and password are required.",
      });
    }

    const admin = await Admin.findOne({
      username,
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    // Compare plain password with encrypted hash
    const isMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });
    }

    const token = createToken(admin);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        username: admin.username,
      },
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to login.",
    });
  }
});

// ==================================================
// GET /api/admin/verify
// ==================================================

router.get("/verify", async (req, res) => {
  try {
    const authHeader =
      req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided.",
      });
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    const admin = await Admin.findById(
      decoded.id
    ).select("username");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        username: admin.username,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
});

module.exports = {
  router,
  ensureDefaultAdmin,
};
