import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function runSeed() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  
  let connected = false;
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query('SELECT 1');
      connected = true;
      break;
    } catch (e) {
      console.log("Aguardando banco de dados para o seed...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  if (!connected) {
    process.exit(1);
  }

  const db = drizzle(pool);
  console.log("🌱 Populando banco de dados...");

  try {
    // A senha precisa ser hashada EXATAMENTE como o server/auth.ts espera
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    // CORREÇÃO: No PostgreSQL, colunas CamelCase exigem aspas duplas
    // Garantindo que o admin-user tenha o email correto para a busca
    await db.execute(`
      INSERT INTO users ("openId", name, email, role, "loginMethod", "passwordHash", "updatedAt")
      VALUES ('admin-user', 'Administrador', 'admin@sistema.com', 'admin', 'password', '${hashedPassword}', NOW())
      ON CONFLICT ("openId") DO UPDATE SET 
        "passwordHash" = EXCLUDED."passwordHash",
        "email" = EXCLUDED."email",
        "name" = EXCLUDED."name";
    `);
    
    console.log("✅ Usuário admin garantido (admin@sistema.com / admin123)");

    // Seed de funcionários com ON CONFLICT no email
    await db.execute(`
      INSERT INTO employees (name, email, phone, role, "commissionRate", active, "updatedAt")
      VALUES 
        ('João Silva', 'joao@empresa.com', '(11) 98765-4321', 'Técnico Eletrônico', '10.00', true, NOW()),
        ('Maria Santos', 'maria@empresa.com', '(11) 98765-4322', 'Técnica Industrial', '12.00', true, NOW())
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;
    `);
    
    console.log("✅ Dados iniciais populados.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro no seed:", error);
    process.exit(1);
  }
}

runSeed();