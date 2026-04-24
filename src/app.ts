// ============================================================
// app.ts - Punto de entrada de la aplicación
//
// Aquí se configura Express, se registran las rutas y se
// inicia la conexión con la base de datos. Todo arranca
// desde este archivo cuando ejecutamos `npm run dev`.
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import { runSeed } from './seeders/initialData';

// Importar el index de modelos para que Sequelize registre todas
// las asociaciones (relaciones entre tablas) antes de sincronizar.
import './models';

// Carga las variables del archivo .env en process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:4200').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej. Postman, curl) y los origins configurados
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────────
// Cada grupo de rutas tiene un prefijo base.
// Ejemplo: authRoutes maneja /api/auth/login, /api/auth/logout, etc.
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Ruta de salud: sirve para verificar que el servidor está activo.
// Útil para herramientas de monitoreo o pruebas rápidas.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// ── Inicialización ────────────────────────────────────────────
// Reintenta la conexión a la BD antes de rendirse.
// Útil cuando el contenedor de MySQL tarda en estar listo.
async function startServer(retries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // sync({ alter: true }) compara los modelos con las tablas existentes
      // y aplica los cambios necesarios sin borrar datos.
      await sequelize.sync({ alter: true });
      console.log('Base de datos conectada y sincronizada');

      // El seed crea roles, permisos y el superusuario si no existen.
      // Es seguro ejecutarlo en cada inicio porque usa findOrCreate.
      await runSeed();

      app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
      });

      return;
    } catch (error) {
      console.error(`Error al conectar con la BD (intento ${attempt}/${retries}):`, String(error));
      if (attempt === retries) {
        console.error('No se pudo conectar a la base de datos. Cerrando.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

startServer();

export default app;
