import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.soil',
  appName: 'SOIL',
  webDir: 'dist/soil/browser',
  backgroundColor: '#111827',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#111827',
    preferredContentMode: 'recommended',
  },
  android: {
    backgroundColor: '#111827',
    allowMixedContent: false,
  },
};

export default config;
