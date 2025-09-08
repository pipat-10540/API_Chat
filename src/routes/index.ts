import express from 'express';
import SignInRoutes from './login.routes';

const router = express.Router();
router.use(SignInRoutes);


export default router;