import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly",
        },
      },
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL || "",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  }),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }: any) {
      console.log("SignIn Callback Triggered:", { user, account, profile, email });
      return true;
    },
    async jwt({ token, user, account, profile, isNewUser }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user && token?.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  logger: {
    error(code: string, metadata: any) {
      console.error("NEXTAUTH ERROR:", code, metadata);
      if (metadata && metadata.error) {
        console.error("INNER ERROR:", metadata.error.message, metadata.error.stack);
      }
    },
    warn(code: string) {
      console.warn("NEXTAUTH WARN:", code);
    },
    debug(code: string, metadata: any) {
      console.log("NEXTAUTH DEBUG:", code, metadata);
    }
  },
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
