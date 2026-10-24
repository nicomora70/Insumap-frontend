# Design System Master — Insumap

> **Cómo se usa este archivo.** Antes de construir o rediseñar una pantalla, busca
> `design-system/insumap/pages/[pantalla].md`. Si existe, **sus reglas ganan** sobre este archivo.
> Si no existe, sigue este Master al pie de la letra.
>
> La **fuente de verdad de los tokens** es `src/styles.css` (bloque `@theme` de Tailwind 4).
> Este documento explica el *por qué* y el *cómo*; los valores viven en el CSS.

**Proyecto:** Insumap — rotación de zonas de inyección de insulina
**Categoría:** salud / bienestar, uso móvil diario, contexto clínico
**Stack:** Angular 20 (standalone + signals) · Tailwind 4 · Lucide · three.js · PWA
**Lenguaje visual:** editorial cálido con capa Cleo (oxblood + ember), implementado con tokens propios
**Última revisión:** 2026-10-23

---

## 0. Reglas de casa

Este proyecto se rediseñó usando `redesign-skill` y `taste-skill` como método de trabajo.
Esas skills traen un registro de *tells* (`references/tells.md`) que marca como "look generado"
varios rasgos de nuestra identidad. La skill acepta mantener un patrón marcado **si hay una razón
escrita**. Estas son nuestras razones.

| Rasgo | Estado en la skill | Decisión | Razón |
|---|---|---|---|
| Crema + terracota/clay | `banned together`, terracota `banned`, crema `warned` | **Se mantiene** | App clínica de uso diario: la calidez baja la ansiedad y diferencia la app de un expediente médico. La regla de la skill está escrita para páginas públicas de captación, no para producto de salud. Paleta validada con las HU y con el diseño anterior que el equipo aprobó. |
| Hairlines y cajas de 1px como estructura | `banned (boxes: 3+)` | **Se reduce, no se elimina** | Sobre crema, el borde es lo que separa superficies sin meter sombra. Regla: máximo 3 contenedores con borde por pantalla; el resto se separa por **paso de tono** (card → sand) o por espacio. |
| Eyebrows en mayúsculas 11px con tracking | `banned (3+)` | **Máximo 1 por pantalla** | Sirve para agrupar secciones en pantallas largas (Perfil, Cuenta). Donde no agrupa nada, se borra. |
| Monoespaciada en IDs de microzona | `banned` (mono como voz técnica) | **Se elimina** | Los IDs son datos: van en la fuente de texto con `tabular-nums`. Ver §3. |
| Doble hairline / reglas finas decorativas | `banned` | **Se elimina** | No aportan información. |
| Sombra bajo cada tarjeta | `banned` | **Solo en capas flotantes** | Las tarjetas en reposo no proyectan sombra. Solo el toast, las etiquetas del 3D y las hojas elevadas usan sombra **tintada cálida** (`rgb(31 26 20 / …)`), nunca negra. |
| Lucide como set único | tell en `soft`/`minimalist` | **Se mantiene** | Ya está en todo el código, con grosor de trazo consistente y tree-shaking por icono. Cambiar a Phosphor es un costo transversal alto por una ganancia marginal. Se reevalúa si aparece un problema real de legibilidad. |
| CTA en píldora (`rounded-full`) | prohibido en `minimalist` | **Se mantiene** | Es la firma del lenguaje editorial cálido de la referencia y da continuidad entre chips, botones y campos. |
| Dos familias (Instrument Sans + DM Sans) | tell de "look generado" | **Se acepta con límites** | Instrument Sans solo hace titulares (`display`, `h1`, `h2`); DM Sans hace UI, formularios y texto. La separación es funcional, no decorativa: el display necesita más carácter y la UI más legibilidad. |
| Naranja ember `#ff8e3e` | acento de la referencia Cleo | **Solo decorativo** | Sobre crema da 2.12:1. Se usa en rellenos, subrayados y sobre oxblood (6.16:1). Para texto destacado sobre crema se usa `ember-ink` `#c2410c` (4.80:1). |
| Fotos de banco de imágenes | — | **Prohibido en este proyecto** | Contexto de salud: una foto de archivo resta credibilidad. Se usa ilustración SVG propia del cuerpo/mapa, o nada. |
| Datos de ejemplo tipo "John Doe" | tell de copy | **Prohibido** | Nombres realistas latinos y horas verosímiles en demos, capturas y datos semilla. |

