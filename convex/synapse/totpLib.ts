"use node";

import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 character in TOTP secret");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

export function generateTotp(
  base32Secret: string,
  periodSeconds = 30,
  digits = 6,
): string {
  const key = decodeBase32(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / periodSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binaryCode =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return (binaryCode % 10 ** digits).toString().padStart(digits, "0");
}

export function getTotpSecret(): string {
  const secret = process.env.SYNAPSE_TOTP_SECRET?.trim();
  if (!secret) {
    throw new Error("SYNAPSE_TOTP_SECRET is not configured");
  }
  return secret;
}
