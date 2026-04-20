// ============================================================
// models/Permission.ts - Modelo de la tabla `permissions`
//
// Un permiso representa una acción concreta que se puede
// realizar en el sistema. Se nombran con el formato:
//   recurso:accion  →  users:create, users:delete, etc.
//
// Al tenerlos en BD, agregar un nuevo permiso no requiere
// modificar el código: solo insertar un registro y asignarlo
// al rol correspondiente.
// ============================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PermissionAttributes {
  id: number;
  name: string;        // Ej: 'users:create'
  description: string; // Ej: 'Crear usuarios'
}

type PermissionCreationAttributes = Optional<PermissionAttributes, 'id'>;

class Permission
  extends Model<PermissionAttributes, PermissionCreationAttributes>
  implements PermissionAttributes
{
  public id!: number;
  public name!: string;
  public description!: string;
}

Permission.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true, // cada permiso tiene un nombre único en el sistema
    },
    description: { type: DataTypes.STRING(255), allowNull: false },
  },
  {
    sequelize,
    tableName: 'permissions',
    timestamps: false,
  }
);

export default Permission;
