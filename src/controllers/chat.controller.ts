import { Request, Response } from "express";
import { pool } from "../db";
import { pusher } from "../pusher"; // เพิ่ม Pusher กลับมา

export default class ChatController {
  //#region // GET /conversations
  async getConversations(req: Request, res: Response) {
    const user = (req.session as any).user;
    if (!user)
      return res.status(401).json({ ok: false, message: "Not authenticated" });

    // ดึงห้องแชทที่ user เป็นสมาชิก
    const [convs]: any = await pool.query(
      `SELECT c.* FROM conversations c
         JOIN conversation_members m ON c.id = m.conversation_id
         WHERE m.user_id = ?`,
      [user.id]
    );

    // ดึงสมาชิกของแต่ละห้อง
    const conversations = await Promise.all(
      convs.map(async (conv: any) => {
        const [members]: any = await pool.query(
          `SELECT u.id, u.username, u.fullname
             FROM conversation_members m
             JOIN accounts u ON m.user_id = u.id
             WHERE m.conversation_id = ?`,
          [conv.id]
        );
        return { ...conv, members };
      })
    );

    res.json({ ok: true, conversations });
  }
  //#endregion

  //#region // POST /conversations
  async createConversation(req: Request, res: Response) {
    const user = (req.session as any).user;
    if (!user)
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    const { name, is_group, memberIds } = req.body ?? {};
    if (!Array.isArray(memberIds) || memberIds.length === 0)
      return res.status(400).json({ ok: false, message: "memberIds required" });
    // สร้างห้อง
    const [result]: any = await pool.query(
      "INSERT INTO conversations (name, is_group) VALUES (?, ?)",
      [name || null, is_group ? 1 : 0]
    );
    const conversationId = result.insertId;
    // เพิ่มสมาชิก (รวมตัวเอง)
    const allMemberIds = Array.from(new Set([...memberIds, user.id]));
    await Promise.all(
      allMemberIds.map((uid) =>
        pool.query(
          "INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)",
          [conversationId, uid]
        )
      )
    );
    res.json({ ok: true, conversationId });
  }
  //#endregion

  //#region // GET /messages
  async getMessages(req: Request, res: Response) {
    const user = (req.session as any).user;
    if (!user)
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    const { conversationId } = req.query;
    if (!conversationId)
      return res
        .status(400)
        .json({ ok: false, message: "conversationId required" });
    // ตรวจสอบว่า user เป็นสมาชิกห้องนี้
    const [members]: any = await pool.query(
      "SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?",
      [conversationId, user.id]
    );
    if (members.length === 0)
      return res.status(403).json({ ok: false, message: "Forbidden" });
    // ดึงข้อความ
    const [rows] = await pool.query(
      "SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC",
      [conversationId]
    );
    res.json({ ok: true, messages: rows });
  }
  //#endregion

  //#region // POST /messages
  async sendMessage(req: Request, res: Response) {
    const user = (req.session as any).user;
    if (!user)
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    const { conversationId, text } = req.body ?? {};
    if (!conversationId || !text)
      return res
        .status(400)
        .json({ ok: false, message: "conversationId and text required" });
    // ตรวจสอบว่า user เป็นสมาชิกห้องนี้
    const [members]: any = await pool.query(
      "SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?",
      [conversationId, user.id]
    );
    if (members.length === 0)
      return res.status(403).json({ ok: false, message: "Forbidden" });
    // บันทึกข้อความ
    const [result]: any = await pool.query(
      "INSERT INTO messages (conversation_id, sender_id, text) VALUES (?, ?, ?)",
      [conversationId, user.id, text]
    );

    // 🚀 Pusher real-time messaging
    const messageData = {
      id: result.insertId,
      conversation_id: conversationId,
      sender_id: user.id,
      text: text,
      created_at: new Date().toISOString(),
      sender: {
        id: user.id,
        username: user.username,
        fullname: user.fullname,
      },
    };

    // ส่งข้อความไปยัง channel ของ conversation นี้
    pusher
      .trigger(
        `conversation-${conversationId}`, // channel name
        "new-message", // event name
        messageData // payload
      )
      .catch((err: any) => console.error("Pusher error:", err));

    res.json({ ok: true, messageId: result.insertId });
  }
  //#endregion
}
