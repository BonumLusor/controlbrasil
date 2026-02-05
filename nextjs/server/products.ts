import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { products, type Product, type InsertProduct } from "../drizzle/schema";
import { storagePut } from "./storage";

// Helper para processar dados de entrada
async function processProductImage(data: any): Promise<Partial<InsertProduct>> {
  const processed = { ...data };
  
  // Se recebermos uma string Base64 (novo upload vindo do frontend)
  if (typeof processed.image === 'string' && processed.image.startsWith('data:')) {
    try {
      // Extração dos dados do Base64
      const parts = processed.image.split(',');
      const base64Data = parts[1];
      const mimeType = parts[0].split(';')[0].split(':')[1];
      const extension = mimeType.split('/')[1] || 'jpg';
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Define um caminho único dentro da pasta de produtos
      const fileName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
      const relPath = `products/${fileName}`;
      
      // Salva utilizando o helper storagePut (Local ou Forge)
      const storageResult = await storagePut(relPath, buffer, mimeType);
      
      // Atualiza o campo que vai para o banco e remove o dado binário temporário
      processed.imageUrl = storageResult.url;
      delete processed.image; 
    } catch (e) {
      console.error("Erro ao processar e salvar imagem do produto:", e);
      // Em caso de erro, garantimos que não tentamos salvar o Base64 gigante no banco
      delete processed.image;
    }
  } else if (processed.image === null) {
    // Caso o usuário queira remover a imagem existente
    processed.imageUrl = null;
    delete processed.image;
  } else {
    // Se não for um novo upload (Base64), removemos o campo 'image' 
    // para evitar que o Drizzle tente inserir dados no campo bytea (caso ele ainda exista no schema)
    delete processed.image;
  }
  
  return processed;
}
export async function getAllProducts(): Promise<Product[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(products)
    .where(eq(products.active, true)) 
    .orderBy(desc(products.createdAt));
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
    
  return result[0];
}

export async function createProduct(data: any): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const dataWithImage = await processProductImage(data);
  const result = await db.insert(products).values(dataWithImage as InsertProduct).returning();
  
  return result[0];
}

export async function updateProduct(id: number, data: any): Promise<Product> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const dataWithImage = await processProductImage(data);
  const { id: _, createdAt: __, ...updateData } = dataWithImage;

  const result = await db
    .update(products)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
    
  return result[0];
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(products)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(products.id, id));
}

export async function getLowStockProducts() {
    const db = await getDb();
    if (!db) return [];
    return [];
}