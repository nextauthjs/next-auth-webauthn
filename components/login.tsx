"use client";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { Session } from "next-auth";
import { signIn, signOut } from "next-auth/react";
import { useEffect } from "react";

export const Login = ({ session }: { session: Session | null }) => {
  console.log({ session });

  const verifying = session?.user.is2FAEnabled && !session?.is2FAVerified;

  useEffect(() => {
    (async () => {
      if (!session?.user.is2FAEnabled) return;
      const resp = await fetch("/api/2fa/webauthn/authenticate");
      const data = await resp.json();
      if (verifying) {
        try {
          // Pass the options to the authenticator and wait for a response
          const asseResp = await startAuthentication(data);
          console.log({ asseResp });
          await signIn("webauthn", {
            verification: JSON.stringify(asseResp),
          });
        } catch (error) {
          console.error(error);
          await signOut();
        }
      }
    })();
  }, [session, verifying]);

  return (
    <>
      {session ? (
        <>
          <button
            onClick={async () => {
              await signOut();
            }}
            className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30"
          >
            {verifying
              ? "Verifying 2FA..."
              : `Signed in as ${session.user.email}. Sign out`}
          </button>

          <button
            onClick={async () => {
              if (!session) return;
              const resp = await fetch("/api/2fa/webauthn/register");
              try {
                const data = await resp.json();
                // Pass the options to the authenticator and wait for a response
                const attResp = await startRegistration({ ...data });
                // POST the response to the endpoint that calls
                // @simplewebauthn/server -> verifyRegistrationResponse()
                await fetch("/api/2fa/webauthn/register", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(attResp),
                });

                // We sign out the user to force a new login with 2FA
                window.alert("Successfully registered! Please login again.");
                await signOut();
              } catch (error) {
                console.error(error);
              }
            }}
            className="fixed bottom-0 left-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30"
          >
            Register a 2FA Device.
          </button>
        </>
      ) : (
        <button
          onClick={() => signIn("github")}
          className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30"
        >
          Sign in with GitHub.
        </button>
      )}
    </>
  );
};
