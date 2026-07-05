import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, studentsTable, conversationsTable, messagesTable, memoryEntriesTable } from "@workspace/db";
import { sql, eq, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/stats", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    [{ count: totalStudents }],
    [{ count: totalConversations }],
    [{ count: totalMessages }],
    [{ count: totalMemoryEntries }],
    [{ count: onlineStudents }],
    [{ count: activeToday }],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(studentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(conversationsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(messagesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(memoryEntriesTable),
    db.select({ count: sql<number>`count(*)::int` }).from(studentsTable).where(eq(studentsTable.isOnline, true)),
    db
      .select({ count: sql<number>`count(distinct conversation_id)::int` })
      .from(messagesTable)
      .where(gte(messagesTable.createdAt, today)),
  ]);

  res.json({
    totalStudents,
    totalConversations,
    totalMessages,
    totalMemoryEntries,
    onlineStudents,
    activeToday,
  });
});

router.get("/admin/activity", async (_req, res): Promise<void> => {
  const [conversations, entries, students] = await Promise.all([
    db.select().from(conversationsTable).orderBy(desc(conversationsTable.createdAt)).limit(10),
    db.select().from(memoryEntriesTable).orderBy(desc(memoryEntriesTable.createdAt)).limit(10),
    db.select().from(studentsTable),
  ]);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const events = [
    ...conversations.map((c) => ({
      id: `conv-${c.id}`,
      type: "conversation_started",
      description: `${studentMap.get(c.studentId)?.name ?? "Unknown"} started a new conversation`,
      timestamp: c.createdAt.toISOString(),
      studentId: c.studentId,
      studentName: studentMap.get(c.studentId)?.name ?? null,
    })),
    ...entries.map((e) => ({
      id: `mem-${e.id}`,
      type: "memory_added",
      description: `Memory entry added: ${e.content.slice(0, 60)}${e.content.length > 60 ? "..." : ""}`,
      timestamp: e.createdAt.toISOString(),
      studentId: e.studentId,
      studentName: e.studentId ? (studentMap.get(e.studentId)?.name ?? null) : null,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(events.slice(0, 15));
});

export default router;