**Cómo pedir una excepción:** se agrega una fila a esta tabla con la razón de negocio. Sin fila, no
hay excepción.

---

## 1. Principios

1. **El estado nunca depende solo del color** (RNF-05). Recuperación = color + ícono + patrón + palabra,
   siempre, en cualquier superficie.
2. **Hairline antes que sombra.** El color comunica; la sombra solo eleva lo que flota de verdad.
3. **Una jerarquía, tres pesos.** La jerarquía la dan tamaño, espacio y tono. Si todo es negrita, nada lo es.
4. **Objetivos táctiles de 44×44 px** y **foco visible** en todo lo interactivo. Sin excepciones.
5. **Los datos son los del backend.** Ningún texto clínico se inventa en el front.
6. **Español neutro, sentence case.** Los títulos no van en Title Case. Sin exclamaciones.
7. **Sin emojis** como iconos ni en copy. Siempre SVG.
8. **Mobile first de verdad:** la app se usa con una mano, con prisa, antes y después de comer.
   Todo lo importante queda en la mitad inferior alcanzable.

---

## 2. Color

### 2.1 Superficies (de atrás hacia adelante)

| Token | Hex | Uso |
|---|---|---|
| `--color-app-bg` | `#f8f6f2` | Fondo de la app (crema Cleo) |
| `--color-sand` | `#efe8de` | Bloques secundarios, segmentados, filas alternas |
| `--color-sand-deep` | `#e2d8ca` | Hover de arena, rieles |
| `--color-card` | `#fffdfa` | Tarjetas y hojas (blanco cálido) |
| `--color-line` | `#e6ded2` | Hairline estructural |
| `--color-cocoa` / `--color-cocoa-soft` | `#3a1714` / `#552722` | Profundidad del marrón vino en gradientes |
| `--color-oxblood` / `--color-oxblood-deep` | `#47201c` / `#2f100c` | Marca, CTA, nav activo y paneles destacados |
| `--color-ember` / `--color-ember-ink` / `--color-ember-soft` | `#ff8e3e` / `#c2410c` / `#ffe3d1` | Acento decorativo / texto destacado / fondo de acento |
| `--color-caramel` / `--color-honey` | `#a97c3f` / `#f9b859` | Zona sugerida y avisos, nunca como texto de marca |
| `--color-cream` | `#f8f6f2` | Texto sobre oxblood/cocoa |

### 2.2 Tinta

| Token | Hex | Uso |
|---|---|---|
| `--color-ink` | `#47201c` | Texto principal (13.05:1 sobre crema) |
| `--color-ink-strong` | `#2f100c` | Titulares |
| `--color-muted` | `#6f6353` | Texto secundario (5.43:1 sobre crema, 4.82:1 sobre arena) |
| `--color-primary` | `#47201c` | CTA principal y píldora de navegación |
| `--color-primary-strong` | `#2f100c` | Hover del CTA |
| `--color-ring` | `#c2410c` | Anillo de foco (4.80:1) |

### 2.3 Acentos (presupuesto: máximo 2 por pantalla)

`--color-honey` `#f9b859` · `--color-clay` `#b98267` · `--color-olive` `#7a5518` ·
`--color-ember` `#ff8e3e` (decorativo) · `--color-ember-ink` `#c2410c` (texto)

Cada uno con su variante `-soft` para fondos de aviso. El acento de marca es **uno por
pantalla**: una palabra en `ember-ink` sobre crema o en `ember` sobre oxblood. El resto de la
pantalla vive en tinta y tono.

### 2.4 Recuperación (semántico, no decorativo)

