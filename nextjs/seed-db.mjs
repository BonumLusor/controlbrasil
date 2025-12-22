import { drizzle } from "drizzle-orm/mysql2";
import bcrypt from "bcryptjs";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  try {
    // Criar usuário admin
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    await db.execute(`
      INSERT INTO users (openId, name, email, role, loginMethod, password)
      VALUES ('admin-user', 'Administrador', 'admin@sistema.com', 'admin', 'password', '${hashedPassword}')
      ON DUPLICATE KEY UPDATE name=name;
    `);
    
    console.log("✅ Usuário admin criado (login: admin@sistema.com, senha: admin123)");

    // Criar funcionários
    await db.execute(`
      INSERT INTO employees (name, email, phone, role, commissionRate, active)
      VALUES 
        ('João Silva', 'joao@empresa.com', '(11) 98765-4321', 'Técnico Eletrônico', '10.00', true),
        ('Maria Santos', 'maria@empresa.com', '(11) 98765-4322', 'Técnica Industrial', '12.00', true),
        ('Pedro Costa', 'pedro@empresa.com', '(11) 98765-4323', 'Atendente', '5.00', true)
      ON DUPLICATE KEY UPDATE name=name;
    `);
    
    console.log("✅ Funcionários criados");

    // Criar clientes
    await db.execute(`
      INSERT INTO customers (name, email, phone, cpfCnpj, city, state)
      VALUES 
        ('Indústria ABC Ltda', 'contato@industriaabc.com', '(11) 3456-7890', '12.345.678/0001-90', 'São Paulo', 'SP'),
        ('Fitness Center XYZ', 'contato@fitnessxyz.com', '(11) 3456-7891', '98.765.432/0001-10', 'São Paulo', 'SP'),
        ('Automação Tech', 'contato@autotech.com', '(11) 3456-7892', '11.222.333/0001-44', 'Guarulhos', 'SP')
      ON DUPLICATE KEY UPDATE name=name;
    `);
    
    console.log("✅ Clientes criados");

    // Criar componentes
    await db.execute(`
      INSERT INTO components (name, type, specifications, quantity, minQuantity, unitPrice, manufacturer, partNumber, location)
      VALUES 
        ('Capacitor Eletrolítico', 'capacitor', '1000uF 25V', 50, 10, '2.50', 'Nichicon', 'UVR1E102MHD', 'Prateleira A1'),
        ('Resistor 1k Ohm', 'resistor', '1/4W 5%', 200, 50, '0.10', 'Yageo', 'CFR-25JB-1K0', 'Gaveta B2'),
        ('MOSFET IRF540', 'mosfet', 'N-Channel 100V 33A', 30, 5, '8.90', 'Infineon', 'IRF540NPBF', 'Prateleira C3'),
        ('CI LM358', 'ci', 'Dual Op-Amp', 40, 10, '3.50', 'Texas Instruments', 'LM358P', 'Gaveta D4'),
        ('Indutor 100uH', 'indutor', '1A DCR 0.5Ω', 25, 5, '4.20', 'Bourns', 'SRR1005-101K', 'Prateleira E5')
      ON DUPLICATE KEY UPDATE name=name;
    `);
    
    console.log("✅ Componentes criados");

    console.log("\n🎉 Seed concluído com sucesso!");
    console.log("\n📝 Credenciais de acesso:");
    console.log("   Email: admin@sistema.com");
    console.log("   Senha: admin123\n");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  }
}

seed();
