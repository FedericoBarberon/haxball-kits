# Haxball Kits — Backend: especificación para generar tests (TDD)

Este archivo se carga **solo** para generar tests del backend, por etapas. El
agente escribe los tests y yo (el usuario) escribo la implementación, para
practicar TDD.

## 0. Reglas del agente

1. Escribir **solo** archivos `*_test.go` y, en la etapa 3, el paquete auxiliar
   de la suite de contrato del repositorio. **Nunca** escribir ni modificar
   código de producción, ni siquiera stubs. Si a un test le falta un símbolo
   para compilar, decírmelo: yo lo creo.
2. Una etapa por vez (sección 6). No avanzar a la siguiente hasta que lo pida.
3. Al empezar cada etapa, antes de escribir código:
   - Listar la **API que los tests asumen** (paquetes, nombres, firmas,
     errores).
   - Listar los **casos de test** (nombre y qué verifica cada uno).
   - Esperar mi confirmación. Yo ajusto la API o creo los stubs mínimos.
4. Probar **comportamiento a través de la API pública**, no detalles internos.
5. Solo librería estándar (`testing`, `net/http/httptest`, `errors`, etc.). Sin
   testify ni frameworks de mocks. Los fakes se escriben a mano en el archivo de
   test.
6. Tests table-driven con `t.Run` cuando haya varios casos de una misma regla.
   En los casos de validación, **un solo campo inválido por caso**, para no
   depender del orden de validación.
7. Tests deterministas: sin `time.Sleep`, sin depender del reloj real ni de
   aleatoriedad no controlada.
8. Nombres: `Test<Unidad>_<Comportamiento>`, en inglés. Comentarios opcionales,
   en español.
9. Los errores se verifican con `errors.Is` / `errors.As`, nunca comparando
   strings.
10. Todo lo marcado como **pendiente** (sección 8) no se asume: preguntarme, o
    escribir el test con `t.Skip("pending decision: ...")`.
11. No cubrir lo que figura en "Fuera de alcance" (sección 7).

## 1. Contexto

API REST en Go sobre una base de datos, para una extensión de Chrome de Haxball
donde se crean, publican y aplican camisetas (colores de equipo). El proyecto es
para practicar backend y además va a publicarse, así que tiene que funcionar de
verdad. No hay usuarios: la autoría de una camiseta se prueba con un
`ownerToken`.

Arquitectura por capas con dependencias hacia adentro:

- `domain`: entidad `Shirt`, validaciones, `OwnedBy`, errores. Sin dependencias
  de HTTP ni de base de datos.
- Repositorio: interfaz declarada del lado de quien la consume, con
  implementaciones intercambiables (en memoria, base real). Los errores del repo
  son tipos propios.
- Handlers HTTP (`net/http`, `ServeMux` de Go 1.22+ con patrones tipo
  `GET /shirts/{id}`), con DTOs separados de la entidad.
- `main` solo cablea: crea el repositorio concreto y se lo inyecta a los
  handlers.

Decisiones ya tomadas (no discutir ni cambiar):

- Una sola entidad `Shirt`; DTOs distintos para lo que recibe y lo que envía el
  servidor.
- El **cliente** manda el `id` (UUID). El servidor valida que sea un UUID y que
  no exista. Una vez borrada una camiseta, su `id` queda libre.
- El servidor decide `createdAt` y `ownerToken`.
- Las validaciones viven en el modelo y devuelven el **primer error**
  encontrado.
- Los colores hex se normalizan a minúsculas.
- El largo del nombre se mide con `len` (bytes). No se maneja unicode a
  propósito: un nombre con emojis tiene menos caracteres disponibles.
- La regla de dueño es un método del modelo, `shirt.OwnedBy(...)`. El handler de
  borrado obtiene la camiseta, valida el token y recién después elimina (dos
  viajes al repositorio; la carrera entre ambos se acepta).
- El token de dueño **no se guarda en claro**: se guarda su hash (SHA-256 en
  hexadecimal, sin sal ni costo, porque el token es un UUID aleatorio). El
  **handler** genera el token, calcula el hash y se lo pasa al dominio; el token
  en claro solo existe en la respuesta del POST. En el DELETE, el handler hashea
  el header recibido antes de llamar a `OwnedBy`. El dominio trata el hash como
  un valor opaco y solo compara hashes.
- Los errores del repositorio son tipos propios, con un error desconocido que
  envuelve el original. El handler los mapea a status codes y deja 500 para el
  desconocido.
