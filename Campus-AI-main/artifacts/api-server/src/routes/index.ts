import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import chatRouter from "./chat";
import memoryRouter from "./memory";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(chatRouter);
router.use(memoryRouter);
router.use(adminRouter);

export default router;
