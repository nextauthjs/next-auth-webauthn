import { getServerSession } from "next-auth";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import prisma from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

const rpName = "Example";
const rpID = "localhost";
const origin = `http://${rpID}`;

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

  return new Response(JSON.stringify(options), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const POST = async (request: Request) => {
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

  const response = await request.json();
  const expectedChallenge = user.currentChallenge;

  let verification;
  try {
    if (expectedChallenge)
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: `${origin}:3000`,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: (error as any).message }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  if (!verification) {
    return new Response("Unauthorized", { status: 401 });
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
    return new Response("Unauthorized", { status: 401 });
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

  return new Response(JSON.stringify({ verified }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
