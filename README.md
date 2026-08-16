# Fisio App

PWA para gestionar agenda e ingresos de una fisioterapeuta independiente (atención a domicilio, adultos mayores, zona Suba - Bogotá).

## Stack

- **Frontend**: React + TypeScript + Vite, Zustand, `vite-plugin-pwa`
- **Backend**: Go + SQLite (`modernc.org/sqlite`, sin CGO) → binario único
- **Despliegue objetivo**: Oracle Cloud Free

## Configuración

Antes de arrancar, copia las plantillas de variables de entorno:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env   # opcional: el frontend no requiere variables por ahora
```

Ningún `.env` real se sube al repositorio (están en `.gitignore`) — solo los `.env.example`, que sirven de plantilla. Variables del backend (ver `backend/.env.example` y `internal/shared/config/config.go`):

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8080` | Puerto HTTP |
| `DB_PATH` | `./app.db` | Ruta del archivo SQLite |
| `APP_ENV` | `development` | `development` \| `production` |

La base de datos **se crea sola** al arrancar el servidor: las migraciones (`backend/migrations/`) corren automáticamente contra la ruta indicada en `DB_PATH`. No hace falta crear el archivo ni correr nada manualmente antes.

`app.db` (y sus archivos derivados `*.db-shm`/`*.db-wal`) **nunca se incluyen en el repositorio** — están en `.gitignore` a propósito porque en producción contienen datos clínicos reales de pacientes. Lo único versionado es el esquema (`migrations/0001_init.sql`) y un seed opcional con datos 100% ficticios (`migrations/0002_seed_dev.sql`).

## Desarrollo

Orden para levantar el proyecto en local:

1. Backend (puerto 8080)
2. Frontend (puerto 5173)
3. Seed de datos ficticios (opcional, solo la primera vez)

Dos procesos en paralelo:

```bash
# Terminal 1 - backend (puerto 8080)
cd backend
go run ./cmd/server

# Terminal 2 - frontend (puerto 5173, proxy /api -> :8080)
cd frontend
pnpm install
pnpm dev
```

Para cargar datos de ejemplo la primera vez (solo en `APP_ENV=development`, que es el valor por defecto):

```bash
cd backend
go run ./cmd/server -seed
```

## Producción (VM ARM64 - Oracle Cloud free tier)

Desde Windows, un solo comando hace todo el flujo (build del frontend, copia a
`backend/web/` para el embed, y cross-compile a `linux/arm64`):

```powershell
.\build-prod.ps1
```

Deja el binario listo en `dist-server\server`, compilado para `GOOS=linux
GOARCH=arm64` con el frontend ya embebido (`embed.FS`). Subirlo a la VM (ej.
`scp`), darle permisos de ejecución (`chmod +x server`) y correrlo con
`APP_ENV=production` definido como variable de entorno (por ejemplo en el
`Environment=` del servicio systemd) — el binario no trae el entorno
hardcodeado, lo respeta desde el proceso.

El binario sirve el frontend embebido (`embed.FS`) y expone la API en `/api/*`.

## Estructura

Monorepo feature-based. Ver `backend/internal/` y `frontend/src/features/`. Cada feature del backend expone `model.go`, `repository.go`, `service.go`, `handler.go`, `routes.go`; ninguna feature del frontend importa de otra, solo de `shared/`.
