import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { OAuth2Client } from "google-auth-library";
import { supabaseAdmin } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
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
    CredentialsProvider({
      id: "mobile-google",
      name: "Mobile Google",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
        serverAuthCode: { label: "Server Auth Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken || !credentials?.serverAuthCode) return null;
        
        try {
          const client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );

          // 1. Verify ID Token to get user details
          const ticket = await client.verifyIdToken({
            idToken: credentials.idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (!payload || !payload.email) return null;

          // 2. Exchange Server Auth Code for tokens
          const { tokens } = await client.getToken({
            code: credentials.serverAuthCode,
          });

          const email = payload.email;
          const name = payload.name || "User";
          const image = payload.picture || "";

          // 3. Upsert User in Supabase next_auth schema
          let userId: string;
          const { data: existingUser } = await supabaseAdmin
            .schema("next_auth")
            .from("users")
            .select("id")
            .eq("email", email)
            .single();

          if (existingUser) {
            userId = existingUser.id;
          } else {
            const { data: newUser, error: userError } = await supabaseAdmin
              .schema("next_auth")
              .from("users")
              .insert({ email, name, image })
              .select("id")
              .single();
            if (userError || !newUser) throw new Error("Failed to create user: " + userError?.message);
            userId = newUser.id;
          }

          // 4. Upsert Account (tokens)
          const accountData: any = {
            userId: userId,
            type: "oauth",
            provider: "google",
            providerAccountId: payload.sub,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
            id_token: tokens.id_token || credentials.idToken,
            scope: tokens.scope,
            token_type: tokens.token_type,
          };
          
          Object.keys(accountData).forEach(key => accountData[key] === undefined && delete accountData[key]);

          const { data: existingAccount } = await supabaseAdmin
            .schema("next_auth")
            .from("accounts")
            .select("id")
            .eq("provider", "google")
            .eq("providerAccountId", payload.sub)
            .single();

          if (existingAccount) {
            await supabaseAdmin.schema("next_auth").from("accounts").update(accountData).eq("id", existingAccount.id);
          } else {
            await supabaseAdmin.schema("next_auth").from("accounts").insert(accountData);
          }

          return { id: userId, email, name, image };
        } catch (err) {
          console.error("Mobile auth failed:", err);
          return null;
        }
      }
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL || "",
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  }),
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.callback-url' : 'next-auth.callback-url',
      options: {
        sameSite: 'none',
        path: '/',
        secure: true
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production' ? '__Host-next-auth.csrf-token' : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true
      }
    }
  },
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