- Un `id` de path que no es un UUID devuelve 400.

## 2. Entidad y validaciones

API actual del dominio (paquete `domain`; puede cambiar, se confirma en cada
etapa):

```go
type NewShirtInput struct {
    ID        string
    Name      string
    Angle     int
    TextColor string
    Colors    []string
}

type ValidationError struct {
    Field   string
    Message string
}

func NewShirt(in NewShirtInput, createdAt time.Time, ownerToken string) (Shirt, error)
func (s Shirt) OwnedBy(token string) bool
```

`Shirt` embebe `NewShirtInput` y agrega la hora de creación y el token de dueño.
Con la decisión del hash, el valor que recibe `NewShirt` y que compara `OwnedBy`
es el **hash** (hoy los nombres son `ownerToken` y `OwnerToken`; renombrarlos a
`...Hash` queda a mi criterio).

| Campo          | Regla                                                      | Quién lo decide |
| -------------- | ---------------------------------------------------------- | --------------- |
| `id`           | UUID válido; único                                         | cliente         |
| `name`         | no vacío; máximo 24 **bytes** (`len`)                      | cliente         |
| `angle`        | entero de 0 a 359 (el rango es [0, 360))                   | cliente         |
| `textColor`    | hex válido, normalizado a minúsculas                       | cliente         |
| `colors`       | entre 1 y 3 hex válidos, cada uno normalizado a minúsculas | cliente         |
| `createdAt`    | lo asigna el servidor                                      | servidor        |
| token de dueño | lo genera el servidor; se guarda **solo su hash**          | servidor        |

Hex válido: `#` seguido de 6 dígitos hexadecimales, en mayúsculas o minúsculas
al entrar, siempre en minúsculas al guardarse.

Casos de borde que deben estar cubiertos:

- `name`: vacío (inválido), 1 byte, exactamente 24 bytes (válido), 25 bytes
  (inválido). Medido en bytes **a propósito**: con caracteres multibyte (por
  ejemplo emojis de 4 bytes) entran menos; 6 emojis son 24 bytes (válido) y 7
  son 28 (inválido).
- `angle`: -1 (inválido), 0, 359 (válidos), 360 (inválido).
- `colors`: 0 colores (inválido), 1, 2 y 3 (válidos), 4 (inválido).
- Hex inválido en `textColor` o en cualquier posición de `colors`: cadena vacía,
  largo incorrecto, caracteres no hexadecimales.
- Normalización: una entrada con mayúsculas queda en minúsculas en la camiseta
  resultante.
- `id` que no es un UUID válido (inválido).
- Un error de validación se distingue de cualquier otro tipo de error con
  `errors.As`, y expone el campo que falló en `Field`.
- Orden de las validaciones del dominio actual: nombre (vacío, largo), ángulo,
  color de texto, cantidad de colores, valores de los colores, `id` y token. Los
  tests usan un solo campo inválido por caso y no dependen de este orden.
- La entrada no se muta: tras `NewShirt`, el slice `Colors` del `NewShirtInput`
  original conserva sus valores (no queda en minúsculas).
- Aislamiento: modificar el slice del input después de construir la camiseta no
  altera la camiseta.
- `NewShirt` con hash vacío falla (ver pendiente 13).
- Formato del `id`: ver pendiente 14. Hasta que se resuelva, solo se testean
  UUID canónicos en minúsculas (válidos) y cadenas que claramente no son UUID
  (inválidas).

## 3. Token de dueño y su hash

- El token que se entrega al cliente es un UUID aleatorio, generado por el
  handler con una función inyectable (pendiente 7). Dos generaciones
  consecutivas dan valores distintos.
- La función de hash es **una sola**, usada tanto al crear como al verificar:
  SHA-256 del token en claro, codificado en hexadecimal en minúsculas (64
  caracteres), sin sal. Dónde vive la función: pendiente 8. Tests: es
  determinista (misma entrada, misma salida); entradas distintas dan salidas
  distintas; la salida tiene 64 caracteres hexadecimales en minúsculas; y
  `SHA-256("abc")` es
  `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` (vector de
  prueba estándar, para fijar el algoritmo).
- `OwnedBy(hash)` compara hashes con `crypto/subtle.ConstantTimeCompare`:
  verdadero con el hash correcto, falso con cualquier otro (incluido uno de
  largo distinto) y falso con un valor vacío, incluso en una `Shirt` sin
  inicializar.
- La camiseta **no** guarda el token en claro, y no debe poder exponer ni el
  token ni el hash en sus representaciones públicas (se verifica a nivel de
  handler, sección 5).

