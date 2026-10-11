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

Paleta implementada en `src/styles.css` (@theme de Tailwind 4). Referencia: tarjeta rosa + lavanda del mockup aprobado.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background | `#F2EEFA` | `--color-app-bg` |
| Card | `#FFFFFF` | `--color-card` |
| Foreground (tinta) | `#241D3D` | `--color-plum` |
| Foreground strong | `#191231` | `--color-plum-strong` |
| Muted foreground | `#877FA3` | `--color-muted` |
| Primary (CTA) | `#6C4FD8` | `--color-primary` |
| Primary strong | `#5A3EC8` | `--color-primary-strong` |
| Primary soft (chips) | `#ECE6FB` | `--color-primary-soft` |
| Primary ink | `#4B2FA5` | `--color-primary-ink` |
| Hero card (rosa) | `#FBD8E6` | `--color-pink` / `--color-bubble` |
| Hero ink | `#B23C72` | `--color-pink-ink` |
| Tiles: sky / mint / lemon / peach | `#DBE9FD` `#D3F0E3` `#FDF0C8` `#FFE4CD` | `--color-sky` `--color-mint` `--color-lemon` `--color-peach` |
| Recuperación RED / YELLOW / GREEN | `#B3261E` `#8A6100` `#0D6A4A` | `--color-mz-red` `--color-mz-yellow` `--color-mz-green` |
| Ring (foco) | `#8B5CF6` | `--color-ring` |
| Dark: fondo / tarjeta | `#150F22` / `#201931` | `--color-app-bg-dark` `--color-card-dark` |

**Color Notes:** lavanda + rosa pastel con CTA morado; el estado de recuperación nunca va solo con color (siempre ícono + patrón + palabra, RNF-05).

### Typography

- **Font:** Nunito (400/600/700/800/900), una sola familia para todo.
- **Mood:** suave, redondeada, cercana; jerarquía con peso (800/900) y no con mayúsculas.
- **Google Fonts:** [Nunito](https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap)

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

**Style:** Soft pastel cards (mobile first) — implementado con Tailwind 4 en `src/styles.css`

**Keywords:** tarjetas redondeadas (24–28px), superficies planas, sombras muy suaves, lavanda/rosa, CTA morado, densidad táctil (≥44px), nav inferior flotante y sidebar en escritorio

**Best For:** apps de salud y bienestar con uso en una mano

**Key Effects:** press con muelle (`cubic-bezier(0.32, 0.72, 0, 1)`, 150ms), fundido de página, hoja inferior deslizante; `prefers-reduced-motion` respetado

### Page Pattern

**Pattern Name:** App shell con tarjeta destacada

- **Estructura móvil:** saludo + avatar → tarjeta destacada (rosa) con CTA → buscador → chips de macrozonas → accesos rápidos → mapa (cuerpo 3D o lista) → nav inferior flotante.
- **Estructura escritorio (lg):** sidebar fija + contenido hasta ~1152px; el médico ve mapa e historial en dos columnas.
- **CTA Placement:** dentro de la tarjeta destacada (primario morado) y accesos rápidos en tiles pastel.

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
