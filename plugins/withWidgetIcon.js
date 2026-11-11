const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to ensure the Water Bottle Widget displays
 * its dedicated Water Bottle Logo in the Android Widget Selection Grid (Widget Picker).
 */
function withWidgetIcon(config) {
  // 1. Ensure the WaterBottleWidget receiver specifies android:icon
  config = withAndroidManifest(config, (manifestConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifestConfig.modResults);
    if (mainApplication.receiver) {
      mainApplication.receiver.forEach((receiver) => {
        if (receiver.$ && receiver.$['android:name'] && receiver.$['android:name'].includes('WaterBottleWidget')) {
          receiver.$['android:icon'] = '@drawable/water_bottle_icon';
        }
      });
    }
    return manifestConfig;
  });

  // 2. Copy the water_bottle_icon.png into Android res/drawable
  config = withDangerousMod(config, [
    'android',
    (dangerousConfig) => {
      const projectRoot = dangerousConfig.modRequest.projectRoot;
      const platformProjectRoot = dangerousConfig.modRequest.platformProjectRoot;

      const sourceIcon = path.resolve(projectRoot, 'assets/water_bottle_icon.png');
      if (fs.existsSync(sourceIcon)) {
        const drawableDir = path.join(platformProjectRoot, 'android/app/src/main/res/drawable');
        fs.mkdirSync(drawableDir, { recursive: true });
        const targetIcon = path.join(drawableDir, 'water_bottle_icon.png');
        fs.copyFileSync(sourceIcon, targetIcon);
      }
      return dangerousConfig;
    },
  ]);

  return config;
}

module.exports = withWidgetIcon;
