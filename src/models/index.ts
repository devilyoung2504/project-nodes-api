// ============================================================
// models/index.ts - Asociaciones entre modelos (relaciones)
//
// Sequelize necesita que las relaciones se declaren una sola
// vez antes de usarlas. Este archivo centraliza todas las
// asociaciones y se importa en app.ts al arrancar el servidor.
//
// Relaciones del sistema:
//
//   User ──────► Role          (N:1) un usuario tiene un rol
//   Role ◄──────► Permission   (N:M) un rol tiene muchos permisos
//                               y un permiso puede pertenecer a muchos roles
//   User ──────► RefreshToken  (1:N) un usuario puede tener varios refresh tokens
// ============================================================

import User from './User';
import Role from './Role';
import Permission from './Permission';
import RolePermission from './RolePermission';
import RefreshToken from './RefreshToken';

// ── User ↔ Role ───────────────────────────────────────────────
// belongsTo agrega el método user.getRole() y la columna roleId en users
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
// hasMany permite buscar todos los usuarios de un rol: role.getUsers()
Role.hasMany(User, { foreignKey: 'roleId' });

// ── Role ↔ Permission (N:M a través de RolePermission) ───────
// belongsToMany genera automáticamente los JOINs con la tabla pivote
// El alias 'permissions' se usa en los includes: include: [{ as: 'permissions' }]
Role.belongsToMany(Permission, {
  through: RolePermission,   // tabla intermedia
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
});

// ── User ↔ RefreshToken ───────────────────────────────────────
// onDelete: 'CASCADE' significa que si se elimina un usuario,
// sus refresh tokens se eliminan automáticamente en la BD.
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

// Exportar todos los modelos desde un único punto de acceso
export { User, Role, Permission, RolePermission, RefreshToken };
