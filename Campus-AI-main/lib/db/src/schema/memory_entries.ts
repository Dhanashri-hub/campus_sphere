import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoryEntriesTable = pgTable("memory_entries", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  tags: text("tags").array().notNull().default([]),
  studentId: integer("student_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntriesTable).omit({ id: true, createdAt: true });
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntry = typeof memoryEntriesTable.$inferSelect;
