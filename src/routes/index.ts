import express from "express";
import authRoutes from "../auth"; // เพิ่มบรรทัดนี้
import SignInRoutes from "./login.routes";
import chatRoutes from "./chat";

const router = express.Router();
router.use(authRoutes); // mount /login, /register, /me, /users, ...
router.use(SignInRoutes);
router.use(chatRoutes);

export default router;
