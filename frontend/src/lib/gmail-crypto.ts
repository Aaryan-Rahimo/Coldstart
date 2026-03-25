import crypto from "crypto";

const rawKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

if (!rawKey) {
  throw new Error("Missing GMAIL_TOKEN_ENCRYPTION_KEY");
}

const KEY = crypto.createHash("sha256").update(rawKey).digest();

export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(cipherText: string): string {
  const [ivHex, authTagHex, payloadHex] = cipherText.split(":");
  if (!ivHex || !authTagHex || !payloadHex) {
    throw new Error("Invalid encrypted token format");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
