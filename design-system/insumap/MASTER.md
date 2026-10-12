# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Insumap
**Generated:** 2026-10-10 14:43:35
**Category:** Healthcare App

---

## Global Rules

### Color Palette

Paleta implementada en `src/styles.css` (@theme de Tailwind 4). Referencia: hims.com (tierra/ámbar, monocromo cálido con píldoras negras).

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background (crema) | `#FAF5EE` | `--color-app-bg` |
| Card | `#FFFFFF` | `--color-card` |
| Arena (superficie suave) | `#F3EADF` | `--color-sand` |
| Arena profunda | `#EADCC8` | `--color-sand-deep` |
| Hairline | `#EBE2D5` | `--color-line` |
| Ink (tinta cálida) | `#1F1A14` | `--color-ink` |
| Ink strong | `#14100B` | `--color-ink-strong` |
| Muted | `#8A7E6F` | `--color-muted` |
| Miel (amber) | `#F9B859` | `--color-honey` / `--color-honey-soft` |
| Terracota (peru) | `#B98267` | `--color-clay` / `--color-clay-soft` |
| Oliva | `#9C702F` | `--color-olive` / `--color-olive-soft` |
| CTA (negro cálido) | `#1F1A14` | `--color-primary` |
| Recuperación RED / YELLOW / GREEN | `#A63D2A` `#8F6400` `#2F6B4F` | `--color-mz-red` `--color-mz-yellow` `--color-mz-green` |
| Ring (foco) | `#B98267` | `--color-ring` |

**Color Notes:** base crema con tinta cálida y píldoras negras; ámbar/terracota/oliva solo como acentos. El estado de recuperación nunca va solo con color (siempre ícono + patrón + palabra, RNF-05). Sin modo oscuro (el sistema es claro, como la referencia).

### Typography

- **Font:** DM Sans (400/500/600/700) — sustituto libre de Sofia Pro.
- **Mood:** editorial, cálido, limpio; títulos grandes en peso 400/500 con tracking negativo.
- **Google Fonts:** [DM Sans](https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #059669;
  color: #000000;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #164E63;
  border: 2px solid #0891B2;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #ECFEFF;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0891B2;
  outline: none;
  box-shadow: 0 0 0 3px #0891B220;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Editorial cálido (hims.com) — implementado con Tailwind 4 en `src/styles.css`

**Keywords:** crema + tinta cálida, píldoras negras, hairlines en vez de sombras, tarjetas blancas 24px, gradientes suaves miel→arena, tipografía grande en peso 400/500

**Best For:** salud y bienestar con estética editorial y cercana

**Key Effects:** press suave (`scale(0.98)`), fundido de página, hoja inferior deslizante; `prefers-reduced-motion` respetado

### Page Pattern

**Pattern Name:** Tarjeta destacada sobre crema

- **Estructura móvil:** saludo + avatar → tarjeta destacada con gradiente miel (CTA negro + secundario outline) → buscador píldora → chips de macrozonas → accesos rápidos en tarjetas blancas → mapa (cuerpo 3D o lista) → barra inferior plana con hairline.
- **Estructura escritorio (lg):** sidebar blanca con hairline + contenido hasta ~1152px; el médico ve mapa e historial en dos columnas.
- **CTA Placement:** píldora negra dentro de la tarjeta destacada; acciones secundarias en outline.

---

## Anti-Patterns (Do NOT Use)

- ❌ Bright neon colors
- ❌ Motion-heavy animations
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
