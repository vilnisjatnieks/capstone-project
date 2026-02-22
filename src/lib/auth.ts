import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import {
  createSession as dalCreateSession,
  deleteSession as dalDeleteSession,
  getSessionWithUser,
} from "@/lib/data/sessions";
import type { SessionUser } from "@/lib/data/sessions";
import { cookies } from "next/headers";

const scryptAsync = promisify(scrypt);

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type User = SessionUser;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  if (derivedKey.length !== keyBuffer.length) return false;
  return timingSafeEqual(derivedKey, keyBuffer);
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  return dalCreateSession(userId, expiresAt);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await dalDeleteSession(sessionId);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  if (!sessionId) return null;

  return getSessionWithUser(sessionId);
}
