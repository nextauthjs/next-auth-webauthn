import NextAuth, { AuthOptions, getServerSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import Credentials from "next-auth/providers/credentials";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

const rpID = "localhost";
const origin = `http://${rpID}`;

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
        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
        });

        if (!user) {
          return null;
        }

        const expectedChallenge = user.currentChallenge;

        const authenticator = await prisma.authenticator.findFirst({
          where: {
            userId,
          },
        });
        const authenticationResponse = JSON.parse(request.body?.verification);

        if (!authenticator || !expectedChallenge) {
          throw new Error(
            `Could not find authenticator ${request.body?.id} for user ${user.id}`
          );
        }

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response: authenticationResponse,
            expectedChallenge,
            expectedOrigin: `${origin}:3000`,
            expectedRPID: rpID,
            authenticator: {
              credentialID: new Uint8Array(authenticator.credentialID),
              credentialPublicKey: new Uint8Array(
                authenticator.credentialPublicKey
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
          const updatedUser = await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              currentChallenge: "",
            },
          });

          return updatedUser;
        }
        return null;
      },
    }),
  ],
  adapter: PrismaAdapter(prisma) as AuthOptions["adapter"],
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
