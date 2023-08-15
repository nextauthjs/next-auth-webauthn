import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextApiRequest, NextApiResponse } from "next";

const rpName = "Example";
const rpID = "localhost";
const origin = `http://${rpID}`;

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const session = await getServerSession(request, response, authOptions);

  if (!session) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = session.id;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (request.method === "GET") {
    const userAuthenticators = await prisma.authenticator.findMany({
      where: {
        userId,
      },
    });

    const options = generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.name ?? "",
      // Don't prompt users for additional information about the authenticator
      // (Recommended for smoother UX)
      attestationType: "none",
      // Prevent users from re-registering existing authenticators
      excludeCredentials: userAuthenticators.map((authenticator) => ({
        id: authenticator.credentialID,
        type: "public-key",
      })),
      authenticatorSelection: {
        // "Discoverable credentials" used to be called "resident keys". The
        // old name persists in the options passed to `navigator.credentials.create()`.
        residentKey: "required",
        userVerification: "preferred",
      },
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

    response.status(200).json(options);
  } else if (request.method === "POST") {
    const { body } = request;
    const expectedChallenge = user.currentChallenge;

    let verification;
    try {
      if (expectedChallenge)
        verification = await verifyRegistrationResponse({
          response: body,
          expectedChallenge,
          expectedOrigin: `${origin}:3000`,
          expectedRPID: rpID,
          requireUserVerification: true,
        });
    } catch (error) {
      console.error(error);
      response.status(400).json({ error: (error as any).message });
      return;
    }

    if (!verification) {
      response.status(400).json({ error: "Invalid response" });
      return;
    }
    const { verified } = verification;
    const { registrationInfo } = verification;
    const {
      credentialPublicKey,
      credentialID,
      counter,
      credentialBackedUp,
      credentialDeviceType,
    } = registrationInfo || {};

    // Save the authenticator info so that we can
    // get it by user ID later
    if (!credentialID || !credentialPublicKey) {
      response.status(400).json({ error: "Invalid response" });
      return;
    }
    const authenticator = await prisma.authenticator.create({
      data: {
        // base64 encode
        credentialID: Buffer.from(credentialID),
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter: counter ?? 0,
        credentialBackedUp: credentialBackedUp ?? false,
        credentialDeviceType: credentialDeviceType ?? "singleDevice",
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    // set 2FA enabled
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        is2FAEnabled: true,
      },
    });

    response.status(200).json({ verified, authenticator });
  }
}
