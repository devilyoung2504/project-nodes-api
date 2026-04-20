// ============================================================
// seeders/initialData.ts - Datos iniciales del sistema
//
// Un "seed" es un script que inserta datos base necesarios
// para que la aplicación funcione desde el primer arranque.
//
// Este seed crea:
//   1. Los roles del sistema (superuser, admin, user)
//   2. Los permisos disponibles (users:create, users:read, etc.)
//   3. La asignación de permisos a cada rol
//   4. El superusuario inicial (credenciales en el .env)
//
// Usa findOrCreate en cada paso para ser idempotente:
// se puede ejecutar múltiples veces sin duplicar datos.
// ============================================================

import bcrypt from 'bcryptjs';
import { Role, Permission, RolePermission, User } from '../models';

// ── Definición de roles ───────────────────────────────────────
// Para agregar un nuevo rol, solo añade un objeto aquí.
const ROLES = [
  { name: 'superuser', description: 'Super administrador del sistema' },
  { name: 'admin',     description: 'Administrador, gestiona usuarios' },
  { name: 'user',      description: 'Usuario estándar' },
];

// ── Definición de permisos ────────────────────────────────────
// Convención de nombres: recurso:accion
// Para agregar un permiso nuevo, añádelo aquí y asígnalo a un rol abajo.
const PERMISSIONS = [
  { name: 'users:create',  description: 'Crear usuarios' },
  { name: 'users:read',    description: 'Ver usuarios' },
  { name: 'users:update',  description: 'Actualizar usuarios' },
  { name: 'users:delete',  description: 'Eliminar usuarios' },
  { name: 'admins:create', description: 'Crear administradores' },
];

// ── Asignación de permisos por rol ────────────────────────────
// Define qué puede hacer cada rol. El rol 'user' no tiene permisos
// globales; sus acciones (ver/editar su propio perfil) se validan
// directamente en el controller comparando req.user.id con el id del recurso.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  superuser: ['users:create', 'users:read', 'users:update', 'users:delete', 'admins:create'],
  admin:     ['users:create', 'users:read', 'users:update', 'users:delete'],
  user:      [],
};

export const runSeed = async (): Promise<void> => {
  // ── Paso 1: Crear roles ──────────────────────────────────────
  // findOrCreate busca el registro; si no existe, lo crea.
  // Retorna [instancia, fueCreado]. Solo nos interesa la instancia.
  const roleMap: Record<string, Role> = {};
  for (const r of ROLES) {
    const [role] = await Role.findOrCreate({ where: { name: r.name }, defaults: r });
    roleMap[r.name] = role; // guardamos referencia para usarla después
  }

  // ── Paso 2: Crear permisos ───────────────────────────────────
  const permissionMap: Record<string, Permission> = {};
  for (const p of PERMISSIONS) {
    const [permission] = await Permission.findOrCreate({ where: { name: p.name }, defaults: p });
    permissionMap[p.name] = permission;
  }

  // ── Paso 3: Asignar permisos a roles ─────────────────────────
  // Recorre el mapa ROLE_PERMISSIONS y crea los registros en
  // la tabla pivote role_permissions si no existen.
  for (const [roleName, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleMap[roleName];
    for (const permName of permNames) {
      const permission = permissionMap[permName];
      await RolePermission.findOrCreate({
        where: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // ── Paso 4: Crear el superusuario ────────────────────────────
  // Las credenciales vienen del .env para no exponerlas en el código.
  // Solo se crea si no existe un usuario con ese email.
  const superEmail    = process.env.SUPERUSER_EMAIL as string;
  const superPassword = process.env.SUPERUSER_PASSWORD as string;
  const superRole     = roleMap['superuser'];

  const existing = await User.findOne({ where: { email: superEmail } });
  if (!existing) {
    // bcrypt.hash(password, 10): el 10 es el "salt rounds".
    // Mayor número = más seguro pero más lento. 10 es el estándar.
    const hashed = await bcrypt.hash(superPassword, 10);
    await User.create({
      name:     'Super Admin',
      email:    superEmail,
      password: hashed,
      roleId:   superRole.id,
    });
    console.log(`Superusuario creado: ${superEmail}`);
  }

  console.log('Seed completado: roles, permisos y superusuario listos');
};
