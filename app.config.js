module.exports = {
  expo: {
    name: 'Bozzy',
    slug: 'bozzy',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'bozzy',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.bozzy.app',
      buildNumber: '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.bozzy.app',
      versionCode: 1,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: ['expo-secure-store'],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      siteUrl: process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost:8090',
      googleOAuthEnabled: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED !== 'false',
      stripeMonthlyPriceId: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD || process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
      stripeYearlyPriceId: process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD || process.env.EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID,
      eas: {
        projectId: 'f58c6a8c-e8e1-4034-9093-697148d6f016'
      }
    },
  },
};
