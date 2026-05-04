import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { queries, type User } from "./db";

const COOKIE_NAME = "wg_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const AUTH_SECRET =
  process.env.AUTH_SECRET ??
  (() => {
    const generated = randomBytes(32).toString("hex");
    console.warn(
      "AUTH_SECRET not set — generated an ephemeral one. Set AUTH_SECRET in .env to keep sessions across restarts.",
    );
    return generated;
  })();

function sign(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("hex");
}

function makeToken(userId: string): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${userId}.${expires}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresStr, sig] = parts;
  const expected = sign(`${userId}.${expiresStr}`);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expiresStr) < Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export function parseCookie(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

export function getUserFromRequest(req: Request): User | null {
  const cookies = parseCookie(req.headers.get("cookie"));
  const userId = verifyToken(cookies[COOKIE_NAME]);
  if (!userId) return null;
  return queries.getUserById.get(userId) ?? null;
}

export function sessionCookie(userId: string): string {
  const token = makeToken(userId);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;

export async function signup(username: string, password: string): Promise<User> {
  if (!USERNAME_RE.test(username)) {
    throw new Error("Username must be 3-32 chars (letters, numbers, _ or -).");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  if (queries.getUserByUsername.get(username)) {
    throw new Error("Username already taken.");
  }
  const id = crypto.randomUUID();
  const hash = await Bun.password.hash(password);
  queries.createUser.run(id, username, hash, Date.now());
  const user = queries.getUserById.get(id);
  if (!user) throw new Error("Failed to create user");
  return user;
}

export async function login(username: string, password: string): Promise<User> {
  const user = queries.getUserByUsername.get(username);
  if (!user) throw new Error("Invalid credentials.");
  const ok = await Bun.password.verify(password, user.password_hash);
  if (!ok) throw new Error("Invalid credentials.");
  return user;
}
