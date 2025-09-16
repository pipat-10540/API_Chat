import "dotenv/config";
import express from "express";
import session from "express-session";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - express-mysql-session has CJS export
import MySQLSession from "express-mysql-session";
import cors from "cors";
import path from "path";

import authRoutes from "./auth";
import Routes from "./routes";
import { pusher } from "./pusher";
import { pool } from "./db";

const app = express();

// MySQL session store (prevents logout when server restarts)
const MySQLStore = (MySQLSession as any)(session);
const sessionStore = new MySQLStore({
  // Pull credentials from env; fallback to pool options if needed
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000, // 15 minutes
  expiration: 7 * 24 * 60 * 60 * 1000, // 7 days
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    name: process.env.SESSION_NAME || "sid",
    cookie: {
      httpOnly: true,
      sameSite: (process.env.COOKIE_SAMESITE as any) || "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Auth / Presence / Pusher auth
app.use(authRoutes);

// รวม API อื่น ๆ ที่เคยอยู่ใน server.ts
app.use("/api", Routes);

// ตัวอย่าง broadcast (เฉพาะ admin)
app.post("/api/broadcast", async (req, res) => {
  const user = (req.session as any).user;
  if (!user?.isAdmin) return res.status(403).json({ ok: false });

  const { text } = req.body ?? {};
  await pusher.trigger("presence-event-1", "server-announcement", {
    text,
    at: Date.now(),
  });
  res.json({ ok: true });
});

// static (optional)
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("API running on http://localhost:" + PORT);
});
