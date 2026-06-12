import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mieter +',
  slug: 'mieterplus',
  owner: 'callmealbo',
  version: '1.0.1',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'mieterplus',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    // Navy passend zum Logo-Hintergrund — Splash wirkt wie ein nahtloser Screen
    backgroundColor: '#1e3a5f',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'de.adb.mieterplus',
    infoPlist: {
      NSCameraUsageDescription:
        'Mieter + benötigt deine Kamera, um Fotos zu Mängeln aufzunehmen.',
      NSPhotoLibraryUsageDescription:
        'Mieter + benötigt Zugriff auf deine Fotos, um sie an Mängel anzuhängen.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'de.adb.mieterplus',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1e3a5f',
    },
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES', 'NOTIFICATIONS'],
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          // Compose-Compiler 1.5.15 (in expo-modules-core 2.2.x) verlangt Kotlin 1.9.25
          kotlinVersion: '1.9.25',
          // Play Store verlangt seit 08/2025 Mindest-Target API 35 (Android 15)
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: '35.0.0',
        },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Mieter + benötigt deine Kamera, um Fotos zu Mängeln aufzunehmen.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Mieter + benötigt Zugriff auf deine Fotos, um sie an Mängel anzuhängen.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2563a8',
      },
    ],
  ],
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    url: 'https://u.expo.dev/c7374b1a-770e-4e67-b605-ce1546da30db',
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID ?? 'c7374b1a-770e-4e67-b605-ce1546da30db' },
    // Fallback-Werte, falls EXPO_PUBLIC_* nicht gesetzt sind.
    // Anon-Key ist publishable (RLS schützt die Daten) — darf im Build sein.
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://qvqnklvuydludsyewomu.supabase.co',
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      'sb_publishable_iW-qu5-cmgTZ-b7SMJcB0A_PkhEvpU7',
    // Basis-URL der Web-App für API-Routen (Code-Einlösung etc.)
    webApiUrl: process.env.EXPO_PUBLIC_WEB_API_URL ?? 'https://mieterplus.abdullahu.de',
  },
};

export default config;
