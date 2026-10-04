# Haxball Kits — Especificación

## 1. Objetivo

Extensión de Chrome para Haxball (juego de navegador). El usuario crea camisetas
(colores de equipo), las guarda localmente, opcionalmente las publica en una
comunidad, y puede aplicar cualquiera al equipo Red o Blue con un clic. Aplicar
significa escribir y enviar en el chat del juego el comando `/colors`.

Las reglas de arquitectura, stack y convenciones están en
`.github/copilot-instructions.md`.

## 2. Alcance

**Dentro:**

- Popup con 4 pestañas: Mis camisetas, Crear, Comunidad, Favoritos.
- Crear camisetas con preview en tiempo real.
- Guardar, listar, borrar camisetas propias (localStorage).
- Publicar camisetas propias en la comunidad y listar las de la comunidad.
- Favoritos (propias y de la comunidad).
- Aplicar una camiseta a Red o Blue en el juego.
- Dos implementaciones intercambiables del servicio de comunidad: mock y http.

**Fuera de alcance (no implementar):**

- Usuarios, login, perfiles, likes, comentarios, búsqueda, filtros u orden
  configurable.
- Editar una camiseta existente.
- `/colors <team> clear` y cualquier otro comando de Haxball.
- Sincronización entre dispositivos.
- Content scripts, background/service worker, side panel, páginas de opciones.
- El backend real.

## 3. Dominio

Los colores se guardan como hex `#RRGGBB` en mayúsculas (es lo que devuelve
`<input type="color">`). Solo al construir el comando se convierten a `RRGGBB`
sin `#`.

```ts
type Team = "red" | "blue";
type HexColor = string; // '#RRGGBB'

interface Shirt {
  id: string; // UUID v4 generado en el cliente
  name: string; // 1..24 caracteres, sin espacios al inicio/fin
  angle: number; // entero, 0..359
  textColor: HexColor; // color del texto/avatar de los jugadores
  colors: HexColor[]; // longitud 1..3
  createdAt: number; // epoch ms
}

// Registro local de una camiseta propia
interface OwnShirt extends Shirt {
  published: boolean;
  ownerToken?: string; // lo devuelve la comunidad al publicar; permite borrarla después
}

type NewShirt = Omit<Shirt, "id" | "createdAt">;
```

Reglas de identidad: **una camiseta publicada conserva el mismo `id` en local y
en la comunidad.** Así una camiseta propia publicada no se duplica en favoritos
y el borrado en cascada es directo.

### Comando de Haxball

Formato oficial: `/colors <team> <angle> <textColor> <color1> [color2] [color3]`

- `team`: `red` o `blue`.
- `angle`: grados, 0 a 360.
- Colores en hexadecimal `RRGGBB`, sin `#`.
- El color de texto es obligatorio en la práctica; hay entre 1 y 3 colores de
  camiseta, y se dibujan como franjas del mismo ancho.
- Solo los admins de la sala pueden ejecutar el comando.

Ejemplos (para tests de `buildColorsCommand`):

| Entrada                                                                       | Salida                                       |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| team `red`, ángulo 0, texto `#FF0000`, colores `[#FFFFFF]`                    | `/colors red 0 FF0000 FFFFFF`                |
| team `red`, ángulo 45, texto `#000000`, colores `[#FFFFFF, #FF0000]`          | `/colors red 45 000000 FFFFFF FF0000`        |
| team `red`, ángulo 60, texto `#FFFFFF`, colores `[#0080FF, #004077, #002033]` | `/colors red 60 FFFFFF 0080FF 004077 002033` |

## 4. Reglas de datos

**Mis camisetas** (`ShirtRepository`, localStorage, clave `hk:shirts:v1`): lista
de `OwnShirt`, más nuevas primero.

