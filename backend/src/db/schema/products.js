import { mysqlTable, int, varchar, double } from "drizzle-orm/mysql-core";

export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }),
  price: double("price"),
  image: varchar("image", { length: 500 }),
});