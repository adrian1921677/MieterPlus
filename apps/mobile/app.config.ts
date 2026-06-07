import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mieter +',
  slug: 'mieterplus',
  owner: 'callmealbo',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'mieterplus',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#2563a8',
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
      backgroundColor: '#2563a8',
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
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // projectId wird von `eas init` gesetzt (hier per ENV überschreibbar)
    eas: { projectId: process.env.EAS_PROJECT_ID },
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