**Favoritos** (`FavoritesRepository`, localStorage, clave `hk:favorites:v1`):
lista de entradas
`{ shirt: Shirt, source: 'own' | 'community', addedAt: number }`. Se guarda un
snapshot completo de la camiseta, de modo que la pestaña Favoritos se renderiza
sin red. Las camisetas son inmutables (no se editan), por lo que el snapshot no
se desactualiza. La identidad de un favorito es `shirt.id`.

**Comunidad** (`CommunityService`): lista paginada desde el servidor; publicar;
borrar.

**Publicar**: `community.publish(shirt)` devuelve `{ ownerToken }`. Se marca
`published: true` y se guarda el token en el registro local.

**Borrar una camiseta propia** (caso de uso `deleteOwnShirt`), en este orden:

1. Si `published`, pedir `community.remove(id, ownerToken)`. Si falla,
   **abortar**, no borrar nada y mostrar error con opción de reintentar.
2. Quitar de favoritos por `id` (si estaba).
3. Quitar del repositorio local.

Borrar solo se ofrece en las camisetas propias. En Comunidad y Favoritos, el
botón de borrar aparece únicamente si la camiseta es propia (`source: 'own'` o
`id` presente en el repositorio local); si no, en Favoritos el botón es "quitar
de favoritos" (equivale a desmarcar la estrella).

**Camisetas de la comunidad borradas por su autor** que estén en favoritos:
permanecen en el snapshot hasta que el usuario las quite. No se hace chequeo
remoto.

## 5. Puertos (en `application/ports.ts`)

```ts
interface ShirtRepository {
  list(): Promise<OwnShirt[]>;
  add(shirt: OwnShirt): Promise<void>;
  update(shirt: OwnShirt): Promise<void>;
  remove(id: string): Promise<void>;
}

interface FavoritesRepository {
  list(): Promise<FavoriteEntry[]>;
  add(entry: FavoriteEntry): Promise<void>;
  remove(id: string): Promise<void>;
}

interface Page<T> {
  items: T[];
  total: number;
}

interface CommunityService {
  list(params: { page: number; pageSize: number }): Promise<Page<Shirt>>; // page empieza en 1
  publish(shirt: Shirt): Promise<{ ownerToken: string }>;
  remove(id: string, ownerToken: string): Promise<void>;
}

type GameBridgeResult =
  | { ok: true }
  | { ok: false; reason: "NO_HAXBALL_TAB" | "CHAT_NOT_FOUND" | "UNEXPECTED" };

interface GameBridge {
  sendChatCommand(command: string): Promise<GameBridgeResult>;
}
```

### Implementaciones del servicio de comunidad

Se elige en `composition.ts` con `VITE_COMMUNITY_BACKEND=mock|http` (por defecto
`mock`). Cambiar de una a otra no debe requerir tocar nada fuera de
`composition.ts`.

- `MockCommunityService`: datos en memoria con persistencia opcional en
  localStorage (`hk:mock-community:v1`), semilla de ~30 camisetas variadas (1, 2
  y 3 colores, distintos ángulos) para ejercitar la paginación, latencia
  simulada de 300 a 600 ms, `ownerToken` generado igual que lo haría el backend,
  y mismas reglas de error que el http (por ejemplo `NOT_FOUND` o token inválido
  al borrar).
- `HttpCommunityService`: base URL desde `VITE_API_BASE_URL`. Contrato propuesto
  (el backend todavía no existe y se ajustará a esto):
  - `GET /shirts?page=1&pageSize=12` → `200 { items: Shirt[], total: number }`,
    orden por `createdAt` descendente.
  - `POST /shirts` con body `Shirt` → `201 { ownerToken: string }`.
  - `DELETE /shirts/:id` con header `X-Owner-Token` → `204`.
  - Errores: `{ error: string }` con el status correspondiente. Traducir a
    `AppError`.

Sin usuarios, el `ownerToken` es lo que evita que cualquiera borre camisetas
ajenas.

## 6. Interfaz

### 6.1 Popup

- Tamaño fijo **500 × 600 px**. Chrome limita los popups a 800 × 600, así que
  600 de alto es el máximo; no depender de más.
