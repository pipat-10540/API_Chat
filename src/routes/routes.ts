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
    
  }
}
export default new SignInRoutes().router;
