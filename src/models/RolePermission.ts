// ============================================================
// models/RolePermission.ts - Tabla pivote entre roles y permisos
//
// Esta tabla implementa la relación muchos a muchos (N:M):
//   - Un rol puede tener muchos permisos
//   - Un permiso puede pertenecer a muchos roles
//
// Estructura de la tabla:
//   role_permissions
//   ┌──────────┬─────────────┐
//   │  roleId  │ permissionId│
//   ├──────────┼─────────────┤
//   │    1     │      1      │  superuser tiene users:create
//   │    1     │      2      │  superuser tiene users:read
//   │    2     │      1      │  admin tiene users:create
//   └──────────┴─────────────┘
// ============================================================

import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class RolePermission extends Model {}

RolePermission.init(
  {
    // Clave foránea que apunta a la tabla roles
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    // Clave foránea que apunta a la tabla permissions
    permissionId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    timestamps: false,
  }
);

export default RolePermission;
