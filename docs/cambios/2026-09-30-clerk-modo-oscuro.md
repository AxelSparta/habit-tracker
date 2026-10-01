# Clerk en modo oscuro (mismos colores que el sitio)

**Fecha:** 2026-09-30
**Rama:** main

## Resumen
Los componentes de Clerk (login, registro, menú de usuario) se veían siempre en modo claro. Ahora usan los mismos tokens de color que el resto del sitio y siguen el modo claro/oscuro del sistema.

## Cambios

### `src/app/layout.tsx`
- Se agregó `clerkAppearance` (línea 20) y se pasa a `<ClerkProvider appearance={...}>`. Cada variable de Clerk (`colorBackground`, `colorForeground`, `colorPrimary`, `colorInput`, etc.) apunta a una variable CSS del sitio.
- `colorBorder` usa `var(--foreground)`.
- **Por qué no el tema `dark` de Clerk:** ese tema es siempre oscuro, tiene su propia paleta y requiere otro paquete (`@clerk/ui`). Con variables CSS, el cambio de modo lo hace el `@media (prefers-color-scheme: dark)` que ya existía, y los colores quedan iguales a los del sitio.
- **Por qué `colorBorder` = color del texto:** Clerk le aplica una transparencia propia (~11%) al borde. Con nuestro `--border`, que ya es suave, el borde quedaba invisible.

### `src/app/globals.css`
- `color-scheme: light` / `dark` en `:root` (líneas 4 y 25). Así también los controles nativos (scrollbars, autofill) siguen el modo.
- Alias `--app-accent: var(--accent)` (línea 50).
- **Por qué el alias:** Clerk define internamente variables con nombres genéricos (`--accent`, `--border`) dentro de sus componentes y pisa las nuestras. Por eso el botón principal tenía fondo transparente. El alias se resuelve en `:root`, antes de entrar a Clerk, y sigue el modo porque `--accent` cambia en el media query.

## Conceptos clave
- **Las variables CSS se resuelven en el elemento donde se usan.** Si un componente redefine `--accent`, todo lo que haya adentro ve *ese* valor. En cambio, `--app-accent: var(--accent)` declarado en `:root` guarda el valor ya calculado y lo hereda hacia abajo, y Clerk no lo pisa porque no conoce ese nombre.

## Verificación
- Capturas con Playwright de `/sign-in` en modo oscuro y claro (sobre tu `next dev` en :3000): el fondo, la tarjeta, el input, el botón azul, los bordes y el divisor se ven bien en ambos.
- Se inspeccionaron los estilos calculados: el botón pasó de `rgba(0,0,0,0)` a `rgb(42,120,214)` (el `--accent`).
- `npm run lint` y `npm run typecheck` → sin errores.

## Pendientes / riesgos
- No se revisó visualmente el popover del `<UserButton>` ni la pantalla de perfil, porque requieren una sesión iniciada. Usan las mismas variables, así que deberían verse igual.
