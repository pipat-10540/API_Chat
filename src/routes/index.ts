import express from "express";
import authRoutes from "../auth"; // เพิ่มบรรทัดนี้
import SignInRoutes from "./routes";

const router = express.Router();
router.use(authRoutes); // mount /login, /register, /me, /users, ...
router.use(SignInRoutes);

export default router;
