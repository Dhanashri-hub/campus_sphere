import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  specialty: text("specialty").notNull(),
  avatarColor: text("avatar_color").notNull(),
  avatarEmoji: text("avatar_emoji").notNull(),
  positionX: real("position_x").notNull().default(50),
  positionY: real("position_y").notNull().default(50),
  personality: text("personality").notNull(),
  isOnline: boolean("is_online").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;
