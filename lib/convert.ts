export const toBase64 = (input: Uint8Array) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\//g, "_")
    .replace(/\+/g, "-")
    .replace(/=+$/, "");

export const fromBase64 = (input: string) =>
  new Uint8Array(
    Buffer.from(input.replace(/_/g, "/").replace(/-/g, "+"), "base64")
  );
