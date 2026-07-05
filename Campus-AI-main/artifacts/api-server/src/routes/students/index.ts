import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import {
  GetStudentParams,
  UpdateStudentParams,
  UpdateStudentBody,
  DeleteStudentParams,
  ListStudentsResponseItem,
  CreateStudentBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/students", async (_req, res): Promise<void> => {
  const rows = await db.select().from(studentsTable).orderBy(studentsTable.id);
  res.json(rows.map((r) => ListStudentsResponseItem.parse(r)));
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [student] = await db.insert(studentsTable).values(parsed.data).returning();
  res.status(201).json(ListStudentsResponseItem.parse(student));
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(ListStudentsResponseItem.parse(student));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [student] = await db
    .update(studentsTable)
    .set(parsed.data)
    .where(eq(studentsTable.id, params.data.id))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(ListStudentsResponseItem.parse(student));
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db
    .delete(studentsTable)
    .where(eq(studentsTable.id, params.data.id))
    .returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
