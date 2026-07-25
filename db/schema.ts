import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const matchState = sqliteTable("match_state", {
  id: integer("id").primaryKey(),
  data: text("data").notNull().default("[]"),
  revision: integer("revision").notNull().default(0),
  updatedAt: text("updated_at"),
});
