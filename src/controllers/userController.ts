// ============================================================
// controllers/userController.ts - CRUD de usuarios
//
// Maneja las operaciones sobre la tabla users:
//   createUser  → POST   /api/users
//   getAllUsers  → GET    /api/users
//   getUserById → GET    /api/users/:id
//   updateUser  → PUT    /api/users/:id
//   deleteUser  → DELETE /api/users/:id
//
// Reglas de acceso:
//   - createUser:  requiere permiso 'users:create'
//                  Si el rol a asignar es 'admin', requiere 'admins:create'
//   - getAllUsers:  requiere permiso 'users:read'
//   - getUserById: con 'users:read' puede ver cualquier usuario;
//                  sin ese permiso, solo puede ver su propio perfil
//   - updateUser:  con 'users:update' puede editar cualquier usuario;
//                  sin ese permiso, solo puede editar su propio perfil
//                  Solo 'admins:create' puede cambiar el rol de un usuario
//   - deleteUser:  requiere permiso 'users:delete'
// ============================================================

import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, Role } from '../models';
import { hasPermission } from '../middlewares/authMiddleware';
import { AuthRequest } from '../types';

// ── POST /api/users ───────────────────────────────────────────
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, roleName } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Nombre, email y contraseña son requeridos' });
      return;
    }

    // Verificar que el email no esté en uso antes de crear
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      res.status(409).json({ message: 'El email ya está registrado' });
      return;
    }

    // Si no se especifica rol, se asigna 'user' por defecto
    const targetRoleName = roleName || 'user';

    // Crear un admin o superuser es una operación privilegiada.
    // Verificamos que quien hace la petición tenga el permiso 'admins:create'.
    if (targetRoleName === 'admin' || targetRoleName === 'superuser') {
      const canCreateAdmin = await hasPermission(req.user!.roleId, 'admins:create');
      if (!canCreateAdmin) {
        res.status(403).json({ message: 'No tienes permiso para crear administradores' });
        return;
      }
    }

    // Buscar el rol en la BD para obtener su id
    const role = await Role.findOne({ where: { name: targetRoleName } });
    if (!role) {
      res.status(400).json({ message: `El rol '${targetRoleName}' no existe` });
      return;
    }

    // Hashear la contraseña antes de guardarla. NUNCA se guarda en texto plano.
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, roleId: role.id });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: { id: user.id, name: user.name, email: user.email, role: role.name },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error });
  }
};

// ── GET /api/users ────────────────────────────────────────────
export const getAllUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }, // nunca devolver el hash de la contraseña
      include: [{ model: Role, as: 'role', attributes: ['name'] }], // incluir solo el nombre del rol
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error });
  }
};

// ── GET /api/users/:id ────────────────────────────────────────
export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // id viene como string en los params de la URL

    // Verificación de acceso:
    // - Si tiene 'users:read' puede ver cualquier perfil
    // - Si no, solo puede ver el suyo (comparando id del token con id de la URL)
    const canReadAll = await hasPermission(req.user!.roleId, 'users:read');
    if (!canReadAll && req.user!.id !== Number(id)) {
      res.status(403).json({ message: 'Solo puedes ver tu propio perfil' });
      return;
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });

    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuario', error });
  }
};

// ── PUT /api/users/:id ────────────────────────────────────────
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificación de acceso (igual que getUserById pero para editar)
    const canUpdateAll = await hasPermission(req.user!.roleId, 'users:update');
    if (!canUpdateAll && req.user!.id !== Number(id)) {
      res.status(403).json({ message: 'Solo puedes editar tu propio perfil' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const { name, email, password, roleName } = req.body;

    // Construimos el objeto de actualización solo con los campos que vienen en el body.
    // Así el cliente puede actualizar solo lo que necesita sin enviar todo.
    const updateData: Partial<{ name: string; email: string; password: string; roleId: number }> = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 10); // hashear el nuevo password

    // Cambiar el rol es una operación especial: solo quien tenga 'admins:create' puede hacerlo
    if (roleName) {
      const canChangeRole = await hasPermission(req.user!.roleId, 'admins:create');
      if (!canChangeRole) {
        res.status(403).json({ message: 'No tienes permiso para cambiar roles' });
        return;
      }
      const role = await Role.findOne({ where: { name: roleName } });
      if (!role) {
        res.status(400).json({ message: `El rol '${roleName}' no existe` });
        return;
      }
      updateData.roleId = role.id;
    }

    // Aplicar los cambios al registro en BD
    await user.update(updateData);

    // Volver a buscar el usuario actualizado para incluir el rol en la respuesta
    const updated = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });

    res.status(200).json({ message: 'Usuario actualizado exitosamente', user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error });
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    // user.destroy() elimina el registro de la BD.
    // Gracias al onDelete: 'CASCADE' definido en las asociaciones,
    // sus refresh tokens se eliminan automáticamente.
    await user.destroy();
    res.status(200).json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error });
  }
};
