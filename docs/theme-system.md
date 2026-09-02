# Abqoor Theme System

Abqoor uses an explicit light/dark theme system. Light mode is the default product theme and does not follow browser or operating-system color preferences.

## Runtime Source

- Theme state lives in `apps/web/src/theme/theme.ts`.
- React reads and updates it through `apps/web/src/hooks/useTheme.ts`.
- The selected value is stored in `localStorage` under `abqoor.theme`.
- `apps/web/index.html` applies the stored value before the React bundle loads to avoid a flash of the wrong theme.

Allowed values:

- `light`
- `dark`

Any missing or invalid value falls back to `light`.

## Visual Tokens

Theme color values are centralized in `apps/web/src/theme.css`.

The primary token groups are:

- `--theme-*` for global canvas, text, surfaces, borders, shadows, states, and controls.
- `--abq-*`, `--product-*`, and `--abqoor-*` aliases for existing product pages and admin surfaces.
- `--home-*` for the public homepage journey.
- `--world-*` for the career hub, topic worlds, and study destination atmosphere.
- `--pre-exam-*` for the pre-exam entry screen.

Future theme changes should start in `theme.css` rather than editing individual component colors.

## Protected Exam Styling

The Actual Exam runtime is intentionally excluded from the theme refactor. Do not target `.exam-reference-*` selectors from the theme layer. Pre-Exam entry screens may use theme tokens, but the active exam interface should remain visually stable.
