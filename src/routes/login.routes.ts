import { Router } from "express";
import SigninController from "../controllers/login.controller";

class SignInRoutes {
  router = Router();
  controller = new SigninController();

  // constructor() {
  //   this.intializeRoutes();
  // }

  // intializeRoutes() {
  //   this.router.post("/signin", this.controller.Signin);
  // }
}

export default new SignInRoutes().router;
