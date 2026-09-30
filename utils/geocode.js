const axios = require("axios");

const getLocationName = async (
  latitude,
  longitude
) => {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: "jsonv2",
          addressdetails: 1,
          zoom: 18,
          "accept-language": "en",
        },
        headers: {
          "User-Agent":
            "AttendanceManagementSystem/1.0",
        },
        timeout: 15000,
      }
    );

    const data = response.data;
    const address = data?.address || {};

    const parts = [
      address.house_number,
      address.building,
      address.road,
      address.residential,
      address.neighbourhood,
      address.quarter,
      address.suburb,
      address.city_district,
      address.village,
      address.town,
      address.city,
      address.municipality,
      address.state,
      address.postcode,
    ];

    const locationName = [
      ...new Set(
        parts
          .filter(
            (item) => item && String(item).trim()
          )
          .map((item) => String(item).trim())
      ),
    ].join(", ");

    return (
      locationName ||
      data?.display_name ||
      "Location unavailable"
    );
  } catch (error) {
    console.error(
      "Reverse geocoding error:",
      error.message
    );

    return "Location unavailable";
  }
};

module.exports = {
  getLocationName,
};