- Estructura vertical: header con logo (44 px) → barra de pestañas (40 px) →
  contenido (el resto).
- El popup nunca scrollea. Cada pestaña tiene alto fijo y **solo scrollea el
  área de la grilla**; la paginación queda fija abajo, fuera del scroll.
- El logo es un placeholder (SVG simple + texto "Haxball Kits") en un componente
  `Logo` fácil de reemplazar.

### 6.2 Pestañas

Mis camisetas · Crear · Comunidad · Favoritos. Cambiar de pestaña cambia la
vista debajo. Pestaña inicial: Mis camisetas. Al cambiar de pestaña la
paginación vuelve a la página 1.

### 6.3 Grilla y paginación

- 3 columnas. 12 elementos por página.
- Objetivo: ver **3 filas completas (9 camisetas) sin scroll** dentro de la
  grilla. Con 500 × 600 el espacio útil es aproximadamente 460 px de alto, o sea
  unos 148 px por fila incluyendo el gap, y unos 155 px de ancho por card. Si no
  entra con todos los elementos, la prioridad es: preview, nombre, botones
  Red/Blue; el botón de borrar pasa a ser compacto (ícono con texto corto) pero
  se mantiene.
- Paginación: "‹ Anterior · Página X de Y · Siguiente ›", fija abajo (40 px).
  Deshabilitada si hay una sola página.
- Mis camisetas y Favoritos paginan en el cliente. Comunidad pagina en el
  servidor con `list({ page, pageSize: 12 })`.
- Si al borrar queda vacía la página actual y no es la primera, ir a la
  anterior.

### 6.4 Card de camiseta (`ShirtCard`)

De arriba hacia abajo:

1. **Preview** (ver 6.6). Arriba a la derecha, botón flotante de favorito
   (estrella; llena si está en favoritos). Arriba a la izquierda, en Mis
   camisetas, un indicador de publicación: ícono de globo, relleno si
   `published`; si no está publicada, es un botón para publicarla (con
   confirmación simple).
2. **Nombre** (una línea, truncado con elipsis).
3. **Dos botones: `Red` y `Blue`**, lado a lado, con el color del equipo como
   acento. Al hacer clic aplican la camiseta a ese equipo en el juego.
