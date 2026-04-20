// ============================================================
// models/Role.ts - Modelo de la tabla `roles`
//
// Un rol representa un tipo de usuario en el sistema.
// Ejemplos: superuser, admin, user.
//
// Los roles están en la BD para que puedan crearse o
// modificarse sin tocar código.
// ============================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interfaz que describe todas las columnas de la tabla
interface RoleAttributes {
  id: number;
  name: string;
  description: string;
}

// Al crear un rol no es necesario enviar el id (lo genera la BD con autoIncrement)
type RoleCreationAttributes = Optional<RoleAttributes, 'id'>;

// La clase extiende Model de Sequelize e implementa los atributos definidos arriba
class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
}

// Role.init define la estructura de la tabla y las validaciones de cada columna
Role.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true, // no pueden existir dos roles con el mismo nombre
    },
    description: { type: DataTypes.STRING(255), allowNull: false },
  },
  {
    sequelize,
    tableName: 'roles',
    timestamps: false, // esta tabla no necesita createdAt / updatedAt
  }
);

export default Role;
