import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nova.assistant',
  appName: 'Nova',
  webDir: 'public',
  server: {
    url: 'https://virtual-assistant-hazel-phi.vercel.app/',
    cleartext: true,
    allowNavigation: [
      "virtual-assistant-hazel-phi.vercel.app",
      "*.vercel.app",
      "accounts.google.com"
    ]
  },
  plugins: {
    GoogleSignIn: {
      scopes: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/contacts.readonly"
      ],
      serverClientId: "280495370233-h941t88cvcdi6neh4onf9qfrd7ikep3p.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
