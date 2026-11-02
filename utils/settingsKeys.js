const SHOP_SETTINGS_KEY = "attendanceLimits";
const COMPANY_SETTINGS_KEY = "attendanceLimits_company";

const normalizeWorkspace = (value) => {
  return String(value || "").trim() === "company"
    ? "company"
    : "shop";
};

const getSettingsKeyForWorkspace = (workspace) => {
  return normalizeWorkspace(workspace) === "company"
    ? COMPANY_SETTINGS_KEY
    : SHOP_SETTINGS_KEY;
};

module.exports = {
  SHOP_SETTINGS_KEY,
  COMPANY_SETTINGS_KEY,
  normalizeWorkspace,
  getSettingsKeyForWorkspace,
};