| Estado | Tinta | Fondo | Patrón |
|---|---|---|---|
| Rojo · "Recuperando" | `--color-mz-red` `#a63d2a` | `--color-mz-red-soft` `#f7e2da` | `pattern-red` (rayas 45°) |
| Amarillo · "Casi lista" | `--color-mz-yellow` `#8f6400` | `--color-mz-yellow-soft` `#fbf0d5` | `pattern-yellow` (puntos) |
| Verde · "Lista" | `--color-mz-green` `#2f6b4f` | `--color-mz-green-soft` `#e2efe4` | sin patrón |

**Regla dura (HU-07):** estos tres estados son **rojo, amarillo y verde** en todas las superficies,
incluido el cuerpo 3D. Nunca se sustituye el amarillo por cian, azul ni ningún otro tono.
En el 3D el velo puede subir de saturación para leerse sobre el músculo, pero el tono sigue siendo ámbar.

### 2.5 Prohibido

Neones (`#2fd8ff`, `#2ee872`), gradientes morado/azul, texto blanco sobre ámbar, `ember`
(`#ff8e3e`) como texto sobre crema, más de una palabra acentuada por pantalla, colores fuera de
los tokens, hex sueltos en plantillas (si hace falta un color nuevo, se agrega al `@theme`).

---

## 3. Tipografía

**Familias:** Instrument Sans para `display`, `h1` y `h2`; DM Sans para UI, formularios y texto.
La segunda familia es una excepción documentada (§0): el display necesita el carácter de la
referencia Cleo y la UI necesita la legibilidad de DM Sans. Sin serif.

### 3.1 Escala implementada (tokens en `src/styles.css`)

| Token | Tamaño | Peso | Uso |
|---|---|---|---|
| `text-display` | `clamp(48px → 88px)` | 500 | Titular de marca: mapa e inicio |
| `text-h1` | `clamp(40px → 56px)` | 500 | Título de pantalla |
| `text-h2` | `clamp(30px → 44px)` | 500 | Sección mayor |
| `text-h3` | 24px | 500 | Título de tarjeta destacada |
| `text-title` | 17px | 500 | Encabezado de fila o de tarjeta compacta |
| `text-body` | 16px | 400 | Texto corrido, inputs y botones |
| `text-small` | 14px | 400/500 | Texto secundario, metadatos |
| `text-caption` | 12px | 500 | Etiquetas, píldoras, pies |
| `text-eyebrow` | 11px + tracking 0.16em | 600 | Mayúsculas. Máximo 1 por pantalla (§0) |

Regla: máximo **cinco tamaños visibles por pantalla**. Si un tamaño nuevo no está en esta
tabla, se agrega aquí primero (y se justifica). El display solo aparece en el mapa/inicio y en
auth; las pantallas de tarea usan `h1` como máximo.

### 3.2 Reglas

- **Datos numéricos** (horas, porcentajes, ID de microzona): clase `tnum` (figuras tabulares) sobre
  la fuente de texto. **No se usa monoespaciada** para micro-etiquetas ni identificadores.
  Excepción única: el **código de vínculo** médico-paciente (se lee y se dicta carácter a
  carácter, la mono ayuda a distinguir `0/O` y `1/l`).
- **Titulares** llevan `text-wrap: balance` cuando ocupan más de una línea.
- **Una sola palabra acentuada por pantalla.** Sobre crema se usa `ember-ink`; sobre oxblood,
  `ember`. El subrayado `.accent-mark` es opcional y se dibuja una vez.
- Los párrafos se limitan a ~65 caracteres (`max-w-prose`).
- Los enlaces en texto van subrayados con `underline-offset-4`; no se confía solo en el color.

---

## 4. Espacio y ritmo

| Token | Valor | Uso |
|---|---|---|
| `xs` | 4px | Separación icono-texto fina |
| `sm` | 8px | Gaps internos |
| `md` | 16px | Padding estándar |
| `lg` | 24px | Padding de tarjeta, separación entre tarjetas |
| `xl` | 32px | Separación entre bloques |
| `2xl` | 48px | Separación entre secciones |
| `3xl` | 64px | Aire antes de un bloque destacado |

- Padding de tarjeta: **20–24px**. Nunca menos de 16px.
- Contenedor de página: `max-w-6xl` centrado, `px-5` en móvil, `px-8` en `lg`.
- El padding inferior es mayor que el superior en bloques largos (compensación óptica).

