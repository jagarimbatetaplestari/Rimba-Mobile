import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rimba.focus',
  appName: 'Rimba',
  webDir: 'out',
  backgroundColor: '#165643',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  ios: {
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Rimba',
    backgroundColor: '#165643'
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#00000000'
    }
  }
};

export default config;
