# Nexo Retos — Front (React + Bootstrap)

## Cómo correrlo
1. `npm install`
2. Si el backend no está en `http://localhost:3001`, configura su URL en `BACKEND_URL`.
3. `npm run dev`

En desarrollo, Vite redirige `/api/*` a tu backend, así no hay problemas de CORS.
El front asume que el backend monta sus rutas bajo `/api` (`/api/auth/login`, `/api/retos`, ...).
Si usas otro prefijo, cambia `BASE` en `src/services/api.js` (o define `VITE_API_URL`).

## Estructura
- `src/pages/`          una página por ruta
- `src/components/`     piezas reutilizables (Navbar, Layout, RetoCard, RetoForm, ConfirmModal...)
- `src/context/`        sesión del usuario (AuthContext)
- `src/hooks/`          useCatalogos (empresas, categorías, prioridades)
- `src/services/api.js` TODAS las llamadas al backend

## Rutas
| Ruta              | Página      | Privada |
|-------------------|-------------|---------|
| /login            | Login       | no      |
| /registro         | Registro    | no      |
| /                 | Dashboard   | sí      |
| /retos/nuevo      | NuevoReto   | sí      |
| /retos/:id        | DetalleReto | sí      |
| /retos/:id/editar | EditarReto  | sí      |
| /gestion/empresas | Gestión     | sí      |
| /gestion/categorias | Gestión   | sí      |
| /gestion/prioridades | Gestión  | sí      |
| /gestion/usuarios | Gestión     | sí      |
| /gestion/registros | Gestión    | sí      |

Los permisos se aplican tanto en la interfaz como en el backend:

- **Administrador:** CRUD de retos, empresas, categorías, prioridades, usuarios e inscripciones.
- **Evaluador:** publica retos, crea empresas/categorías/prioridades e inscripciones, y revisa el estado de las inscripciones.
- **Participante:** consulta retos y catálogos, y puede inscribirse a un reto abierto. Solo puede consultar sus propias inscripciones.

El enlace a la gestión de usuarios no aparece en la navegación; el administrador accede desde su panel en la página de retos.

### Crear la primera cuenta de administrador

`npm run create-admin` necesita las tres variables de entorno. Ejecutarlo solo desde CMD no basta: usa PowerShell y ejecuta el bloque completo en la misma ventana (primero cambia a la carpeta `backend-nexos-retos`). No guardes la contraseña en el repositorio:

```powershell
$env:ADMIN_NAME = "Simon"
$env:ADMIN_EMAIL = "admin@admin.com"
$securePassword = Read-Host "Contraseña (mínimo 12 caracteres)" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run create-admin
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
}
```

La cuenta se crea con rol Administrador. Si el correo ya pertenece a un administrador sin credenciales (por ejemplo, un perfil de demostración), el comando configura su contraseña sin cambiar el rol. No cambia cuentas de otros roles ni restablece contraseñas ya configuradas.

## Pruebas (Vitest + React Testing Library)
```
npm install
npm test          # modo watch
npm run test:run  # una sola ejecución
npm run coverage  # cobertura
```
Cada prueba vive junto al archivo que prueba (`Componente.test.jsx`). La configuración está en `vite.config.js` (bloque `test`) y `src/test/setup.js`. Guía completa en `../TESTING.md`.
