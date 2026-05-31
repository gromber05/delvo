const fs = require("fs");
const path = require("path");

const localGoogleServicesFile = "./google-services.json";
const hasLocalGoogleServicesFile = fs.existsSync(
  path.join(__dirname, localGoogleServicesFile),
);

module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (!process.env.EAS_BUILD && hasLocalGoogleServicesFile
      ? localGoogleServicesFile
      : undefined);

  return {
    ...config,
    android: {
      ...config.android,
      googleServicesFile,
    },
  };
};
