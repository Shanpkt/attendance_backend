const DEFAULT_LIMITS = {
  lateComingTime: "10:00",
  halfDayTime: "13:30",
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

const getDayLimitsFromSettings = (settings) => {
  return {
    lateComingTime:
      settings?.lateComingTime ||
      DEFAULT_LIMITS.lateComingTime,
    halfDayTime:
      settings?.halfDayTime ||
      DEFAULT_LIMITS.halfDayTime,
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
  getDayLimitsFromSettings,
  computeAttendanceFlags,
};
