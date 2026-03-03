import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'nl.volleywarrior.app',
  appName: 'VolleyWarrior',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0f172a',
    allowMixedContent: true
  }
};

export default config;