## 4. Repositorio

Interfaz asumida (consumidor y ubicación a confirmar, pendiente 8):

```go
type ShirtRepository interface {
    List(page, pageSize int) ([]domain.Shirt, error)
    Create(s domain.Shirt) error
    Total() (int, error)
    Get(id string) (domain.Shirt, error)
    Delete(id string) error
}
```

Errores propios: no encontrado, ya existe y desconocido. El desconocido
**envuelve** el error original: se identifica como error desconocido y
`errors.Is(err, causa)` es verdadero para la causa original.

Comportamientos que debe cumplir **toda** implementación (suite de contrato
reutilizable, etapa 3):

- `Create` y luego `Get` devuelven una camiseta igual a la guardada.
- `Create` con un `id` existente falla con "ya existe", la original queda
  intacta y `Total` no cambia.
- `Get` de un `id` inexistente falla con "no encontrado".
- `Delete` de una existente: después `Get` falla con "no encontrado" y `Total`
  baja en uno.
- `Delete` de una inexistente falla con "no encontrado".
- Tras `Delete`, el `id` queda libre: un `Create` con el mismo `id` funciona.
- `Total` es 0 con el repositorio vacío y N tras N creaciones.
- `List` vacío devuelve cero elementos y sin error.
- Orden de `List`: por `createdAt` (descendente, asumido), con desempate por
  `name` y, si sigue el empate, por `id`.
- Paginación: las páginas son contiguas y disjuntas; la unión de todas las
  páginas es la lista completa y ordenada; una página mayor que la última
  devuelve cero elementos; la última página puede ser parcial; un `pageSize`
  mayor que el total devuelve todo.
- Las camisetas devueltas son **copias**: modificar el slice `colors` de una
  devuelta no altera lo almacenado.
- La validación de argumentos (`page` y `pageSize`) es responsabilidad del
  handler; no se testea qué hace el repositorio con argumentos inválidos.

## 5. API HTTP

Reglas comunes:

- Los handlers dependen de una interfaz del repositorio y se testean con un
  **fake escrito a mano** y `httptest`. Sin red ni base de datos.
- Respuestas con cuerpo llevan `Content-Type: application/json`.
- Errores con cuerpo `{"error": "<mensaje>"}` (asumido, pendiente 11).
- Los 500 **no** exponen detalles internos al cliente.
- Representación pública de una camiseta: `id`, `name`, `angle`, `textColor`,
  `colors`, `createdAt` (nombres y formato asumidos, pendiente 3). **Nunca**
  incluye el token ni su hash.
- Mapeo de errores del repositorio: no encontrado → 404, ya existe → 409,
  desconocido → 500.

### GET /shirts?page=&pageSize=

- 200 con `{"items": [...], "total": N}`. `total` es el total del repositorio,
  no el tamaño de la página.
- Con cero resultados, `items` es `[]` y **no** `null`.
- `page <= 0` o no numérico → 400. `pageSize < 0` o no numérico → 400.
- Un `pageSize` mayor que `MAX_PAGE_SIZE` se limita a `MAX_PAGE_SIZE`. Los tests
  usan la constante, no un literal (valor tentativo: 1000).
- El handler pasa al repositorio `page` y el `pageSize` efectivo, y devuelve los
  items en el orden en que los entrega el repositorio, sin reordenar.
- Error del repositorio (`List` o `Total`) → 500.
- Pendiente 5: `pageSize = 0`, valores por defecto cuando faltan los parámetros.

### POST /shirts

- Cuerpo: `id`, `name`, `angle`, `textColor`, `colors`. El servidor asigna
  `createdAt` y `ownerToken`.
- Éxito → 201 con `{"ownerToken": "<uuid>"}`.
- Tras el 201, el repositorio contiene la camiseta con los colores normalizados
  a minúsculas y el `createdAt` asignado por el servidor, Lo guardado **no** es
  el token devuelto sino su hash, y `OwnedBy(hash(<token devuelto>))` es
  verdadero.
- JSON inválido o cuerpo vacío → 400.
- Falla de validación (cualquier campo, incluido `id` que no es un UUID) → 400
  con un mensaje.
- `id` ya existente → 409.
- Error desconocido del repositorio → 500.
- Pendiente 10: qué pasa si el cliente manda `createdAt`, `ownerToken` o campos
  desconocidos.

### DELETE /shirts/{id} (header `X-Owner-Token`)

