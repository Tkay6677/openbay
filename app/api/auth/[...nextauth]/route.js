import NextAuthImport from "next-auth/next";
import CredentialsProviderImport from "next-auth/providers/credentials";
import GoogleProviderImport from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import {
  createEmailPasswordUser,
  getUserById,
  getUserByEmail,
  markWelcomeSentByUserId,
  upsertFirebaseUser,
} from "../../../../lib/db";

const NextAuth = NextAuthImport?.default || NextAuthImport;
const CredentialsProvider = CredentialsProviderImport?.default || CredentialsProviderImport;
const GoogleProvider = GoogleProviderImport?.default || GoogleProviderImport;

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendWelcomeEmail({ to, name }) {
  const transporter = getSmtpTransporter();
  if (!transporter) return false;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) return false;

  const safeName = name || to;
  await transporter.sendMail({
    from,
    to,
    subject: "Welcome to Cosmos",
    text: `Welcome to Cosmos, ${safeName}.\n\nYou are now signed in and can start exploring.`,
    html: `<p>Welcome to Cosmos, <strong>${safeName}</strong>.</p><p>You are now signed in and can start exploring.</p>`,
  });
  return true;
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase?.().trim?.();
        const password = credentials?.password;
        const name = credentials?.name?.trim?.() || null;

        if (!email || !password) return null;

        const existing = await getUserByEmail(email);
        if (!existing) {
          const passwordHash = await bcrypt.hash(password, 12);
          const created = await createEmailPasswordUser({ email, passwordHash, name });
          return {
            id: String(created._id),
            email: created.email,
            name: created.name || created.email,
          };
        }

        if (!existing.passwordHash) {
          throw new Error("This email is linked to a non-password login. Use Google to sign in.");
        }
        const ok = await bcrypt.compare(password, existing.passwordHash);
        if (!ok) return null;

        return {
          id: String(existing._id),
          email: existing.email,
          name: existing.name || existing.email,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = (profile?.email || user?.email || "").toLowerCase().trim();
        const providerAccountId = account?.providerAccountId || profile?.sub || null;
        if (!email || !providerAccountId) return false;

        const dbUser = await upsertFirebaseUser({
          firebaseUid: `google:${providerAccountId}`,
          email,
          name: profile?.name || user?.name || null,
        });

        user.id = String(dbUser._id);
        user.email = dbUser.email;
        user.name = dbUser.name || dbUser.email;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      if (user?.walletAddress) token.walletAddress = user.walletAddress;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.walletAddress = token.walletAddress;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const userId = user?.id ? String(user.id) : null;
      if (!userId) return;

      const email = user?.email?.toLowerCase?.().trim?.();
      if (!email) return;

      const existingById = await getUserById(userId);
      const existing = existingById || (await getUserByEmail(email));
      if (!existing || existing.welcomeSent) return;

      let sent = false;
      try {
        sent = await sendWelcomeEmail({ to: email, name: user?.name || email });
      } catch {
        sent = false;
      }
      if (sent) {
        await markWelcomeSentByUserId(String(existing._id));
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
