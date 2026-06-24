import crypto from "crypto";
import { logger } from "./logger.js";

export const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4-flash";

const ENCRYPTED_PREFIX = "v1";
const PLAIN_PREFIX = "plain:";

function getEncryptionKey(): Buffer | null {
  const dedicatedKey = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  const secret = dedicatedKey || process.env.JWT_SECRET;
  if (!secret) return null;

  if (!dedicatedKey && process.env.JWT_SECRET) {
    logger.warn(
      "AI_SETTINGS",
      "AI_SETTINGS_ENCRYPTION_KEY is not set — falling back to JWT_SECRET for encryption. " +
      "Set a dedicated AI_SETTINGS_ENCRYPTION_KEY to decouple encryption from JWT signing."
    );
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function getDefaultOpenRouterApiKey(): string | null {
  return (
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.OPENROUTER_DEFAULT_API_KEY?.trim() ||
    null
  );
}

export function getEffectiveOpenRouterModel(customModel?: string | null): string {
  return customModel?.trim() || DEFAULT_OPENROUTER_MODEL;
}

export function encryptAISecret(secret: string): string {
  const trimmed = secret.trim();
  const key = getEncryptionKey();

  if (!key) {
    logger.warn(
      "AI_SETTINGS",
      "AI_SETTINGS_ENCRYPTION_KEY or JWT_SECRET is missing; storing user AI keys with reversible encoding only"
    );
    return `${PLAIN_PREFIX}${Buffer.from(trimmed, "utf8").toString("base64")}`;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptAISecret(storedSecret?: string | null): string | null {
  if (!storedSecret) return null;

  if (storedSecret.startsWith(PLAIN_PREFIX)) {
    return Buffer.from(storedSecret.slice(PLAIN_PREFIX.length), "base64").toString("utf8");
  }

  if (!storedSecret.startsWith(`${ENCRYPTED_PREFIX}:`)) {
    return storedSecret;
  }

  const key = getEncryptionKey();
  if (!key) {
    throw new Error("Cannot decrypt AI API key because no encryption secret is configured");
  }

  const [, ivBase64, tagBase64, encryptedBase64] = storedSecret.split(":");
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Stored AI API key is malformed");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
