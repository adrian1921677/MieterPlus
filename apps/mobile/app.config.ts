import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mieter +',
  slug: 'mieterplus',
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
        'MieterPlus benötigt deine Kamera, um Fotos zu Mängeln aufzunehmen.',
      NSPhotoLibraryUsageDescription:
        'MieterPlus benötigt Zugriff auf deine Fotos, um sie an Mängel anzuhängen.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'de.adb.mieterplus',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2563eb',
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
          'MieterPlus benötigt deine Kamera, um Fotos zu Mängeln aufzunehmen.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'MieterPlus benötigt Zugriff auf deine Fotos, um sie an Mängel anzuhängen.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#2563eb',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId: '00000000-0000-0000-0000-000000000000' },
  },
};

export default config;
