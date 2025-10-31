module.exports = {
  expo: {
    name: 'GigLedger',
    slug: 'gigledger',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'gigledger',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.gigledger',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.anonymous.gigledger',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: ['expo-secure-store'],
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: 'https://jvostkeswuhfwntbrfzl.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b3N0a2Vzd3VoZndudGJyZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjg4NDksImV4cCI6MjA3NjIwNDg0OX0.tzh6vU2bfxMk-rqUTtX9JaYwzp_DAaVaU_5G-VPEchg',
      EXPO_PUBLIC_DEEP_LINK_SCHEME: 'gigledger',
      EXPO_PUBLIC_DEFAULT_MILEAGE_RATE: '0.67',
    },
  },
};
