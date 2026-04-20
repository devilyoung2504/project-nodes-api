// ============================================================
// routes/authRoutes.ts - Rutas de autenticación
//
// Las rutas conectan una URL + método HTTP con su controller.
// Este archivo define las rutas bajo el prefijo /api/auth
// (el prefijo se configura en app.ts).
//
// Ruta completa = prefijo + ruta local:
//   app.use('/api/auth', authRoutes)  +  router.post('/login')
//   = POST /api/auth/login
// ============================================================

import { Router } from 'express';
import { login, refresh, logout } from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Rutas públicas: no requieren token para acceder
router.post('/login', login);
router.post('/refresh', refresh);

// logout sí requiere estar autenticado para saber de qué sesión hacer logout
router.post('/logout', authenticate, logout);

export default router;
