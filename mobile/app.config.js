const fs = require('fs');
const path = require('path');

// google-services.json (from Firebase console > Android app) enables FCM push.
// Only reference it when present so the app still builds before it's added.
module.exports = ({ config }) => {
  const hasGoogleServices = fs.existsSync(path.join(__dirname, 'google-services.json'));
  const android = { ...config.android };
  if (!hasGoogleServices) delete android.googleServicesFile;

  return {
    ...config,
    android,
    extra: {
      ...config.extra,
      ...(process.env.EAS_PROJECT_ID ? { eas: { projectId: process.env.EAS_PROJECT_ID } } : {}),
    },
  };
};