---

## 5. Superficies, radios, sombras y capas

**Superficies:** 4 niveles y ni uno más — `app-bg` → `sand` → `card` → `oxblood`.
Cada nivel existe solo si comunica jerarquía; si no, es espacio.

**Radios:** `12px` (chips pequeños) · `16px` (inputs, botones cuadrados) · `24px` (tarjetas, hojas) ·
`32px` (`card-feature`, bloques destacados) · `full` (píldoras). Los radios anidados son
concéntricos (radio interno = radio externo − padding).

**Sombras:** solo en elementos flotantes (toast, hoja, etiquetas sobre el 3D) y al hacer hover
sobre una tarjeta interactiva. Siempre tintadas:
`rgb(71 32 28 / 0.06–0.12)`. Prohibido `shadow-md/lg/xl` por defecto.

**Capas (z-index):** `sticky header: 30` · `hoja/overlay: 40` · `toast: 40` · `menú móvil: 50`.
No se inventan valores intermedios.

---

## 6. Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--ease-soft` | `cubic-bezier(0.32, 0.72, 0, 1)` | Todo lo que entra, sale o se presiona |
| rápida | 150ms | Color, borde, foco |
| media | 250ms | Press, hover |
| lenta | 320ms | Hoja inferior, cambios de vista |
| entrada | 600ms | Aparición de bloques con `opacity` + `translateY(12px)` |

- Solo se animan `transform` y `opacity`. Nunca `top/left/width/height`.
- Las listas entran escalonadas (`--index` × 60ms), nunca todas de golpe.
- Un solo gesto característico por pantalla; no se anima todo. El gesto de marca es el
  subrayado `.accent-mark`, que se dibuja una vez.
- `@media (prefers-reduced-motion: reduce)` deja todo en reposo, sin excepción.
- `backdrop-filter` solo en elementos fijos o pegajosos (header, barra inferior, overlay, chips
  flotantes). Nunca en contenedores que hacen scroll.
- Prohibido scroll hijacking, marquesinas infinitas, parallax y cursores personalizados.

---

## 7. Componentes

| Componente | Archivo | Cuándo |
|---|---|---|
| `uiBtn` | `shared/ui/button.ts` | Toda acción. Variantes: `primary` (oxblood), `dark` (alias oxblood), `outline`, `soft`, `ghost`, `danger` |
| `ui-avatar` | `shared/ui/avatar.ts` | Personas. Tonos tierra determinísticos por inicial |
| `ui-pill` | `shared/ui/status-pill.ts` | Estado de recuperación. Única fuente de la palabra + ícono + color |
| `ui-segmented` | `shared/ui/segmented.ts` | Selector de 2–4 opciones. Única implementación del patrón |
| `ui-sheet` | `shared/ui/sheet.ts` | Hoja inferior en móvil, diálogo centrado en `lg`. Escape, foco atrapado y scroll propio |
| `ui-skeleton` | `shared/ui/skeleton.ts` | Cargando. Misma forma que el contenido real |
| `ui-empty` | `shared/ui/empty.ts` | Sin datos. Ilustración propia + título + explicación + acción |
| `ui-stat` | `shared/ui/stat.ts` | Dato protagonista: número grande + etiqueta pequeña |
| `ui-ring` | `shared/ui/ring.ts` | Anillo de recuperación con el porcentaje al centro |
| `ui-list-row` | *(Fase 2)* | Filas de historial y de pacientes |
| `ui-timeline` | *(Fase 2)* | Cronograma de dosis y próximos recordatorios |
| `app-shell` | `shared/shell/app-shell.ts` | Marco: header pegajoso en escritorio, barra inferior en móvil, skip-link y toast |

**Regla:** si un patrón aparece tres veces, se convierte en componente antes del siguiente cambio.

### 7.1 Regla de acción (un solo CTA primario por pantalla)

| Rol | Color | Dónde |
|---|---|---|
| Acción principal | **Oxblood** (`uiBtn` por defecto) | Registrar, guardar, exportar, entrar, generar código |
| Navegación y selección | **Píldora oxblood** | Enlace activo del shell, elección de rol, burbuja del usuario |
| Acento y sugerencia | **Miel** (`honey`) | Zona sugerida, avisos y estados que no son CTA |
| Acción destructiva | Rojo suave | Revocar, quitar dosis, cerrar sesión |

