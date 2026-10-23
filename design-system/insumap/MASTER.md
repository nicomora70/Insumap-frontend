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
**Lenguaje visual:** editorial cálido (referencia: hims.com) implementado con tokens propios
**Última revisión:** 2026-10-18

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
| `--color-app-bg` | `#fbf8f5` | Fondo de la app |
| `--color-sand` | `#f2ede6` | Bloques secundarios, segmentados, filas alternas |
| `--color-sand-deep` | `#e7ded2` | Hover de arena, rieles |
| `--color-card` | `#ffffff` | Tarjetas y hojas |
| `--color-line` | `#e9e1d6` | Hairline estructural |
| `--color-cocoa` / `--color-cocoa-soft` | `#3e2e22` / `#5a4530` | Momentos destacados (dato del día, panel de auth en escritorio) |
| `--color-caramel` / `--color-honey` | `#a97c3f` / `#f9b859` | Gradiente de la tarjeta secundaria destacada |
| `--color-cream` | `#f7f2ea` | Texto sobre cocoa/caramel |

### 2.2 Tinta

| Token | Hex | Uso |
|---|---|---|
| `--color-ink` | `#1f1a14` | Texto principal |
| `--color-ink-strong` | `#14100b` | Titulares |
| `--color-muted` | `#8a7e6f` | Texto secundario — **en revisión de contraste** (ver §8) |
| `--color-primary` | `#1f1a14` | Píldora negra (CTA principal) |
| `--color-ring` | `#b98267` | Anillo de foco |

### 2.3 Acentos (presupuesto: máximo 2 por pantalla)

`--color-honey` `#f9b859` · `--color-clay` `#b98267` · `--color-olive` `#9c702f`
Cada uno con su variante `-soft` para fondos de aviso.

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

Neones (`#2fd8ff`, `#2ee872`), gradientes morado/azul, texto blanco sobre ámbar, colores fuera de
los tokens, hex sueltos en plantillas (si hace falta un color nuevo, se agrega al `@theme`).

---

## 3. Tipografía

**Fuente:** DM Sans (400/500/600/700), variable por peso óptico. Sin serif, sin segunda familia.

### 3.1 Escala implementada (tokens en `src/styles.css`)

| Token | Tamaño | Peso | Uso |
|---|---|---|---|
| `text-display` | `clamp(36px → 56px)` | 400 | Titular del mapa |
| `text-h1` | `clamp(32px → 40px)` | 400/500 | Título de pantalla |
| `text-h2` | `clamp(28px → 34px)` | 400 | Sección mayor y tarjetas destacadas en `sm+` |
| `text-h3` | 20px | 500 | Título de tarjeta; en móvil también las tarjetas destacadas |
| `text-title` | 17px | 500 | Encabezado de fila o de tarjeta compacta |
| `text-body` | 16px | 400 | Texto corrido, inputs y botones |
| `text-small` | 14px | 400/500 | Texto secundario, metadatos |
| `text-caption` | 12px | 500 | Etiquetas, píldoras, pies |
| `text-eyebrow` | 11px + tracking 0.14em | 600 | Mayúsculas. Máximo 1 por pantalla (§0) |

Regla: máximo **cinco tamaños visibles por pantalla**. Si un tamaño nuevo no está en esta
tabla, se agrega aquí primero (y se justifica).

### 3.2 Reglas

- **Datos numéricos** (horas, porcentajes, ID de microzona): clase `tnum` (figuras tabulares) sobre
  la fuente de texto. **No se usa monoespaciada** para micro-etiquetas ni identificadores.
  Excepción única: el **código de vínculo** médico-paciente (se lee y se dicta carácter a
  carácter, la mono ayuda a distinguir `0/O` y `1/l`).
- **Titulares** llevan `text-wrap: balance` cuando ocupan más de una línea.
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

**Superficies:** 4 niveles y ni uno más — `app-bg` → `sand` → `card` → `cocoa`.
Cada nivel existe solo si comunica jerarquía; si no, es espacio.

**Radios:** `12px` (chips pequeños) · `16px` (inputs, botones cuadrados) · `24px` (tarjetas, hojas) ·
`32px` (bloques destacados) · `full` (píldoras). Los radios anidados son concéntricos
(radio interno = radio externo − padding).

**Sombras:** solo en elementos flotantes (toast, hoja, etiquetas sobre el 3D). Siempre tintadas:
`rgb(31 26 20 / 0.06–0.10)`. Prohibido `shadow-md/lg/xl` por defecto.

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
- Un solo gesto característico por pantalla; no se anima todo.
- `@media (prefers-reduced-motion: reduce)` deja todo en reposo, sin excepción.
- `backdrop-filter` solo en elementos fijos o pegajosos (header, overlay). Nunca en contenedores que hacen scroll.

---

## 7. Componentes

| Componente | Archivo | Cuándo |
|---|---|---|
| `uiBtn` | `shared/ui/button.ts` | Toda acción. Variantes: `primary` (miel), `dark` (píldora negra), `outline`, `soft`, `ghost`, `danger` |
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
| Acción principal | **Ámbar** (`uiBtn` por defecto) | Registrar, guardar, exportar, entrar, generar código |
| Navegación y selección | **Píldora negra** | Enlace activo del shell, elección de rol, burbuja del usuario |
| Acción destructiva | Rojo suave | Revocar, quitar dosis, cerrar sesión |

Nunca dos botones ámbar compitiendo en la misma pantalla.

---

## 8. Accesibilidad

- **Contraste mínimo 4.5:1** en texto normal y 3:1 en texto ≥24px. `--color-muted` sobre crema está en
  **3.75:1**: se oscurece antes de dar por cerrada cualquier pantalla.
- **Prohibido** texto claro sobre ámbar o miel (contraste <2:1). Sobre esos fondos, siempre tinta oscura.
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
- Amarillo representado con otro tono (cian, azul) o estados sin ícono/palabra.
- Sombras duras, negras o por defecto de Tailwind.
- `h-screen` (usar `min-h-svh`/`min-h-dvh`), `overflow-x` accidental en móvil.
- Más de 3 cajas con borde por pantalla; hairlines decorativas.
- Más de un eyebrow por pantalla; mayúsculas en frases.
- Monoespaciada para micro-etiquetas o identificadores.
- Estados instantáneos sin transición; animación de propiedades de layout.
- Iconos solo sin nombre accesible; botones sin `cursor-pointer`; foco invisible.
- Emojis, texto de relleno, nombres tipo "John Doe" o datos clínicos inventados.

---

## 10. Checklist antes de entregar

- [ ] Sin amarillo sustituido por otro color; todo estado con color + ícono + patrón + palabra
- [ ] Contraste ≥4.5:1 verificado en el texto secundario y sobre fondos de aviso
- [ ] Máximo 1 eyebrow, 3 cajas con borde y 2 acentos por pantalla
- [ ] Cinco tamaños de texto visibles como máximo; `tabular-nums` en datos
- [ ] Un solo `h1`, encabezados sin saltos, `lang="es"`, skip-link
- [ ] Foco visible y navegación completa por teclado (incluido el mapa en modo Lista)
- [ ] Objetivos ≥44×44px, sin scroll horizontal a 360 px de ancho
- [ ] Revisado a 375 / 768 / 1440 px con capturas
- [ ] `prefers-reduced-motion` deja todo en reposo
- [ ] Sin emojis, sin hex sueltos, sin monoespaciada en etiquetas
- [ ] Una sola tarjeta blanca con borde cuando no aporta jerarquía (paso a `sand` o espacio)
