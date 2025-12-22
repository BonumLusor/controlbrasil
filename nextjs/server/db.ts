import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users, type InsertUser } from "../drizzle/schema";
import { ENV } from './_core/env';
import { eq } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // No Postgres, usamos onConflictDoUpdate
    await db.insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.openId,
        set: {
          name: user.name,
          email: user.email,
          loginMethod: user.loginMethod,
          lastSignedIn: user.lastSignedIn ?? new Date(),
          role: user.role,
          updatedAt: new Date(),
        }
      });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}