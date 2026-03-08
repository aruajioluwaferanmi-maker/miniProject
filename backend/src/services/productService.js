import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { products } from "../db/schema/products.js";
import { sampleProducts } from "../data/sampleProducts.js";

function normalizeProduct(product) {
  return {
    id: Number(product.id),
    name: product.name,
    price: Number(product.price),
    image: product.image,
    description:
      product.description ||
      `${product.name} is available now with reliable quality and fast checkout.`,
  };
}

async function fetchProductsFromDatabase() {
  const db = await getDb();
  const rows = await db.select().from(products);
  return rows.map(normalizeProduct);
}

export async function getProducts() {
  const useInMemory = process.env.USE_IN_MEMORY_PRODUCTS === "true";
  if (useInMemory) {
    return sampleProducts;
  }

  try {
    return await fetchProductsFromDatabase();
  } catch {
    return sampleProducts;
  }
}

export async function getProductById(productId) {
  const id = Number(productId);
  if (Number.isNaN(id)) {
    return null;
  }

  const useInMemory = process.env.USE_IN_MEMORY_PRODUCTS === "true";
  if (useInMemory) {
    return sampleProducts.find((product) => product.id === id) || null;
  }

  try {
    const db = await getDb();
    const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return rows[0] ? normalizeProduct(rows[0]) : null;
  } catch {
    return sampleProducts.find((product) => product.id === id) || null;
  }
}