Orden de las comprobaciones (asumido): validar `id` → exigir header → obtener la
camiseta → hashear el header → `OwnedBy` → eliminar.

- `id` que no es un UUID → 400.
- Falta el header → 401 (asumido, pendiente 4).
- Camiseta inexistente → 404.
- Token incorrecto → 403 (asumido, pendiente 4), y la camiseta **no** se borra.
- Token correcto (el que devolvió el POST; el handler lo hashea antes de
  comparar) → 204 sin cuerpo, y la camiseta ya no está en el repositorio.
- `Get` exitoso pero `Delete` devuelve "no encontrado" (borrado concurrente)
  → 404.
- Error desconocido en `Get` o en `Delete` → 500.

## 6. Etapas

Cada etapa termina cuando sus tests compilan, fallan por la razón correcta (nada
implementado todavía) y yo confirmo la lista de casos.

1. **Dominio: validaciones** (sección 2), contra la API actual del dominio.
   Archivo: `internal/domain/shirt_test.go`.
2. **Dominio: token de dueño y su hash** (sección 3): `OwnedBy` y la función de
   hash.
3. **Suite de contrato del repositorio + repositorio en memoria** (sección 4).
   La suite vive en un paquete auxiliar **no `_test`** para que la importen los
   tests de las dos implementaciones, y recibe una función que crea un
   repositorio nuevo y vacío por cada caso.
4. **Handler GET /shirts** (sección 5).
5. **Handler POST /shirts**.
6. **Handler DELETE /shirts/{id}**.
7. **Implementación sobre la base real**: reutiliza la suite de contrato y
   agrega un test de que la violación de unicidad del `id` se traduce a "ya
   existe". Son tests de integración: se saltan con `testing.Short()` o con un
   build tag. Depende de la base elegida (pendiente 12).

## 7. Fuera de alcance

- Manejo de unicode en el largo del nombre.
- Carreras entre el chequeo del token y el borrado (aceptadas).
- Rate limiting, CORS, logging, carga de configuración, apagado ordenado,
  timeouts del servidor.
- Tests de performance o de carga.
- Cualquier autenticación más allá del `ownerToken`.

## 8. Decisiones pendientes

El agente **no las asume**: me pregunta, o deja el test con `t.Skip`. Entre
paréntesis, el valor que se usó arriba solo como borrador. La numeración se
conserva porque otras secciones la referencian.

1. **Resuelto.** El token se guarda solo como hash, lo calcula el handler
   (SHA-256 hexadecimal, sin sal).
2. **Resuelto.** Hex con `#` obligatorio, normalizado a minúsculas.
3. Nombres de los campos del JSON y formato de `createdAt`. (borrador: camelCase
   y RFC 3339)
4. Códigos para token ausente e incorrecto. (borrador: 401 y 403)
5. `pageSize = 0`, valores por defecto de `page` y `pageSize`, valor final de
   `MAX_PAGE_SIZE`.
6. Dirección del orden y desempate final. (borrador: `createdAt` descendente,
   luego `name`, luego `id`)
7. Inyección del reloj y del generador de token **en el handler**. (propuesta:
   el handler recibe `now func() time.Time` y `newToken func() string`; el
   dominio ya recibe esos valores como parámetros)
8. Paquetes concretos, y dónde viven la interfaz del repositorio, sus errores y
   la función de hash.
9. Nombre solo con espacios o con espacios al borde: ¿se recorta o se rechaza?
10. En el POST, qué hacer con `createdAt`, el token o campos desconocidos
    enviados por el cliente (ignorar o rechazar).
11. Formato exacto del cuerpo de error JSON y receptor de `ValidationError`
    (puntero o valor; los tests usan `errors.As` con el tipo exacto). Ya
    resuelto: es una struct con `Field` y `Message`.
12. Base de datos elegida.
13. Hash vacío en `NewShirt`: ¿es un `ValidationError` (400) o un error interno
    (500)? El token lo genera el servidor, no el cliente.
14. Formato del `id`: ¿se acepta cualquier forma que acepte el parser de UUID
    (mayúsculas, sin guiones, llaves, prefijo `urn:uuid:`) o solo el canónico de
    36 caracteres? ¿Se normaliza a minúsculas? Sin esto, el mismo UUID puede
    entrar como dos strings distintos y la unicidad falla.
15. Campos de `Shirt` exportados o privados con getters, y cómo reconstruye el
    repositorio una `Shirt` leída de la base (por ejemplo, con una función de
    reconstrucción sin validar).
