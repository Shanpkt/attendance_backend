const DEFAULT_LIMITS = {
  lateComingTime: "10:00",
  halfDayTime: "13:30",
  sundayLateComingTime: "10:00",
  sundayHalfDayTime: "13:30",
};

const parseAttendanceDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw
      .slice(0, 10)
      .split("-")
      .map(Number);

    return new Date(year, month - 1, day);
  }

  const parts = raw.split("/");

  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);

    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
};

const isSundayDate = (value) => {
  const date = parseAttendanceDate(value);

  return Boolean(
    date && date.getDay() === 0
  );
};

const timeToMinutes = (time) => {
  if (!time) {
    return 0;
  }

  const [hours, minutes] = String(time)
    .split(":")
    .map(Number);

  return (hours || 0) * 60 + (minutes || 0);
};

const isPunchAfterTime = (timestamp, time) => {
  if (!timestamp || !time) {
    return false;
  }

  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const punchMinutes =
    date.getHours() * 60 + date.getMinutes();

  return punchMinutes > timeToMinutes(time);
};

const isPunchBeforeTime = (timestamp, time) => {
  if (!timestamp || !time) {
    return false;
  }

  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const punchMinutes =
    date.getHours() * 60 + date.getMinutes();

  return punchMinutes < timeToMinutes(time);
};

const getDayLimitsFromSettings = (settings, date) => {
  const weekdayLimits = {
    lateComingTime:
      settings?.lateComingTime ||
      DEFAULT_LIMITS.lateComingTime,
    halfDayTime:
      settings?.halfDayTime ||
      DEFAULT_LIMITS.halfDayTime,
  };

  if (!isSundayDate(date)) {
    return weekdayLimits;
  }

  return {
    lateComingTime:
      settings?.sundayLateComingTime ||
      weekdayLimits.lateComingTime,
    halfDayTime:
      settings?.sundayHalfDayTime ||
      weekdayLimits.halfDayTime,
  };
};

const resolveDayLimits = (settings, employee, date) => {
  const companyLimits = getDayLimitsFromSettings(
    settings,
    date
  );

  return {
    lateComingTime:
      employee?.lateComingTime ||
      companyLimits.lateComingTime,
    halfDayTime:
      employee?.halfDayTime ||
      companyLimits.halfDayTime,
  };
};

const computeAttendanceFlags = ({
  punchInTimestamp,
  punchOutTimestamp,
  lateComingTime,
  halfDayTime,
}) => {
  const isHalfDay =
    isPunchAfterTime(punchInTimestamp, halfDayTime) ||
    isPunchBeforeTime(punchOutTimestamp, halfDayTime);

  const isLate =
    isPunchAfterTime(
      punchInTimestamp,
      lateComingTime
    ) && !isHalfDay;

  return {
    isLate,
    isHalfDay,
  };
};

module.exports = {
  DEFAULT_LIMITS,
  isSundayDate,
  getDayLimitsFromSettings,
  resolveDayLimits,
  computeAttendanceFlags,
};
