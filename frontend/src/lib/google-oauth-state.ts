import crypto from "crypto";

const rawSecret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

if (!rawSecret) {
  throw new Error("Missing GMAIL_TOKEN_ENCRYPTION_KEY");
}

const secret = rawSecret;

type OAuthStatePayload = {
  userId: string;
  iat: number;
};

const STATE_TTL_SECONDS = 15 * 60;

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createOAuthState(userId: string): string {
  const payload: OAuthStatePayload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) {
    throw new Error("Invalid OAuth state format");
  }

  const expectedSig = sign(payloadB64);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as OAuthStatePayload;
  const now = Math.floor(Date.now() / 1000);
  if (now - payload.iat > STATE_TTL_SECONDS) {
    throw new Error("OAuth state expired");
  }

  return payload;
}
