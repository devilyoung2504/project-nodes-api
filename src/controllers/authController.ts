// ============================================================
// controllers/authController.ts - Lógica de autenticación
//
// Un controller recibe la petición HTTP, ejecuta la lógica
// de negocio (validaciones, consultas a la BD, etc.) y
// devuelve una respuesta JSON al cliente.
//
// Este controller maneja:
//   login   → valida credenciales y genera los dos tokens JWT
//   refresh → genera un nuevo access token usando el refresh token
//   logout  → invalida el refresh token eliminándolo de la BD
//
// ¿Por qué dos tokens?
//   accessToken  → vida corta (15 min), se envía en cada petición
//   refreshToken → vida larga (7 días), solo se usa para renovar
//                  el access token. Se guarda en BD para poder
//                  invalidarlo antes de que expire (logout).
// ============================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role, RefreshToken } from '../models';
import { AuthRequest } from '../types';

// ── Helpers para generar tokens ───────────────────────────────

// El access token contiene los datos del usuario en su payload.
// El middleware authenticate lo decodifica para saber quién hace la petición.
const generateAccessToken = (id: number, email: string, roleId: number, roleName: string): string => {
  return jwt.sign(
    { id, email, roleId, roleName },          // payload: datos que viajan dentro del token
    process.env.JWT_ACCESS_SECRET!,           // clave secreta para firmar
    { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'] }
  );
};

// El refresh token solo lleva el id para mantenerlo pequeño y seguro.
// No necesita el rol porque su único propósito es generar un nuevo access token.
const generateRefreshToken = (id: number): string => {
  return jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
  );
};

// ── POST /api/auth/login ──────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email y contraseña son requeridos' });
      return;
    }

    // Buscamos el usuario e incluimos su rol para tener el nombre en la respuesta
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }],
    });

    if (!user) {
      // Usamos el mismo mensaje para email y password incorrectos.
      // Mensajes diferentes permitirían descubrir qué emails están registrados.
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    // bcrypt.compare compara el password en texto plano con el hash guardado en BD
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Credenciales inválidas' });
      return;
    }

    // Generamos ambos tokens
    const role = (user as any).role as Role;
    const accessToken  = generateAccessToken(user.id, user.email, role.id, role.name);
    const refreshToken = generateRefreshToken(user.id);

    // Guardamos el refresh token en BD con su fecha de expiración.
    // Esto nos permite invalidarlo en el logout antes de que expire.
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días desde ahora
    await RefreshToken.create({ token: refreshToken, userId: user.id, expiresAt });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: role.name },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión', error });
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────
// El cliente llama a este endpoint cuando el access token expira.
// Verifica que el refresh token exista en BD y sea válido,
// luego genera y devuelve un nuevo access token.
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token requerido' });
      return;
    }

    // Verificación doble:
    // 1. Que el token exista en la BD (no fue invalidado por logout)
    // 2. Que no haya superado su fecha de expiración en BD
    const storedToken = await RefreshToken.findOne({ where: { token: refreshToken } });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.status(401).json({ message: 'Refresh token inválido o expirado' });
      return;
    }

    // También verificamos la firma JWT del refresh token
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as { id: number };

    const user = await User.findByPk(payload.id, {
      include: [{ model: Role, as: 'role' }],
    });
    if (!user) {
      res.status(401).json({ message: 'Usuario no encontrado' });
      return;
    }

    const role = (user as any).role as Role;
    const newAccessToken = generateAccessToken(user.id, user.email, role.id, role.name);

    res.status(200).json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ message: 'Refresh token inválido' });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────
// Elimina el refresh token de la BD, invalidándolo inmediatamente.
// El access token sigue siendo válido hasta que expire (max 15 min),
// pero sin refresh token el usuario no puede obtener uno nuevo.
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.destroy({ where: { token: refreshToken } });
    }
    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al cerrar sesión', error });
  }
};
