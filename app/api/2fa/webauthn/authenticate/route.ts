import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { User, getServerSession } from "next-auth";
import { authOptions, rpID } from "@/app/api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";
import { fromBase64 } from "@/lib/convert";

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

  const existingAuthenticators = await kv.get<string[]>(
    `user:authenticator:by-user-id:${userId}`
  );

  if (!existingAuthenticators?.length) {
    return new Response("Unauthorized", { status: 401 });
  }

  const options = generateAuthenticationOptions({
    allowCredentials: existingAuthenticators.map((existingAuthenticator) => ({
      id: fromBase64(existingAuthenticator),
      type: "public-key",
    })),
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
