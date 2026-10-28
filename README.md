# Insumap · Frontend (Angular 20)

PWA **mobile first** para la rotación de zonas de inyección de insulina: mapa corporal 3D,
recuperación por microzona, sugerencias, historial, recordatorios, asistente IA y vista del médico.
Consume la API real de `Insumap-backend` (FastAPI).

## Stack

- **Angular 20** (componentes standalone, signals, Reactive Forms)
- **Tailwind CSS 4** (tokens del design system en `src/styles.css`)
- **three.js** para el cuerpo 3D (cargado de forma diferida)
- **@lucide/angular** para iconografía SVG
- **@angular/pwa** (service worker + Web Push con VAPID)
- **openapi-typescript** para los tipos del contrato (`src/app/core/api/api-types.ts`)

## Desarrollo

```bash
npm install
npm start          # http://localhost:4200 (el backend local debe estar en http://localhost:8000)
npm run build      # producción → dist/insumap-frontend/browser
npm run api:types  # regenera los tipos desde http://localhost:8000/openapi.json
npm test           # pruebas unitarias (Karma)
```

El backend local se levanta con su propio `.env` (SQLite, `CORS_ORIGINS` debe incluir
`http://localhost:4200`). Usuarios demo: `paciente@demo.insumap` / `medico@demo.insumap` (clave `Insumap123`).

## Entornos

| Archivo | API |
|---|---|
| `src/environments/environment.ts` | `http://localhost:8000` (desarrollo) |
| `src/environments/environment.production.ts` | `https://insumap-backend.onrender.com` (producción) |

## Estructura

```text
src/app/
├── core/
│   ├── api/        # cliente HTTP tipado + ApiError + api-types (OpenAPI)
│   ├── auth/       # sesión (signals), interceptor con refresh, guards por rol
│   ├── data/       # stores con signals (mapa, historial, recordatorios, vínculos, asistente)
│   ├── push/       # suscripción Web Push (VAPID)
│   ├── ui/         # iconos por macrozona
│   └── util/       # cuerpo (macrozonas), formato de fechas/textos
├── features/
│   ├── auth/       # P01–P03 login, registro, recuperación
│   ├── map/        # P04/P05 mapa 3D + lista, hoja de microzona
│   ├── history/    # P06 historial + exportes
│   ├── doses/      # P07 cronograma y recordatorios
│   ├── assistant/  # P08 asistente IA
│   ├── profile/    # P09 perfil y vínculos
│   └── doctor/     # P10/P11 pacientes y detalle (solo lectura)
└── shared/         # shell responsive, botones, avatar, tarjetas, toast
```

## Despliegue

Vercel con `vercel.json` (build `npm run build`, salida `dist/insumap-frontend/browser`,
rewrites de SPA y sin caché para el service worker).

El botón **Continuar con Google** aparece en el login cuando el backend tiene
`GOOGLE_CLIENT_ID` configurado. El frontend lo consulta en
`GET /api/v1/auth/google/config`; no requiere rebuild al cambiar el Client ID.
