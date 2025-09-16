import { Router } from "express";
import { pool } from "./db";
import { sha512 } from "js-sha512";
import { pusher } from "./pusher";
import type { SessionUser } from "./types";

const router = Router();
// POST /pusher/auth  (authorize presence/private channels)
router.post("/pusher/auth", (req, res) => {
  const user = (req.session as any).user as SessionUser | undefined;
  if (!user) return res.status(401).send("Not authenticated");

  const { channel_name, socket_id } = req.body ?? {};
  if (!channel_name || !socket_id) return res.status(400).send("Bad request");

  // presence channel ต้องคืน user_info ด้วย
  const presenceData = {
    user_id: String(user.id), // ต้อง unique ต่อ user
    user_info: {
      username: user.username,
      fullname: user.fullname,
      isAdmin: user.isAdmin,
    },
  };

  const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
  res.send(auth);
});

export default router;
