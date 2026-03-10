import { NextAuth } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcrypt';
import { db } from '@invoice/db';
import { users, tenants } from '@invoice/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
          with: { tenant: true },
        });

        if (!user || !user.hashedPassword) return null;

        const isValid = await compare(credentials.password as string, user.hashedPassword);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          name: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
});