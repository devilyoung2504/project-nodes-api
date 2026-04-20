// ============================================================
// types/index.ts - Tipos y interfaces compartidos
//
// TypeScript permite extender tipos existentes de librerías.
// Aquí extendemos el Request de Express para agregar la
// propiedad `user`, que nuestro middleware de autenticación
// inyecta después de verificar el JWT.
//
// Sin esta extensión, TypeScript daría error al acceder a
// req.user en los controllers porque Express no lo define
// por defecto.
// ============================================================

import { Request } from 'express';

// AuthRequest extiende Request agregando el campo `user`.
// Se usa en middlewares y controllers que requieren autenticación.
// El signo ? indica que es opcional, porque antes de autenticar
// req.user aún no existe.
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    roleId: number;   // id del rol en la BD (FK → tabla roles)
    roleName: string; // nombre del rol, ej: 'admin'
  };
}
