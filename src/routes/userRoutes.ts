// ============================================================
// routes/userRoutes.ts - Rutas del CRUD de usuarios
//
// Todas las rutas de este archivo pasan primero por el
// middleware authenticate (verificación de JWT).
//
// Algunas rutas tienen además un segundo middleware authorize()
// que verifica que el rol del usuario tenga el permiso requerido
// consultando la base de datos.
//
// Flujo de una petición protegida:
//   Request → authenticate → authorize('permiso') → controller
//
// Para rutas donde la lógica de acceso depende de si es el
// propio usuario o un admin, el authorize se omite aquí y
// la validación se hace dentro del controller con hasPermission().
// ============================================================

import { Router } from 'express';
import { createUser, getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

// Aplica authenticate a TODAS las rutas de este router de una sola vez
router.use(authenticate);

// POST /api/users - crear usuario (requiere permiso users:create)
// La lógica de si puede crear admins se valida dentro del controller
router.post('/', authorize('users:create'), createUser);

// GET /api/users - listar todos los usuarios (requiere permiso users:read)
router.get('/', authorize('users:read'), getAllUsers);

// GET /api/users/:id - ver un usuario por id
// Sin authorize aquí: el controller decide si puede ver el perfil ajeno o solo el propio
router.get('/:id', getUserById);

// PUT /api/users/:id - actualizar un usuario por id
// Sin authorize aquí: el controller decide si puede editar el perfil ajeno o solo el propio
router.put('/:id', updateUser);

// DELETE /api/users/:id - eliminar un usuario (requiere permiso users:delete)
router.delete('/:id', authorize('users:delete'), deleteUser);

export default router;
