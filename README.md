# API REST - Node.js + Express + TypeScript + MySQL

API REST con autenticación JWT, refresh tokens y control de acceso basado en roles (RBAC) almacenados en base de datos.

---

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [Docker](https://www.docker.com/) v20 o superior

---

## Poner a correr el proyecto

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd project-nodejs-api
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores (los valores por defecto funcionan si usas Docker Compose):

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=utp_api_db
DB_USER=root
DB_PASSWORD=root1234

JWT_ACCESS_SECRET=access_secret_cambia_esto_en_produccion
JWT_REFRESH_SECRET=refresh_secret_cambia_esto_en_produccion
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SUPERUSER_EMAIL=super@admin.com
SUPERUSER_PASSWORD=Super@1234
```

### 3. Levantar la base de datos con Docker

```bash
docker compose up -d
```

Verifica que el contenedor esté corriendo:

```bash
docker compose ps
```

### 4. Iniciar el servidor

```bash
npm run dev
```

Al iniciar, el servidor:
- Conecta con MySQL
- Crea las tablas automáticamente (`users`, `roles`, `permissions`, `role_permissions`, `refresh_tokens`)
- Ejecuta el seed: crea los roles, permisos y el superusuario

Salida esperada en consola:
```
Base de datos conectada y sincronizada
Superusuario creado: super@admin.com
Seed completado: roles, permisos y superusuario listos
Servidor corriendo en http://localhost:3000
```

### Verificar que funciona

```bash
curl http://localhost:3000/health
```

```json
{ "status": "OK", "message": "Servidor funcionando correctamente" }
```

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia en modo desarrollo con hot reload |
| `npm run build` | Compila TypeScript a JavaScript en `/dist` |
| `npm start` | Inicia el servidor compilado (requiere `npm run build` primero) |

---

## Limpiar la base de datos

```bash
# Detener el servidor (Ctrl+C), luego:
docker compose down -v   # elimina el contenedor Y los datos
docker compose up -d     # recrea la BD vacía
npm run dev              # el seed vuelve a crear todo desde cero
```

---

## Arquitectura

```
src/
├── config/
│   └── database.ts         # Conexión a MySQL con Sequelize
├── controllers/
│   ├── authController.ts   # login, refresh, logout
│   └── userController.ts   # CRUD de usuarios
├── middlewares/
│   └── authMiddleware.ts   # authenticate + authorize (consulta BD)
├── models/
│   ├── index.ts            # Asociaciones entre modelos
│   ├── User.ts
│   ├── Role.ts
│   ├── Permission.ts
│   ├── RolePermission.ts
│   └── RefreshToken.ts
├── routes/
│   ├── authRoutes.ts
│   └── userRoutes.ts
├── seeders/
│   └── initialData.ts      # Roles, permisos y superusuario iniciales
├── types/
│   └── index.ts            # AuthRequest, tipos compartidos
└── app.ts                  # Entry point
```

---

## Roles y permisos

| Permiso | superuser | admin | user |
|---------|:---------:|:-----:|:----:|
| `users:create` | ✓ | ✓ | |
| `users:read` | ✓ | ✓ | |
| `users:update` | ✓ | ✓ | |
| `users:delete` | ✓ | ✓ | |
| `admins:create` | ✓ | | |

> El rol `user` puede ver y editar únicamente su propio perfil (sin permiso explícito, validado en el controller).

---

## Endpoints

### Autenticación

#### POST /api/auth/login

Inicia sesión y devuelve los tokens de acceso.

**Body:**
```json
{
  "email": "super@admin.com",
  "password": "Super@1234"
}
```

**Respuesta exitosa (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Super Admin",
    "email": "super@admin.com",
    "role": "superuser"
  }
}
```

---

#### POST /api/auth/refresh

Genera un nuevo `accessToken` usando el `refreshToken` (cuando el access token expira).

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta exitosa (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### POST /api/auth/logout

Invalida el `refreshToken` en la base de datos.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

---

### Usuarios

> Todos los endpoints de usuarios requieren el header:
> ```
> Authorization: Bearer <accessToken>
> ```

---

#### POST /api/users

Crea un nuevo usuario. Un `admin` puede crear usuarios con rol `user`. Solo el `superuser` puede crear `admin`.

**Requerido:** permiso `users:create`. Para crear un `admin`, además se requiere `admins:create`.

**Body - crear un usuario (admin o superuser):**
```json
{
  "name": "Ana García",
  "email": "ana@email.com",
  "password": "password123",
  "roleName": "user"
}
```

**Body - crear un admin (solo superuser):**
```json
{
  "name": "Carlos Admin",
  "email": "carlos@email.com",
  "password": "password123",
  "roleName": "admin"
}
```

**Respuesta exitosa (201):**
```json
{
  "message": "Usuario creado exitosamente",
  "user": {
    "id": 2,
    "name": "Ana García",
    "email": "ana@email.com",
    "role": "user"
  }
}
```

---

#### GET /api/users

Lista todos los usuarios del sistema.

**Requerido:** permiso `users:read`.

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Super Admin",
    "email": "super@admin.com",
    "roleId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "role": { "name": "superuser" }
  },
  {
    "id": 2,
    "name": "Ana García",
    "email": "ana@email.com",
    "roleId": 3,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "role": { "name": "user" }
  }
]
```

---

#### GET /api/users/:id

Obtiene un usuario por ID. Un `admin` o `superuser` puede ver cualquier usuario. Un `user` solo puede ver su propio perfil.

**Respuesta exitosa (200):**
```json
{
  "id": 2,
  "name": "Ana García",
  "email": "ana@email.com",
  "roleId": 3,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "role": { "name": "user" }
}
```

---

#### PUT /api/users/:id

Actualiza un usuario. Un `admin` o `superuser` puede editar cualquier usuario. Un `user` solo puede editar su propio perfil. Solo el `superuser` puede cambiar el rol de un usuario.

**Body (todos los campos son opcionales):**
```json
{
  "name": "Ana García Actualizada",
  "email": "ana.nueva@email.com",
  "password": "nuevaPassword123"
}
```

**Body - cambiar rol (solo superuser):**
```json
{
  "name": "Carlos",
  "roleName": "admin"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Usuario actualizado exitosamente",
  "user": {
    "id": 2,
    "name": "Ana García Actualizada",
    "email": "ana.nueva@email.com",
    "roleId": 3,
    "role": { "name": "user" }
  }
}
```

---

#### DELETE /api/users/:id

Elimina un usuario por ID.

**Requerido:** permiso `users:delete`.

**Respuesta exitosa (200):**
```json
{
  "message": "Usuario eliminado exitosamente"
}
```

---

## Flujo de uso típico

```
1. Login con superusuario
   POST /api/auth/login → obtener accessToken y refreshToken

