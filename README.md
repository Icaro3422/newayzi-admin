# Newayzi Admin

Panel de administración de Newayzi. Aplicación Next.js independiente con las mismas fuentes (Sora, Heebo), librerías (Tailwind, HeroUI, Clerk) y estilos de marca que el frontend principal.

## Requisitos

- Node.js 18+
- [Bun](https://bun.sh)


## Configuración

1. Copiar variables de entorno:
   ```bash
   cp .env.local.example .env.local
   ```
2. Configurar `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY` (puedes usar la misma aplicación Clerk que el frontend o una dedicada para admin).

## Desarrollo

```bash
bun install
bun run dev
```

La app corre en **http://localhost:3001** para no chocar con el frontend (puerto 3000).

## Rutas

- `/` — Redirige a `/admin` si estás autenticado o a `/sign-in` si no.
- `/sign-in`, `/sign-up` — Clerk.
- `/admin` — Dashboard (protegido).
- `/admin/properties` — Propiedades.
- `/admin/connections` — Conexiones PMS.
- `/admin/operators` — Operadores.
- `/admin/availability` — Disponibilidad.
- `/admin/payments` — Pagos.
- `/admin/users` — Usuarios.

## API backend

Configura `NEXT_PUBLIC_API_URL` (ej. `http://localhost:8000`) para que el panel llame al backend Django. Si no hay backend o no existe `GET /api/admin/me/`, el panel asume rol **super_admin** para desarrollo y todas las pantallas son accesibles. Cuando el backend implemente el plan (roles en Profile, Operator, endpoints admin), el panel usará los datos reales.

## Estructura

- `src/app/` — App Router (layout raíz, sign-in/up, admin).
- `src/components/` — Providers (Clerk, HeroUI), shell del admin.
- `src/contexts/AdminContext.tsx` — Sesión admin (me), permisos por rol.
- `src/lib/admin-api.ts` — Cliente API y tipos (alineado con ADMIN_PLAN).
- Misma identidad visual que newayzi-frontend: Sora/Heebo, colores Newayzi (han-purple, majorelle, etc.), Tailwind + HeroUI.
