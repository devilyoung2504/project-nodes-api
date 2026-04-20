// ============================================================
// app.ts - Punto de entrada de la aplicación
//
// Aquí se configura Express, se registran las rutas y se
// inicia la conexión con la base de datos. Todo arranca
// desde este archivo cuando ejecutamos `npm run dev`.
// ============================================================

import express from 'express';
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
// express.json() permite leer el body de las peticiones en formato JSON.
// Sin esto, req.body sería undefined.
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
// sequelize.sync({ alter: true }) compara los modelos con las tablas
// existentes en MySQL y aplica los cambios necesarios sin borrar datos.
// Una vez sincronizado, ejecuta el seed y luego inicia el servidor.
sequelize
  .sync({ alter: true })
  .then(async () => {
    console.log('Base de datos conectada y sincronizada');

    // El seed crea roles, permisos y el superusuario si no existen.
    // Es seguro ejecutarlo en cada inicio porque usa findOrCreate.
    await runSeed();

    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar con la base de datos:', error);
    // Termina el proceso si no se puede conectar a la BD.
    // No tiene sentido que el servidor corra sin base de datos.
    process.exit(1);
  });

export default app;
