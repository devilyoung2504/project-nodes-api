// ============================================================
// middlewares/authMiddleware.ts - Autenticación y autorización
//
// Un middleware es una función que se ejecuta ENTRE que llega
// la petición y que llega al controller. Puede:
//   - Leer y validar datos de la petición
//   - Modificar req o res
//   - Llamar a next() para continuar al siguiente middleware/controller
//   - Cortar el flujo respondiendo directamente (ej: 401, 403)
//
// Este archivo exporta tres funciones:
//   authenticate → verifica que el JWT sea válido
//   authorize    → verifica que el rol tenga el permiso requerido (consulta BD)
//   hasPermission → utilidad para verificar permisos dentro de controllers
// ============================================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, Permission } from '../models';
import { AuthRequest } from '../types';

// Estructura esperada dentro del payload del JWT
interface JwtPayload {
  id: number;
  email: string;
  roleId: number;
  roleName: string;
}

// ── authenticate ──────────────────────────────────────────────
// Verifica que la petición incluya un JWT válido en el header:
//   Authorization: Bearer <token>
//
// Si el token es válido, inyecta los datos del usuario en req.user
// para que los controllers puedan saber quién hace la petición.
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // El formato esperado es "Bearer <token>". Si no viene o tiene otro formato, rechaza.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token no proporcionado' });
    return;
  }

  // Separamos "Bearer" del token real
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify lanza una excepción si el token es inválido o expiró
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;

    // Guardamos los datos del usuario en req para usarlos más adelante
    req.user = { id: payload.id, email: payload.email, roleId: payload.roleId, roleName: payload.roleName };

    next(); // token válido → continuar al siguiente middleware o controller
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

// ── authorize ─────────────────────────────────────────────────
// Retorna un middleware que verifica si el rol del usuario tiene
// el permiso indicado. Consulta la BD haciendo un JOIN entre
// la tabla roles y permissions a través de role_permissions.
//
// Uso en rutas:
//   router.get('/', authorize('users:read'), getAllUsers);
//
// Si el rol no tiene el permiso → responde 403 Forbidden.
export const authorize = (permissionName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    // Busca el rol del usuario e intenta hacer JOIN con el permiso requerido.
    // Si el rol no tiene ese permiso, Sequelize no encuentra el registro y retorna null.
    const role = await Role.findOne({
      where: { id: req.user.roleId },
      include: [
        {
          model: Permission,
          as: 'permissions',
          where: { name: permissionName }, // filtra solo el permiso que nos interesa
          through: { attributes: [] },     // no incluir columnas de la tabla pivote en el resultado
          required: true,                  // INNER JOIN: si no hay match, role queda null
        },
      ],
    });

    if (!role) {
      res.status(403).json({
        message: `No tienes permiso para realizar esta acción (${permissionName})`,
      });
      return;
    }

    next(); // tiene el permiso → continuar
  };
};

// ── hasPermission ─────────────────────────────────────────────
// Versión de authorize para usar DENTRO de un controller cuando
// necesitas verificar un permiso adicional sin cortar el flujo
// con una respuesta HTTP automática.
//
// Ejemplo: en updateUser se verifica si puede cambiar el rol,
// pero la respuesta de error la maneja el controller con contexto.
export const hasPermission = async (roleId: number, permissionName: string): Promise<boolean> => {
  const role = await Role.findOne({
    where: { id: roleId },
    include: [
      {
        model: Permission,
        as: 'permissions',
        where: { name: permissionName },
        through: { attributes: [] },
        required: true,
      },
    ],
  });
  return role !== null; // true si tiene el permiso, false si no
};
