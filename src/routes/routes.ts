import { Router } from "express";
import SigninController from "../controllers/login.controller";
import AuthController from "../controllers/auth.controller";
import ChatController from "../controllers/chat.controller";

class SignInRoutes {
  router = Router();
  controller = new SigninController();
  authController = new AuthController();
  chatController = new ChatController();

  constructor() {
    this.intializeRoutes();
  }

  intializeRoutes() {
    this.router.post("/signin", this.controller.Signin);
    this.router.post("/login", this.authController.login);
    this.router.get("/me", this.authController.me);
    this.router.get("/users", this.authController.users);
    this.router.post("/logout", this.authController.logout);
    this.router.post("/register", this.authController.register);
    this.router.get("/conversations", this.chatController.getConversations);
    this.router.post("/conversations", this.chatController.createConversation);
    this.router.get("/messages", this.chatController.getMessages);
    this.router.post("/messages", this.chatController.sendMessage);
    this.router.post("/forgot-password", this.authController.forgotPassword);
    
  }
}
export default new SignInRoutes().router;
