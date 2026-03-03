module.exports = {
  expo: {
    owner: 'jkburkh23',
    name: 'Bozzy',
    slug: 'gigledger',
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
      bundleIdentifier: 'com.bozzygigs.bozzy',
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
      package: 'com.bozzygigs.bozzy',
      versionCode: 1,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-secure-store',
      'expo-web-browser',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Bozzy to access your photos to set a profile picture.',
          cameraPermission: 'Allow Bozzy to use your camera to take a profile photo.',
        },
      ],
      [
        'expo-calendar',
        {
          calendarPermission: 'Bozzy uses your calendar to add gig reminders.',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          iosClientId: '366405399265-c543egs7vgjpo30kh1ijqaq0j6gdd9s.apps.googleusercontent.com',
          iosUrlScheme: 'com.googleusercontent.apps.366405399265-c543egs7vgjpo30kh1ijqaq0j6gdd9s',
        },
      ],
    ],
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
