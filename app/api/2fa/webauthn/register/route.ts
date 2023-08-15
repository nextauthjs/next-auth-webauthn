import { User, getServerSession } from "next-auth";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { authOptions, rpID, rpName } from "../../../auth/[...nextauth]/route";
import { kv } from "@vercel/kv";

export const GET = async (_: Request) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  const user = await kv.get<User>(`user:${userId}`);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const options = generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.name ?? "",
    // Don't prompt users for additional information about the authenticator
    // (Recommended for smoother UX)
    attestationType: "none",
    // Prevent users from re-registering existing authenticators
    excludeCredentials: [],
    authenticatorSelection: {
      // "Discoverable credentials" used to be called "resident keys". The
      // old name persists in the options passed to `navigator.credentials.create()`.
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  // Remember the challenge for this user
  await kv.set(`user:${userId}`, {
    ...user,
    currentChallenge: options.challenge,
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
  const user = await kv.get<User>(`user:${userId}`);

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
  await kv.set(`user:authenticator:by-user-id:${userId}`, {
    // base64 encode
    credentialID: Buffer.from(credentialID),
    credentialPublicKey: Buffer.from(credentialPublicKey),
    counter: counter ?? 0,
    credentialBackedUp: credentialBackedUp ?? false,
    credentialDeviceType: credentialDeviceType ?? "singleDevice",
  });

  await kv.set(`user:${userId}`, {
    ...user,
    is2FAEnabled: true,
  });

  return new Response(JSON.stringify({ verified }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
