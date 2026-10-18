import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.syntheticae.rimba',
  appName: 'Rimba',
  webDir: 'out',
  backgroundColor: '#051F18',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#051F18',
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Rimba',
    backgroundColor: '#051F18'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000'
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      launchFadeOutDuration: 300,
      backgroundColor: '#051F18',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
