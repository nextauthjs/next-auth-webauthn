import { generateAuthenticationOptions } from "@simplewebauthn/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextApiRequest, NextApiResponse } from "next";

const rpID = "localhost";

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const session = await getServerSession(request, response, authOptions);

  if (!session) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.id;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  if (request.method === "GET") {
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

    return response.status(200).json(options);
  }
  response.status(405).json({ error: "Method not allowed" });
}
//