4. **Botón borrar** (ver regla de borrado en la sección 4). En Mis camisetas
   pide confirmación antes de ejecutar y avisa si estaba publicada ("También se
   borrará de la comunidad").

Feedback al aplicar: mensaje breve no bloqueante (toast) dentro del popup.
Éxito: "Camiseta aplicada a Red". Errores: sin pestaña de Haxball, no se
encontró el chat, error inesperado (textos en `strings.ts`). Junto al feedback,
una nota fija pequeña en la vista: "El comando /colors solo funciona si sos
admin de la sala."

### 6.5 Vista Crear

Layout de arriba hacia abajo (si excede el alto, scrollea solo esta vista):

1. Preview grande en tiempo real, con el texto de muestra "10" en `textColor`.
2. Nombre (input de texto, 1 a 24 caracteres, contador).
3. Ángulo: slider 0–359 sincronizado con input numérico.
4. Color de texto (`<input type="color">` + hex editable).
5. Colores de camiseta: lista de 1 a 3 selectores; botón "Agregar color"
   (hasta 3) y quitar (hasta 1).
6. Línea de solo lectura con el comando resultante para `red` (fuente
   monoespaciada), para poder compararlo con el juego.
7. Switch "Publicar en la comunidad" (apagado por defecto).
8. Botón "Guardar camiseta". Validación en línea; deshabilitado si hay errores.

Al guardar: se agrega a Mis camisetas, se publica si el switch estaba activo, se
muestra confirmación y se cambia a la pestaña Mis camisetas. Si la publicación
falla, la camiseta se guarda igual como no publicada y se avisa del error.

### 6.6 Preview de camiseta (`ShirtPreview`)

- Es un **círculo** (así se ve en Haxball: el disco del jugador), hecho solo con
  HTML y CSS.
- Franjas del mismo ancho, una por color, con `linear-gradient` de cortes duros.
  Ejemplo para 3 colores:
  `linear-gradient(<deg>, c1 0 33.333%, c2 33.333% 66.666%, c3 66.666% 100%)`.
  Con 1 color es sólido.
- Texto centrado en `textColor`.
- Hipótesis de ángulo (**a calibrar contra el juego**): en Haxball ángulo 0
  produce franjas verticales y 90 horizontales. En CSS, `90deg` produce franjas
  verticales. Por eso `cssAngle = haxballAngle + ANGLE_OFFSET` con
  `ANGLE_OFFSET = 90`, definido como una única constante exportada con
  `TODO(verify)`. El sentido de giro (horario/antihorario) también hay que
  confirmarlo; encapsular la conversión en una función `toCssAngle(angle)`.
- Tamaños: el componente recibe `size` por prop (card ≈ 64 px, vista Crear ≈ 120
  px).

### 6.7 Estados

Cada vista de lista implementa: cargando (skeleton simple), vacío (mensaje +
acción sugerida, por ejemplo en Mis camisetas un botón "Crear tu primera
camiseta"), y error con botón "Reintentar" (relevante sobre todo en Comunidad).

### 6.8 Diseño visual (propuesta, ajustable; vivir en `tokens.css`)

Tema oscuro, sobrio, parecido en espíritu a la interfaz del juego.

| Token          | Valor     |
| -------------- | --------- |
| `--bg`         | `#14181F` |
| `--surface`    | `#1D232D` |
| `--surface-2`  | `#262E3A` |
| `--border`     | `#2C3542` |
| `--text`       | `#E6E9EF` |
| `--text-muted` | `#8B95A5` |
| `--red`        | `#D64545` |
| `--blue`       | `#3F7BE0` |
| `--fav`        | `#F5C451` |
| `--danger`     | `#E5484D` |

Espaciado base 8 px; radios 8 px (cards) y 6 px (botones); tipografía del
sistema (`system-ui`), 12–13 px en cards, 14 px en el resto. Transiciones suaves
y cortas (≤150 ms).

## 7. Aplicar en el juego (`ChromeGameBridge`)

Desde el popup, sin content script:

1. `chrome.tabs.query({ active: true, currentWindow: true })` para la pestaña
   activa. Si su URL no es de `haxball.com`, devolver `NO_HAXBALL_TAB`.
2. `chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: injectedSendChat, args: [command] })`.
   El juego corre dentro de un iframe, por eso `allFrames`.
3. `injectedSendChat` es una función **autocontenida** (sin imports ni variables
   externas, se serializa): busca el input del chat en `document`; si no existe
   en ese frame, devuelve `{ found: false }`. Si existe, asigna el valor usando
   el setter nativo de `HTMLInputElement`, dispara `input`, y luego simula Enter
   (`keydown`, `keypress`, `keyup` con `key: 'Enter'`, `keyCode: 13`) para
   enviarlo.
4. Del arreglo de resultados por frame: si alguno envió, `{ ok: true }`; si
   ninguno encontró el input, `CHAT_NOT_FOUND`; si hubo excepción, `UNEXPECTED`.

Cosas que **no se pueden dar por ciertas sin probar en el juego** (marcar con
`TODO(verify)` y centralizar en constantes):

- `CHAT_INPUT_SELECTOR`: hipótesis inicial `input[data-hook="input"]`;
  alternativa: el primer `input` del documento del iframe del juego (clase
  `gameframe`).
- Si simular Enter envía el mensaje; si no, dejar el comando escrito en el input
  y avisar al usuario que presione Enter.
- Si el input necesita foco antes de escribir.

`ConsoleGameBridge` (modo `npm run dev`, sin `chrome.*`): hace `console.log` del
comando y devuelve `{ ok: true }`. `composition.ts` lo elige cuando
`chrome.scripting` no existe.

## 8. Manifest (`public/manifest.json`)

```json
{
  "manifest_version": 3,
  "name": "Haxball Kits",
  "version": "0.1.0",
  "action": { "default_popup": "index.html" },
  "permissions": ["scripting"],
  "host_permissions": ["*://*.haxball.com/*"],
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  }
}
```

- Permisos mínimos. No agregar `tabs`, `storage` ni `activeTab` sin necesidad
  justificada.
- Sin código remoto ni scripts inline (CSP de MV3).
- Cuando exista el backend, su origen se agrega a `host_permissions`.
- Íconos: placeholders simples generados por el agente; los reemplazo yo.

## 9. Etapas de implementación

Una etapa por vez; al terminar cada una correr typecheck, tests y build, y
resumir.

1. **Base**: scaffolding Vite + React + TS, tokens, layout 500×600 con header y
   pestañas vacías, `strings.ts`, `manifest.json`. Verificar que carga como
   extensión sin empaquetar.
2. **Dominio y aplicación**: tipos, validaciones, utilidades de color,
   `buildColorsCommand`, puertos, casos de uso (incluido el borrado en cascada)
   y tests de unidad.
3. **Infraestructura**: repositorios localStorage, mock y http de comunidad,
   `ConsoleGameBridge`, `composition.ts` con selección por variable de entorno.
4. **Componentes compartidos**: `ShirtPreview`, `ShirtCard`, grilla, paginación,
   estados (cargando, vacío, error), toast.
5. **Listas**: Mis camisetas, Comunidad, Favoritos, conectadas a los casos de
   uso.
6. **Crear**: formulario con preview en tiempo real, validación, guardado y
   publicación opcional.
7. **Juego**: `ChromeGameBridge` y prueba manual en Haxball. Listar todos los
   `TODO(verify)`.
8. **Pulido**: accesibilidad, textos, revisión de estados de error.

## 10. Supuestos y decisiones abiertas

Mientras no se indique otra cosa, el agente asume lo siguiente (si alguno no le
cierra al usuario, se cambia acá):

1. La preview es un círculo (disco de Haxball), no una silueta de camiseta.
2. Aplicar = escribir **y enviar** el comando. Si no se puede enviar, se deja
   escrito.
3. Los colores se guardan como hex `#RRGGBB`, no como objetos RGB.
4. Publicar se puede hacer al crear (switch) o después desde la card en Mis
   camisetas.
5. El borrado de una camiseta publicada exige que el borrado remoto tenga éxito.
6. Favoritos guardan snapshot completo y usan el `id` compartido.
7. Almacenamiento en `localStorage` detrás de repositorios asíncronos, para
   poder migrar a `chrome.storage.local` cambiando un archivo.
8. Camisetas ordenadas de más nueva a más vieja en todas las listas.

## 11. Criterios de aceptación globales

- `npm run typecheck`, `npm test` y `npm run build` pasan sin errores ni
  warnings nuevos.
- La UI funciona en `npm run dev` con el mock, sin extensión ni backend.
- Cambiar `VITE_COMMUNITY_BACKEND` entre `mock` y `http` no requiere ningún otro
  cambio de código.
- Ningún componente de `ui/` importa de `infrastructure/`, y `domain/` no
  importa nada de React, `window` ni `chrome`.
- El popup mide exactamente 500 × 600 y solo scrollea el área de la grilla (o la
  vista Crear).
- Con 12 camisetas en una página se ven 9 sin scroll en la grilla (las otras 3
  con scroll interno), cumpliendo la prioridad de contenido de la sección 6.3.
- La preview de la vista Crear se actualiza al instante con cada cambio.
- Borrar una camiseta propia la quita de favoritos y de la comunidad (si estaba
  publicada), verificado con tests.
- El manifest declara solo `scripting` y el host de `haxball.com`.
