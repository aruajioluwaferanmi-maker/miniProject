import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

let dbInstance;

export async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  dbInstance = drizzle(connection);
  return dbInstance;
}
