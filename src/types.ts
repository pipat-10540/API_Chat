export interface SessionUser {
  id: number;
  email: string;
  username: string;
  fullname: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}
export {};
