import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    id?: string;
    is2FAVerified?: boolean;
    user: {
      /** The user's DB ID. */
      id: string;
    } & DefaultSession["user"];
  }
  interface User {
    is2FAEnabled?: boolean;
    currentChallenge: string | null;
  }
}
