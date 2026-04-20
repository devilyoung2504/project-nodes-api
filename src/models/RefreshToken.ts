// ============================================================
// models/RefreshToken.ts - Modelo de la tabla `refresh_tokens`
//
// Los refresh tokens permiten obtener un nuevo access token
// sin que el usuario tenga que volver a iniciar sesión.
//
// Flujo:
//   1. Al hacer login se generan: accessToken (15 min) y refreshToken (7 días)
//   2. El refreshToken se guarda en esta tabla
//   3. Cuando el accessToken expira, el cliente envía el refreshToken
//      al endpoint /api/auth/refresh para obtener uno nuevo
//   4. Al hacer logout, el refreshToken se elimina de esta tabla,
//      invalidándolo inmediatamente
//
// Guardar el token en BD (en vez de solo firmarlo con JWT) permite
// invalidarlo antes de que expire, por ejemplo al cerrar sesión.
// ============================================================

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RefreshTokenAttributes {
  id: number;
  token: string;    // el JWT del refresh token
  userId: number;   // FK → tabla users
  expiresAt: Date;  // fecha límite de validez (7 días desde el login)
}

type RefreshTokenCreationAttributes = Optional<RefreshTokenAttributes, 'id'>;

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: number;
  public token!: string;
  public userId!: number;
  public expiresAt!: Date;
}

RefreshToken.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    token: { type: DataTypes.TEXT, allowNull: false },   // TEXT porque los JWT son largos
    userId: { type: DataTypes.INTEGER, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    timestamps: false,
  }
);

export default RefreshToken;
