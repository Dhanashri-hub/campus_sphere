import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, conversationsTable, messagesTable, studentsTable } from "@workspace/db";
import {
  GetConversationParams,
  DeleteConversationParams,
  ListMessagesParams,
  SendMessageParams,
  SendMessageBody,
  CreateConversationBody,
  ListConversationsQueryParams,
} from "@workspace/api-zod";
import { streamGeminiResponse } from "../../lib/gemini";
import { cogneeSearch } from "../../lib/cognee";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

// --- Conversations ---

router.get("/chat/conversations", async (req, res): Promise<void> => {
  const parsed = ListConversationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = parsed.data.studentId
    ? [eq(conversationsTable.studentId, parsed.data.studentId)]
    : [];

  const rows = await db
    .select()
    .from(conversationsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(rows);
});

router.post("/chat/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, parsed.data.studentId));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const title = parsed.data.title ?? `Chat with ${student.name}`;
  const [conv] = await db
    .insert(conversationsTable)
    .values({ studentId: parsed.data.studentId, title })
    .returning();
  res.status(201).json(conv);
});

router.get("/chat/conversations/:id", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conv.id))
    .orderBy(messagesTable.createdAt);

  res.json({ ...conv, messages: msgs });
});

router.delete("/chat/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(conversationsTable).where(eq(conversationsTable.id, params.data.id));
  res.sendStatus(204);
});

// --- Messages ---

router.get("/chat/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(msgs);
});

router.post("/chat/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SendMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const conversationId = params.data.id;
  const userContent = body.data.content;

  // Load conversation + student
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, conv.studentId));

  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  // Save user message
  await db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content: userContent,
  });

  // Update conversation timestamp
  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  // Retrieve relevant memory from Cognee
  let memoryContext = "";
  try {
    const memoryResults = await cogneeSearch(userContent);
    if (memoryResults.length > 0) {
      memoryContext =
        "\n\nRelevant knowledge from memory:\n" +
        memoryResults
          .slice(0, 3)
          .map((r) => `- ${r.content}`)
          .join("\n");
    }
  } catch (err) {
    req.log.warn({ err }, "Memory retrieval failed, continuing without context");
  }

  // Load message history
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  const chatHistory = history
    .slice(0, -1) // exclude the just-inserted user message
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Build system prompt
  const systemPrompt = `You are ${student.name}, an AI character living on the CampusSphere virtual campus.
Role: ${student.role}
Specialty: ${student.specialty}
Personality: ${student.personality}

You speak naturally and engagingly, reflecting your unique personality and expertise. Keep responses concise but helpful. You are aware of your campus setting and enjoy discussing your specialty.${memoryContext}`;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let fullResponse = "";

  try {
    for await (const chunk of streamGeminiResponse(systemPrompt, chatHistory, userContent)) {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
  } catch (err) {
    logger.error({ err }, "Error streaming Gemini response");
    const errMsg = "\n\n[An error occurred generating the response]";
    fullResponse += errMsg;
    res.write(`data: ${JSON.stringify({ content: errMsg })}\n\n`);
  }

  // Save assistant message
  if (fullResponse) {
    await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
