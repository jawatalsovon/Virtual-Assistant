import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nova.assistant',
  appName: 'Nova',
  webDir: 'public',
  bundledWebRuntime: false,
  overrideUserAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  server: {
    url: 'https://virtual-assistant-hazel-phi.vercel.app/',
    cleartext: true,
    allowNavigation: [
      "virtual-assistant-hazel-phi.vercel.app",
      "*.vercel.app",
      "accounts.google.com"
    ]
  }
};

export default config;
