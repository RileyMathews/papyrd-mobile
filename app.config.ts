import type { ExpoConfig } from "expo/config";

const androidVersionCode = process.env.ANDROID_VERSION_CODE
  ? Number(process.env.ANDROID_VERSION_CODE)
  : undefined;
const iosBuildNumber = process.env.IOS_BUILD_NUMBER;

if (androidVersionCode !== undefined && !Number.isInteger(androidVersionCode)) {
  throw new Error("ANDROID_VERSION_CODE must be an integer");
}

if (iosBuildNumber !== undefined && !/^\d+$/.test(iosBuildNumber)) {
  throw new Error("IOS_BUILD_NUMBER must contain only digits");
}

const config: ExpoConfig = {
  name: "papyrd",
  slug: "papyrd",
  version: "0.0.1",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "papyrd",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.rileymathews.papyrd",
    ...(iosBuildNumber === undefined ? {} : { buildNumber: iosBuildNumber }),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#001020",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.rileymathews.papyrd",
    ...(androidVersionCode === undefined
      ? {}
      : { versionCode: androidVersionCode }),
  },
  web: {
    output: "static",
    favicon: "./assets/favicon.png",
  },
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#001020",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#001020",
        dark: {
          backgroundColor: "#001020",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
  },
};

export default config;
