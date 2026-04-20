// ============================================================
// config/database.ts - Configuración de la conexión a MySQL
//
// Sequelize es un ORM (Object-Relational Mapper): permite
// trabajar con la base de datos usando clases y objetos de
// TypeScript en lugar de escribir SQL directamente.
//
// Este archivo crea y exporta una única instancia de Sequelize
// que todos los modelos reutilizan.
// ============================================================

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'mysql',                                        // motor de BD
  host: process.env.DB_HOST || 'localhost',               // dirección del servidor MySQL
  port: Number(process.env.DB_PORT) || 3306,              // puerto por defecto de MySQL
  database: process.env.DB_NAME || 'utp_api_db',          // nombre de la base de datos
  username: process.env.DB_USER || 'root',                // usuario de MySQL
  password: process.env.DB_PASSWORD || '',                // contraseña de MySQL
  logging: false, // Cambiar a true para imprimir cada query SQL en consola (útil para depurar)
});

export default sequelize;
