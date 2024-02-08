
<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img width="150px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>
   <h3 align="center">NextAuth.js 2FA with Webauthn Example App</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <a href="https://npm.im/next-auth">
        <img alt="npm" src="https://img.shields.io/npm/v/next-auth?color=green&label=next-auth">
      </a>
      <a href="https://bundlephobia.com/result?p=next-auth-example">
        <img src="https://img.shields.io/bundlephobia/minzip/next-auth?label=next-auth" alt="Bundle Size"/>
      </a>
      <a href="https://www.npmtrends.com/next-auth">
        <img src="https://img.shields.io/npm/dm/next-auth?label=next-auth%20downloads" alt="Downloads" />
      </a>
      <a href="https://npm.im/next-auth">
        <img src="https://img.shields.io/badge/npm-TypeScript-blue" alt="TypeScript" />
      </a>
   </p>
</p>

# New built-in Webauthn provider is out now
We introduced the new built-in Webauthn support for Auth.js - head over to https://authjs.dev/reference/core/providers/webauthn to learn more.

## Overview - 2FA with WebAuthn using NextAuth.js.

This example shows how to use NextAuth.js to add 2FA with [WebAuthn](https://webauthn.io/). It uses [SimpleWebAuthn](https://simplewebauthn.dev/), [Vercel KV](https://vercel.com/docs/storage/vercel-kv), and [RedisUpstashAdapter](https://authjs.dev/reference/adapter/upstash-redis). The steps are:

1. Sign in with GitHub
1. Register a WebAuthn credential
1. Sign out & Sign in with GitHub again
1. Verify the WebAuthn credential

## How it works
- We need a DB to store the user's registered webauthn credential.
  - When the user successfully registers a credential, set the flag `is2FAEnabled: true`
  - The next time he/she logs in, check for `is2FAEnabled` - if true, then prompt them with the Webauthn flow.
- Implement 2FA with Webauthn in the [Credential Provider](https://authjs.dev/reference/core/providers_credentials). Note: We need to use the `strategy: 'jwt'` here. You could find more details about the reasoning in the Credential Provider doc.
