import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { users, type User, type InsertUser } from "../drizzle/schema";
import { getDb } from "./db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import crypto from "node:crypto";

/**
 * Helper para assinar tokens JWT nativamente (caso precise de fallback)
 */
function signNativeJwt(payload: object, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${data}`)
    .digest("base64url");
  return `${header}.${data}.${signature}`;
}

/**
 * Função de autenticação ajustada para o seu routers.ts
 * Retorna { success, error, user } para bater com a lógica do seu mutation de login
 */
export async function authenticateUser(email: string, password: string): Promise<{ 
  success: boolean; 
  error?: string; 
  user?: User 
}> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database connection failed" };
  }

  const identifier = email.trim().toLowerCase();
  console.log(`[Auth] Tentativa de login para: ${identifier}`);

  try {
    const result = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, identifier),
          eq(users.openId, email.trim())
        )
      )
      .limit(1);

    const user = result[0];

    if (!user || !user.passwordHash) {
      console.warn(`[Auth] Usuário não encontrado ou sem senha: ${identifier}`);
      return { success: false, error: "Invalid email or password" };
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordMatch) {
      console.warn(`[Auth] Senha incorreta para: ${identifier}`);
      return { success: false, error: "Invalid email or password" };
    }

    // Atualiza o registro de login em background
    db.update(users)
      .set({ lastSignedIn: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .execute()
      .catch(e => console.error("[Auth] Erro ao atualizar timestamp:", e));

    console.log(`[Auth] Login bem-sucedido: ${identifier}`);
    return { success: true, user };
  } catch (err) {
    console.error("[Auth] Erro na query de autenticação:", err);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * Função de criação de usuário ajustada para argumentos posicionais
 * conforme usado no seu register: createUserWithPassword(email, password, name)
 */
export async function createUserWithPassword(email: string, password: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const passwordHash = await bcrypt.hash(password, 10);

  const [newUser] = await db.insert(users).values({
    email: email.toLowerCase(),
    name,
    passwordHash,
    openId: crypto.randomUUID(),
    role: "user",
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as InsertUser).returning();

  return newUser;
}

/**
 * Router interno (opcional, já que você definiu o seu próprio auth no routers.ts)
 */
export const authRouter = router({
  login: publicProcedure
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await authenticateUser(input.email, input.password);
      
      if (!result.success || !result.user) {
        return result;
      }

      const token = signNativeJwt(
        { id: result.user.id, openId: result.user.openId, role: result.user.role, name: result.user.name || "" },
        process.env.JWT_SECRET || "fallback_secret"
      );

      ctx.res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });

      return result;
    }),

  me: publicProcedure.query(({ ctx }) => ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, getSessionCookieOptions(ctx.req));
    return { success: true };
  }),
});