import { generateAuthenticationOptions } from "@simplewebauthn/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const rpID = "localhost";

export const GET = async (_: Request) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.id;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userAuthenticators = await prisma.authenticator.findMany({
    where: {
      userId,
    },
  });

  const options = generateAuthenticationOptions({
    // Require users to use a previously-registered authenticator
    allowCredentials: userAuthenticators.map((authenticator) => {
      return {
        // decode base 64
        id: new Uint8Array(authenticator.credentialID),
        type: "public-key",
      };
    }),
    userVerification: "preferred",
    rpID,
  });

  // Remember the challenge for this user
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      currentChallenge: options.challenge,
    },
  });

  return new Response(JSON.stringify(options), { status: 200 });
};
