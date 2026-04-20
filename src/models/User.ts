// ============================================================
// models/User.ts - Modelo de la tabla `users`
//
// Representa a un usuario del sistema. En lugar de guardar
// el nombre del rol como texto (ej: "admin"), guardamos el
// roleId (FK) que apunta a la tabla roles. Esto sigue las
// buenas prácticas de normalización de bases de datos.
// ============================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Interfaz con todas las columnas de la tabla
interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string; // se guarda como hash, nunca en texto plano
  roleId: number;   // FK → tabla roles
  createdAt?: Date;
  updatedAt?: Date;
}

// Al crear un usuario, el id lo genera la BD automáticamente
type UserCreationAttributes = Optional<UserAttributes, 'id'>;

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public roleId!: number;
  // readonly porque Sequelize los gestiona automáticamente
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,                  // no pueden existir dos usuarios con el mismo email
      validate: { isEmail: true },   // Sequelize valida el formato antes de insertar
    },
    password: {
      type: DataTypes.STRING(255),   // 255 chars es suficiente para un hash bcrypt
      allowNull: false,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,              // todo usuario debe tener un rol asignado
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true, // agrega automáticamente createdAt y updatedAt
  }
);

export default User;
