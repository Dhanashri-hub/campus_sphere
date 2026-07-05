import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db, memoryEntriesTable, studentsTable, messagesTable, conversationsTable } from "@workspace/db";
import {
  SearchMemoryQueryParams,
  AddMemoryEntryBody,
  GetMemoryTimelineQueryParams,
} from "@workspace/api-zod";
import { cogneeSearch, cogneeAdd, cogneeGraph } from "../../lib/cognee";

const router: IRouter = Router();

// Search memory using Cognee
router.get("/memory/search", async (req, res): Promise<void> => {
  const parsed = SearchMemoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const results = await cogneeSearch(parsed.data.query, parsed.data.studentId);
  res.json({ query: parsed.data.query, results });
});

// List local memory entries
router.get("/memory/entries", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(memoryEntriesTable)
    .orderBy(desc(memoryEntriesTable.createdAt));
  res.json(rows);
});

// Add a memory entry (stored locally and sent to Cognee)
router.post("/memory/entries", async (req, res): Promise<void> => {
  const parsed = AddMemoryEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entry] = await db
    .insert(memoryEntriesTable)
    .values({
      content: parsed.data.content,
      tags: parsed.data.tags ?? [],
      studentId: parsed.data.studentId ?? null,
    })
    .returning();

  // Asynchronously add to Cognee (do not block response)
  cogneeAdd(parsed.data.content, parsed.data.tags ?? []).catch(() => {});

  res.status(201).json(entry);
});

// Get knowledge graph from Cognee
router.get("/memory/graph", async (_req, res): Promise<void> => {
  const graph = await cogneeGraph();

  // If Cognee has no data yet, build a synthetic graph from local memory entries
  if (graph.nodes.length === 0) {
    const entries = await db
      .select()
      .from(memoryEntriesTable)
      .orderBy(desc(memoryEntriesTable.createdAt))
      .limit(20);

    const students = await db.select().from(studentsTable);

    const nodes = [
      ...students.map((s) => ({
        id: `student-${s.id}`,
        label: s.name,
        type: "student",
        metadata: { role: s.role, specialty: s.specialty },
      })),
      ...entries.map((e) => ({
        id: `memory-${e.id}`,
        label: e.content.slice(0, 50),
        type: "memory",
        metadata: { tags: e.tags },
      })),
    ];

    const edges = entries
      .filter((e) => e.studentId != null)
      .map((e) => ({
        id: `edge-${e.id}`,
        source: `student-${e.studentId}`,
        target: `memory-${e.id}`,
        label: "knows",
      }));

    res.json({ nodes, edges });
    return;
  }

  res.json(graph);
});

// Get memory timeline
router.get("/memory/timeline", async (req, res): Promise<void> => {
  const parsed = GetMemoryTimelineQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Build timeline from conversations, messages, and memory entries
  const [conversations, entries, students] = await Promise.all([
    db.select().from(conversationsTable).orderBy(desc(conversationsTable.createdAt)).limit(30),
    db.select().from(memoryEntriesTable).orderBy(desc(memoryEntriesTable.createdAt)).limit(30),
    db.select().from(studentsTable),
  ]);

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Filter by studentId if provided
  const filteredConversations = parsed.data.studentId
    ? conversations.filter((c) => c.studentId === parsed.data.studentId)
    : conversations;

  const filteredEntries = parsed.data.studentId
    ? entries.filter((e) => e.studentId === parsed.data.studentId)
    : entries;

  const events = [
    ...filteredConversations.map((c) => ({
      id: `conv-${c.id}`,
      type: "conversation",
      title: c.title,
      description: `Conversation started with ${studentMap.get(c.studentId)?.name ?? "a student"}`,
      timestamp: c.createdAt.toISOString(),
      studentId: c.studentId,
      studentName: studentMap.get(c.studentId)?.name ?? null,
    })),
    ...filteredEntries.map((e) => ({
      id: `mem-${e.id}`,
      type: "memory",
      title: "Memory Added",
      description: e.content.slice(0, 120),
      timestamp: e.createdAt.toISOString(),
      studentId: e.studentId,
      studentName: e.studentId ? (studentMap.get(e.studentId)?.name ?? null) : null,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(events);
});

export default router;
