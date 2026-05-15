# Apex Dashboard (Laravel + React)

Backend **Laravel 12**, front **React 19 + Vite 7 + Tailwind CSS 4** (mismo diseño; KPIs, torta y badge del menú vienen de la base de datos).

## Arranque rápido

1. `composer install` (si aún no lo hiciste)
2. Copiar `.env.example` a `.env`, `php artisan key:generate`
3. Crear `database/database.sqlite` si no existe y ejecutar: `php artisan migrate:fresh --seed`
4. Desarrollo: `composer run dev` **o** `php artisan serve` y en otra terminal `npm run dev`
5. Abrir la URL (p. ej. `http://127.0.0.1:8000`).

Para MySQL/PostgreSQL edita `.env` y vuelve a migrar.

**Tailwind:** si añades un `.tsx` con clases nuevas, añade su ruta en `resources/css/app.css` (`@source`).
