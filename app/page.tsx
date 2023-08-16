import { Login } from "@/components/login";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center lg:justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <Login session={session} />
      </div>
      <div className="flex-auto w-full max-w-5xl gap-8 mt-8 lg:flex-row">
        <h1 className="text-xl font-semibold">
          2FA with WebAuthn using NextAuth.js.
        </h1>
        <p className="text-lg lg:col-span-1 w-full">
          This example shows how to use{" "}
          <a
            className="
            text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
            transition-colors duration-200
          "
            href="https://authjs.dev/"
            target="_blank"
            rel="noopener noreferrer"
          >
            NextAuth.js
          </a>{" "}
          to add 2FA with WebAuthn. See the{" "}
          <a
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
            transition-colors duration-200"
            href="https://github.com/nextauthjs/next-auth-webauthn"
            target="_blank"
            rel="noopener noreferrer"
          >
            source
          </a>{" "}
          on GitHub. It uses{" "}
          <a
            href="https://simplewebauthn.dev/"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
            transition-colors duration-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            SimpleWebAuthn
          </a>
          ,{" "}
          <a
            href="https://vercel.com/docs/storage/vercel-kv"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
            transition-colors duration-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vercel KV
          </a>
          , and{" "}
          <a
            href="https://authjs.dev/reference/adapter/upstash-redis"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300
            transition-colors duration-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            RedisUpstashAdapter
          </a>
          . The steps are:
        </p>
        <ol className="list-decimal list-inside text-lg lg:col-span-1 w-full">
          <li>Sign in with GitHub</li>
          <li>Register a WebAuthn credential</li>
          <li>Sign out & Sign in with GitHub again</li>
          <li>Verify the WebAuthn credential</li>
        </ol>
        <br />
        {session && (
          <pre>
            Current session object:{" "}
            <code>{JSON.stringify(session, null, 2)}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
