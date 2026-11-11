# Testing en React — Nexo Retos (guía para exponer)

## 1. Cómo correrlo
Dentro de `retos-front`:
```
npm install
npm test          # modo "watch": se re-ejecuta al guardar
npm run test:run  # una sola vez (útil para mostrar el resultado)
npm run coverage  # reporte de cobertura
```

## 2. Herramientas y para qué sirve cada una
| Herramienta | Rol |
|---|---|
| **Vitest** | Ejecuta las pruebas (como Jest, pero integrado con Vite) |
| **jsdom** | Simula un navegador dentro de Node (`document`, `window`, `localStorage`) |
| **React Testing Library** | Renderiza componentes y los consulta como los ve el usuario |
| **user-event** | Simula interacciones reales: escribir, hacer clic, teclado |
| **jest-dom** | Matchers legibles: `toBeInTheDocument`, `toBeDisabled`, `toHaveClass`… |

Idea central: **se prueba lo que el usuario ve y hace, no el código interno** (no se prueba el estado, se prueba el texto en pantalla).

## 3. Qué prueba cada archivo (20 archivos)
| Archivo | Técnica que demuestra |
|---|---|
| `EstadoBadge`, `Cargando` | Lo más simple: props → render. `it.each` para varios casos |
| `ConfirmModal` | Eventos (clic, Escape), `vi.fn()` como espía, efectos con limpieza |
| `RetoCard` | Componentes con `<Link>`: se envuelven en `MemoryRouter` |
| `RetoForm` | Formularios: validaciones, foco, `onSubmit` con datos limpios |
| `ProtectedRoute`, `Navbar` | Acceso e interfaz según sesión y rol; **mock del contexto** con `vi.mock` |
| `api.test.js` | Pruebas unitarias sin React; **fetch simulado** (`vi.stubGlobal`) |
| `AuthContext` | Contexto + `localStorage` + evento global `auth:expired` |
| `useCatalogos` | Probar un **hook** con `renderHook` |
| `Login`, `Registro` | Flujo completo: llenar, enviar, éxito, error, estado "cargando" |
| `NuevoReto`, `EditarReto` | Páginas con formulario, rutas con `:id` y navegación después de guardar |
| `DetalleReto` | Vistas distintas por rol: inscribirse, aprobar/rechazar |
| `GestionEntidad`, `GestionUsuarios` | CRUD completo: listar, crear, editar, eliminar con modal, permisos |
| `Dashboard` | **Integración**: varios componentes juntos, filtros, atajo de teclado |
| `App` | **Rutas de toda la app**: login, 404, redirecciones por rol |

## 4. Patrón de una prueba: AAA
```jsx
it('llama onConfirmar al pulsar Confirmar', async () => {
  // Arrange: preparar
  const user = userEvent.setup();
  const onConfirmar = vi.fn();
  render(<ConfirmModal abierto onConfirmar={onConfirmar} ... />);
  // Act: actuar como el usuario
  await user.click(screen.getByRole('button', { name: 'Eliminar' }));
  // Assert: verificar
  expect(onConfirmar).toHaveBeenCalledTimes(1);
});
```

## 5. Conceptos para explicar
- **Consultas** (de más a menos recomendada): `getByRole` → `getByLabelText` → `getByText` → `getByTestId`.
  - `getBy…` falla si no existe · `queryBy…` devuelve `null` (para comprobar que algo NO está) · `findBy…` espera (asíncrono).
- **Mock**: reemplazar una dependencia real (API, contexto) por una falsa para aislar lo que se prueba y no necesitar el backend.
- **Pirámide de pruebas**: muchas unitarias (`api.test.js`, `EstadoBadge`), algunas de integración (`Dashboard`, `App`), pocas end-to-end (Cypress/Playwright, no incluidas).
- **Cobertura**: porcentaje de líneas ejecutadas por las pruebas. Es una guía, no una garantía de calidad.

## 6. Guion de demo (≈10 min)
1. Mostrar el proyecto y plantear el problema: "¿cómo sé que no rompí nada al cambiar código?".
2. Correr `npm run test:run` → todo en verde.
3. Abrir `EstadoBadge.test.jsx` (el más simple) y explicar AAA.
4. Abrir `RetoForm.test.jsx`: explicar validaciones.
5. **Demostración en vivo**: en `RetoForm.jsx` cambia un mensaje de error (por ejemplo `'Elige la empresa.'` → `'Falta empresa'`), guarda y mira cómo `npm test` en modo watch marca rojo. Revierte y vuelve el verde.
6. Mostrar `Dashboard.test.jsx` y `App.test.jsx` como pruebas de integración y correr `npm run coverage`.

## 7. Preguntas que te pueden hacer
- **¿Por qué no usar `getByTestId` siempre?** Porque acopla las pruebas al código; `getByRole` además verifica accesibilidad.
- **¿Qué diferencia hay entre unitaria e integración?** Unitaria prueba una pieza aislada; integración prueba varias juntas (Dashboard + RetoCard + modal).
- **¿Por qué se mockea la API?** Las pruebas deben ser rápidas y repetibles, sin depender del servidor ni de la base de datos.
- **¿Por qué `fireEvent.submit` en `Registro.test.jsx`?** El input tiene `minLength={8}` y el navegador bloquearía el envío antes de llegar al `onSubmit`; así se prueba la validación propia del componente.
- **¿Y el backend?** Estas pruebas cubren solo el front (el backend se simula). El backend se probaría aparte, con Vitest/Jest + Supertest.