2. Crear un admin
   POST /api/users  { roleName: "admin" }

3. Login con el admin recién creado
   POST /api/auth/login → nuevo accessToken

4. El admin crea usuarios
   POST /api/users  { roleName: "user" }

5. Cuando el accessToken expira (15 min)
   POST /api/auth/refresh → nuevo accessToken

6. Cerrar sesión
   POST /api/auth/logout
```

---

## Agregar nuevos permisos

Para proteger un nuevo endpoint solo se necesita insertar en la base de datos:

```sql
-- 1. Crear el permiso
INSERT INTO permissions (name, description) VALUES ('products:create', 'Crear productos');

-- 2. Asignarlo a un rol (ej: admin tiene id=2)
INSERT INTO role_permissions (roleId, permissionId)
SELECT 2, id FROM permissions WHERE name = 'products:create';
```

Y en la ruta:

```typescript
router.post('/products', authorize('products:create'), createProduct);
```

---

## Respuestas de error comunes

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Campos requeridos faltantes | Body incompleto |
| 401 | Token no proporcionado | Falta el header `Authorization` |
| 401 | Token inválido o expirado | Access token vencido, usar `/refresh` |
| 403 | No tienes permiso | El rol no tiene el permiso requerido |
| 404 | Usuario no encontrado | El ID no existe en la BD |
| 409 | El email ya está registrado | Email duplicado |
