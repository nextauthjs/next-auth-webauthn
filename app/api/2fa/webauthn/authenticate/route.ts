import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { User, getServerSession } from "next-auth";
import {
  Authenticator,
  authOptions,
  rpID,
} from "@/app/api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";

export const GET = async (_: Request) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.id;
  const user = await kv.get<User>(`user:${userId}`);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userAuthenticator = await kv.get<Authenticator>(
    `user:authenticator:by-user-id:${userId}`
  );

  if (!userAuthenticator) {
    return new Response("Unauthorized", { status: 401 });
  }

  const options = generateAuthenticationOptions({
    // Require users to use a previously-registered authenticator
    allowCredentials: [
      {
        // decode base 64
        id: new Uint8Array(userAuthenticator.credentialID.data),
        type: "public-key",
      },
    ],
    userVerification: "preferred",
    rpID,
  });

  // Remember the challenge for this user
  await kv.set(`user:${userId}`, {
    ...user,
    currentChallenge: options.challenge,
  });

  return new Response(JSON.stringify(options), { status: 200 });
};
