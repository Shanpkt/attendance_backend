const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      default: "Holiday",
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

holidaySchema.index({ date: 1 });

module.exports = mongoose.model(
  "Holiday",
  holidaySchema
);
