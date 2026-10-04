# Haxball Kits — instrucciones para el agente

Extensión de Chrome (Manifest V3) para el juego Haxball. Permite crear, guardar, publicar y aplicar "camisetas" (colores de equipo) dentro del juego.

**La especificación funcional y visual está en `docs/SPEC.md`. Leela completa antes de planificar y respetala.**

## Stack

- Vite + React 18 + TypeScript en modo `strict` (template oficial `react-ts`).
- CSS vanilla. Se permiten CSS Modules (`*.module.css`). Nada de Tailwind ni librerías de UI o de componentes.
- Tests con Vitest, solo para `domain` y `application`.
- No agregues dependencias sin pedirme confirmación primero. Para IDs usá `crypto.randomUUID()`.
- Un solo entry point: el popup. No hay content scripts ni background: el juego se controla con `chrome.scripting.executeScript` desde el popup.

## Arquitectura (regla principal: separar UI de lógica)

Capas y dependencias permitidas:

```
ui  ──►  application  ──►  domain
              ▲
infrastructure ┘  (implementa los puertos definidos en application)
```

- `domain`: tipos y funciones puras. Sin React, sin `window`, sin `chrome.*`, sin `localStorage`, sin `fetch`.
- `application`: casos de uso y puertos (interfaces). Recibe los puertos por inyección; no importa nada de `infrastructure` ni de `ui`.
- `infrastructure`: adaptadores concretos (localStorage, mock, http, chrome). Es el único lugar donde se toca `localStorage`, `fetch` o `chrome.*`.
- `ui`: componentes React. Habla con la lógica solo a través de hooks que consumen los casos de uso. Nunca importa de `infrastructure`.
- `src/composition.ts` es el único lugar que elige e instancia implementaciones (por ejemplo mock vs http según variables de entorno).
- Todos los puertos son asíncronos (devuelven `Promise`), incluso los de localStorage, para poder cambiar el almacenamiento sin tocar el resto.

## Estructura de carpetas

```
public/
  manifest.json
  icons/
src/
  domain/
    shirt.ts              # tipos Shirt, Team, validaciones
    color.ts              # utilidades de color (hex <-> formato del comando)
    haxballCommand.ts     # buildColorsCommand(shirt, team)
  application/
    ports.ts              # ShirtRepository, FavoritesRepository, CommunityService, GameBridge
    shirtUseCases.ts      # crear, borrar (con cascada), publicar, favoritos, aplicar
    pagination.ts
  infrastructure/
    storage/              # LocalStorage*Repository
    community/            # MockCommunityService, HttpCommunityService, seed
    game/                 # ChromeGameBridge, ConsoleGameBridge (modo dev sin extensión)
  ui/
    App.tsx
    strings.ts            # todos los textos visibles, en español
    hooks/
    components/
    views/                # MyShirtsView, CreateView, CommunityView, FavoritesView
    styles/               # tokens.css, base.css
  composition.ts
  main.tsx
docs/
  SPEC.md
index.html
```

## Convenciones

- Código, identificadores y comentarios en inglés. Textos visibles al usuario en español, centralizados en `src/ui/strings.ts`.
- Componentes funcionales, exports nombrados, un componente por archivo, props tipadas.
- Sin `any`, sin `// @ts-ignore`.
- Los errores de los servicios se modelan con una clase `AppError` con un `code` (por ejemplo `NETWORK`, `NOT_FOUND`, `STORAGE`). La UI los traduce a mensajes.
- Leer de localStorage siempre con parseo seguro: JSON corrupto o ausente devuelve estado vacío, nunca rompe la app. Las claves llevan versión (`hk:shirts:v1`).
- Accesibilidad básica: botones solo-ícono con `aria-label`, foco visible, tabs con `role="tablist"` y navegación por teclado.
- Íconos como SVG inline simples.
- Colores y tamaños siempre desde los tokens de `src/ui/styles/tokens.css`, nunca valores sueltos en los componentes.

## Cómo trabajar

- Trabajá por las etapas definidas en `docs/SPEC.md`. Al terminar cada etapa corré `npm run typecheck`, `npm test` y `npm run build`, y resumí qué cambió y qué falta.
- No agregues funcionalidades que no estén en la spec (ver "Fuera de alcance"). Si algo es ambiguo o contradictorio, preguntame antes de asumir.
- Diffs chicos y enfocados. No reformatees ni reorganices archivos que no estés tocando.
- No modifiques `docs/SPEC.md` ni este archivo sin pedírmelo. Si detectás un problema en la spec, avisame.
- Todo lo que dependa del DOM real de Haxball o de cómo el juego dibuja las camisetas se marca con `TODO(verify)` en el código y se lista al final de la etapa. No lo des por funcionando sin que yo lo pruebe en el juego.

## Comandos

- `npm run dev`: UI en el navegador, sin la extensión (usa `ConsoleGameBridge` y el servicio mock).
- `npm run build`: genera `dist/` para cargar como extensión sin empaquetar.
- `npm run typecheck`: `tsc --noEmit`. Agregá el script si falta.
- `npm test`: Vitest.