import { nanoid } from "nanoid";
import { getUserByOpenId, upsertUser } from "./db";

/**
 * Simple password hashing using Web Crypto API
 * For production, consider using bcrypt or argon2
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Create a new user with password
 */
export async function createUserWithPassword(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; openId?: string }> {
  // Generate unique openId for local users
  const openId = `local_${nanoid(16)}`;
  
  // Check if email already exists
  const existingUsers = await (await import("./db")).getDb();
  if (!existingUsers) {
    return { success: false, error: "Database not available" };
  }
  
  const { users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  const existing = await existingUsers.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { success: false, error: "Email already registered" };
  }
  
  const passwordHash = await hashPassword(password);
  
  await upsertUser({
    openId,
    email,
    name,
    passwordHash,
    loginMethod: "password",
  });
  
  return { success: true, openId };
}

/**
 * Authenticate user with email and password
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: any }> {
  const db = await (await import("./db")).getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }
  
  const { users } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (result.length === 0) {
    return { success: false, error: "Invalid email or password" };
  }
  
  const user = result[0];
  
  if (!user.passwordHash) {
    return { success: false, error: "This account uses a different login method" };
  }
  
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }
  
  // Update last signed in
  await upsertUser({
    openId: user.openId,
    lastSignedIn: new Date(),
  });
  
  return { success: true, user };
}