Nunca dos botones oxblood compitiendo en la misma pantalla. Sobre un panel oxblood, el CTA
principal usa la variante clara (`soft`/`glass`), no oxblood sobre oxblood.

---

## 8. Accesibilidad

- **Contraste mínimo 4.5:1** en texto normal y 3:1 en texto ≥24px. `--color-muted` sobre crema
  está en **5.43:1** (4.82:1 sobre arena); `--color-ink` en **13.05:1**; `--color-ember-ink` en
  **4.80:1**.
- **Prohibido** texto claro sobre ámbar o miel (contraste <2:1). Sobre esos fondos, siempre tinta
  oscura. `--color-ember` (`#ff8e3e`) solo se usa como relleno o sobre oxblood; sobre crema da
  **2.12:1**.
- Foco visible siempre (`3px` con `--color-ring` y `offset` de 2px). No se quita el outline.
- Objetivos de 44×44px como mínimo, con separación de 8px entre ellos.
- Un solo `h1` por pantalla; jerarquía de encabezados sin saltos.
- La vista **Lista** del mapa es el equivalente accesible del cuerpo 3D: todo lo que el 3D permite
  hacer con el dedo, la lista lo permite con teclado.
- Skip-link al contenido principal y `lang="es"`.

---

## 9. Anti-patrones

- Emojis como iconos o en copy.
- Texto claro sobre ámbar/miel; `muted` para texto importante.
- `ember` como texto sobre crema; más de una palabra acentuada por pantalla.
- Amarillo representado con otro tono (cian, azul) o estados sin ícono/palabra.
- Sombras duras, negras o por defecto de Tailwind.
- `h-screen` (usar `min-h-svh`/`min-h-dvh`), `overflow-x` accidental en móvil.
- Más de 3 cajas con borde por pantalla; hairlines decorativas.
- Más de un eyebrow por pantalla; mayúsculas en frases.
- Monoespaciada para micro-etiquetas o identificadores.
- Estados instantáneos sin transición; animación de propiedades de layout.
- Scroll hijacking, marquesinas infinitas, parallax y cursores personalizados.
- Iconos solo sin nombre accesible; botones sin `cursor-pointer`; foco invisible.
- Emojis, texto de relleno, nombres tipo "John Doe" o datos clínicos inventados.

---

## 10. Checklist antes de entregar

- [ ] Sin amarillo sustituido por otro color; todo estado con color + ícono + patrón + palabra
- [ ] Contraste ≥4.5:1 verificado en `muted`, `ember-ink` y sobre fondos de aviso
- [ ] `ember` solo como relleno o sobre oxblood; nunca como texto sobre crema
- [ ] Máximo 1 eyebrow, 1 palabra acentuada, 3 cajas con borde y 2 acentos por pantalla
- [ ] Cinco tamaños de texto visibles como máximo; `tabular-nums` en datos
- [ ] Un solo `h1`, encabezados sin saltos, `lang="es"`, skip-link
- [ ] Foco visible y navegación completa por teclado (incluido el mapa en modo Lista)
- [ ] Objetivos ≥44×44px, sin scroll horizontal a 360 px de ancho
- [ ] Revisado a 375 / 768 / 1440 px con capturas
- [ ] `prefers-reduced-motion` deja todo en reposo
- [ ] Sin emojis, sin hex sueltos, sin monoespaciada en etiquetas
- [ ] Una sola tarjeta blanca con borde cuando no aporta jerarquía (paso a `sand` o espacio)
- [ ] Un solo CTA oxblood por pantalla; sobre panel oscuro, CTA claro

---

## 11. Bitácora

| Fecha | Cambio |
|---|---|
| 2026-10-23 | Capa Cleo: oxblood + ember, Instrument Sans en display, escala editorial 48→88, botón con brillo interior, subrayado de acento y superficies cálidas. Se documentan excepciones de doble familia y naranja decorativo. |
