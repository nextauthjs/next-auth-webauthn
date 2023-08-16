import NextAuth, { AuthOptions, User, getServerSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { kv } from "@vercel/kv";

export const rpName = "NextAuth.js + Upstash + SimpleWebAuthn Example";
export const rpID =
  process.env.NODE_ENV === "production"
    ? "next-auth-webauthn.vercel.app"
    : "localhost";
export const origin =
  process.env.NODE_ENV === "production" ? `https://${rpID}` : `http://${rpID}`;
export const expectedOrigin =
  process.env.NODE_ENV === "production" ? origin : `${origin}:3000`;

export type RedisBuffer = {
  type: "Buffer";
  data: number[];
};
export type Authenticator = {
  id: number;
  credentialID: RedisBuffer;
  credentialPublicKey: RedisBuffer;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports: string | null;
  userId: string;
};

export const authOptions: AuthOptions = {
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    }),
    Credentials({
      id: "webauthn",
      name: "WebAuthn",
      credentials: {},
      async authorize(_, request) {
        const session = await getServerSession(authOptions);

        if (!session) {
          return null;
        }

        const userId = session.id;
        if (!userId) return null;
        const user = await kv.get<User>(`user:${userId}`);

        if (!user) {
          return null;
        }

        const expectedChallenge = user.currentChallenge;

        const authenticationResponse = JSON.parse(request.body?.verification);
        const authenticator = await kv.get<Authenticator>(
          `user:authenticator:${authenticationResponse.id}`
        );

        if (!authenticator || !expectedChallenge) {
          throw new Error(
            `Could not find authenticator ${authenticationResponse.id} for user ${user.id}`
          );
        }

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response: authenticationResponse,
            expectedChallenge,
            expectedOrigin,
            expectedRPID: rpID,
            authenticator: {
              credentialID: new Uint8Array(authenticator.credentialID.data),
              credentialPublicKey: new Uint8Array(
                authenticator.credentialPublicKey.data
              ),
              counter: authenticator.counter,
            },
          });
        } catch (error) {
          console.error(error);
          return null;
        }

        const { verified } = verification || {};

        if (verified) {
          const updatedUser = {
            ...user,
            currentChallenge: "",
          };
          const updatedUserResult = await kv.set<User>(`user:${userId}`, {
            ...user,
            currentChallenge: "",
          });

          if (updatedUserResult instanceof Object || updatedUserResult === "OK")
            return updatedUser;
          return null;
        }
        return null;
      },
    }),
  ],
  adapter: UpstashRedisAdapter(kv) as AuthOptions["adapter"],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.is2FAEnabled = user.is2FAEnabled;
        token.is2FAVerified = user.is2FAEnabled && !user.currentChallenge;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.id = token?.sub;
      session.is2FAVerified = token.is2FAVerified as boolean;
      session.user.is2FAEnabled = token.is2FAEnabled;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
