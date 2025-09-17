import { Request, Response, Router } from "express";
import { pool } from "../db";
// import { sha512 } from "js-sha512";
import { pusher } from "../pusher";
import type { SessionUser } from "../types";
import nodemailer from "nodemailer";
import { apiResponse } from "../model/Response/response_standard";
import bcrypt from "bcrypt";

export default class AuthController {
  //#region POST /register
  // ใน route: upload.single('image')
  async register(req: Request, res: Response) {
    const { username, ticket, email, fullname } = req.body ?? {};
    const profile_image = req.file ? req.file.buffer : null;

    if (!username || !ticket || !email || !fullname) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing required fields" });
    }

    // ตรวจสอบซ้ำ email หรือ username
    const [exists] = await pool.query(
      "SELECT id FROM accounts WHERE email=? OR username=?",
      [email, username]
    );
    if ((exists as any[]).length > 0) {
      return res
        .status(409)
        .json({ ok: false, message: "Email or username already exists" });
    }

    // บันทึก ticket เป็น bcrypt hash
    const hashedTicket = await bcrypt.hash(ticket, 10);
    await pool.query(
      "INSERT INTO accounts (username, ticket, email, fullname, profile_image) VALUES (?, ?, ?, ?, ?)",
      [username, hashedTicket, email, fullname, profile_image]
    );

    return res.json({ ok: true, message: "Register success" });
  }
  //#endregion

  //#region  POST /login
  async login(req: Request, res: Response) {
    const { email, ticket } = req.body ?? {};
    if (!email || !ticket) {
      return res
        .status(400)
        .json({ ok: false, message: "Missing email or ticket" });
    }

    // ดึง user ตาม email
    const [rows] = await pool.query(
      "SELECT id, username, email, fullname, ticket FROM accounts WHERE email=?",
      [email]
    );
    const list = rows as Array<any>;
    if (list.length === 1) {
      const user = list[0];
      // ตรวจสอบรหัสผ่านด้วย bcrypt
      const match = await bcrypt.compare(ticket, user.ticket);
      if (match) {
        const u: SessionUser = {
          id: user.id,
          email: user.email,
          username: user.username,
          fullname: user.fullname,
          isAdmin: user.username === "admin",
        };
        (req.session as any).user = u;
        return res.json({ ok: true, user: u });
      }
    }
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  }
  //#endregion

  //#region // GET /me
  async me(req: Request, res: Response) {
    const user = (req.session as any).user as SessionUser | undefined;
    if (!user) return res.status(401).json({ ok: false });
    res.json({ ok: true, user });
  }
  //#endregion

  //#region // GET /users
  async users(req: Request, res: Response) {
    const user = (req.session as any).user as SessionUser | undefined;
    if (!user)
      return res.status(401).json({ ok: false, message: "Not authenticated" });

    // ดึงผู้ใช้ทั้งหมด ยกเว้นตัวเอง
    const [rows] = await pool.query(
      "SELECT id, username, fullname, email FROM accounts WHERE id != ?",
      [user.id]
    );
    res.json({ ok: true, users: rows });
  }
  //#endregion

  //#region // POST /logout
  async logout(req: Request, res: Response) {
    req.session.destroy(() => res.json({ ok: true }));
  }
  //#endregion

  //#region forgotPassword
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    console.log("REQ BODY:", req.body);
    if (!email) {
      return res.status(200).json({
        success: false,
        message: "⚠️ กรุณากรอกอีเมล",
        statusCode: 200,
      });
    }

    try {
      // ค้นหาผู้ใช้งานใน DB
      const [rows]: any = await pool.query(
        "SELECT id, email, fullname FROM accounts WHERE email = ?",
        [email]
      );
      if (rows.length === 0) {
        return res.status(200).json({
          success: false,
          message: "❌ ไม่พบผู้ใช้งานนี้",
          statusCode: 200,
        });
      }

      const user = rows[0];

      // 🔐 สร้างลิงก์สำหรับรีเซ็ตรหัสผ่าน (ในระบบจริงควรมี token ด้วย)
      const resetLink = `http://localhost:3000/reset-password?user=${user.id}`;

      // ✉️ สร้าง transporter ส่งเมลผ่าน Gmail
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // 📨 ส่งอีเมล
      await transporter.sendMail({
        from: `"Tissue" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "รีเซ็ตรหัสผ่านของคุณ",
        html: `
        <p>สวัสดีคุณ ${user.fullname},</p>
        <p>เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ</p>
        <p>คลิก <a href="${resetLink}">ที่นี่</a> เพื่อรีเซ็ตรหัสผ่านของคุณ</p>
        <p>หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยอีเมลนี้</p>
        <br />
        <p>ขอบคุณค่ะ<br/>Tissue Support</p>
      `,
      });

      return res.status(200).json({
        success: true,
        message:
          "✅ ส่งอีเมลสำหรับรีเซ็ตรหัสผ่านไปยังอีเมลที่ลงทะเบียนไว้แล้ว กรุณาตรวจสอบอีเมลของคุณ",
        statusCode: 200,
      });
    } catch (err: any) {
      console.error("❌ Send Mail Error:", err);
      return res
        .status(404)
        .json({ success: false, message: "เกิดข้อผิดพลาด", statusCode: 404 });
    }
  }
  //#endregion

  //#region resetPassword
  async resetPassword(
    req: Request,
    res: Response<apiResponse>
  ): Promise<Response<apiResponse>> {
    const { userId, newPassword } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const [result]: any = await pool.query(
        "UPDATE accounts SET ticket = ? WHERE id = ?",
        [hashedPassword, userId]
      );
      if (result.affectedRows === 0) {
        return res
          .status(200)
          .json({ success: false, message: "❌ ไม่พบผู้ใช้", statusCode: 200 });
      }

      return res.status(200).json({
        success: true,
        message: "✅ รีเซ็ตรหัสผ่านสำเร็จ",
        statusCode: 200,
      });
    } catch (error: any) {
      console.error("❌ Reset Error:", error);
      return res
        .status(404)
        .json({ success: false, message: "เกิดข้อผิดพลาด", statusCode: 404 });
    }
  }
  //#endregion
}
