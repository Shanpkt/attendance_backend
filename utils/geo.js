const DEFAULT_GEOFENCE_METERS = 600;

const getDistanceInMeters = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const toRad = (value) =>
    (Number(value) * Math.PI) / 180;

  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return (
    2 *
    earthRadius *
    Math.asin(Math.sqrt(a))
  );
};

const getGeofenceRadius = () => {
  return DEFAULT_GEOFENCE_METERS;
};

const isWithinOffice = (
  settings,
  latitude,
  longitude
) => {
  const officeLat = Number(settings?.latitude);
  const officeLng = Number(settings?.longitude);

  if (
    !Number.isFinite(officeLat) ||
    !Number.isFinite(officeLng)
  ) {
    return {
      ok: false,
      code: "OFFICE_NOT_SET",
      message:
        "Office location is not set. Please contact admin.",
    };
  }

  const radius = getGeofenceRadius();
  const distance = getDistanceInMeters(
    officeLat,
    officeLng,
    latitude,
    longitude
  );

  if (distance > radius) {
    return {
      ok: false,
      code: "OUTSIDE_OFFICE",
      radius,
      distance,
      message:
        `You are ${Math.round(distance)} meters away from the office. Punch is allowed only within ${Math.round(radius)} meters.`,
    };
  }

  return {
    ok: true,
    radius,
    distance,
  };
};

module.exports = {
  DEFAULT_GEOFENCE_METERS,
  getDistanceInMeters,
  getGeofenceRadius,
  isWithinOffice,
};
