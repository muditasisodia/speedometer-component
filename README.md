## Speedometer Component (V2)

A reusable SVG speedometer styled to match the provided design. It supports static one-time animation and perpetual sway between two values.

- File: `src/components/SpeedometerV2.tsx`
- Tech: React + TypeScript, SVG

### Quick start

```tsx
import SpeedometerV2 from "./components/SpeedometerV2";

export default function Example() {
  return (
    <div>
      {/* Static: animates from 0 -> 54 once on mount */}
      <SpeedometerV2
        startValue={0}
        endValue={54}
        type="free"
        perpetual={false}
        label="Your score"
        subLabel="Compared to your peers"
      />

      {/* Static: animates from 0 -> 83 once on mount */}
      <SpeedometerV2
        startValue={0}
        endValue={83}
        type="pro"
        perpetual={false}
        label="Most Pro users"
        subLabel="Benchmark"
      />

      {/* Perpetual: gently sways between 30 and 70 */}
      <SpeedometerV2
        startValue={30}
        endValue={70}
        type="free"
        perpetual={true}
        label="Your score"
        subLabel="Live"
      />
    </div>
  );
}
```

### Props (API)

- `startValue: number` (0–100)
  - Clamped to 0–100.
  - Static mode begins here and animates once toward `endValue`.
- `endValue: number` (0–100)
  - Clamped to 0–100.
- `type: "pro" | "free"`
  - Minimal palette switch (teal/green for `pro`, blue for `free`).
- `perpetual: boolean`
  - `false`: one-time animation from `startValue` to `endValue` on mount or prop change.
  - `true`: continuous sway between the two values.
- `label?: string`
  - Main caption under the large percentage.
  - Defaults to `"Your score"` for `free` and `"Most Pro users"` for `pro`.
- `subLabel?: string`
  - Second line under the label. Optional, but always rendered (empty string okay).

### Visual design/behavior

- Semi-circular track with light gray background and a gradient progress arc.
- The gradient runs along the arc (userSpaceOnUse) and the progress arc uses butt caps.
- The colored arc length follows the live percentage and hugs the needle.
- Needle is a center-anchored line with a small hub, extended to slightly protrude past the track.
- A white inner semicircle plus a white rectangle sit above the needle to create the label area.
- Accessibility: the wrapper `svg` has `role="img"`; wrapper `div` includes `aria-label`.

### Animation details

- Static mode (perpetual=false):
  - Starts almost immediately with a small initial boost toward the target (up to ~6%).
  - Remaining distance animates with a slightly irregular ease (faster start with a subtle, damped wobble).
  - Duration scales with the percentage delta (~24ms per 1%, clamped to ~180–2600ms).
  - CSS transitions are disabled during the JS-driven animation for exact timing; re-enabled after.
  - Re-runs if `startValue`/`endValue` props change. If you only want it on first mount, gate re-renders in the parent.

- Perpetual mode (perpetual=true):
  - Sine-wave sway between the clamped bounds; default period ~2600ms.

### Sizing and theming

Edit constants at the top of `SpeedometerV2.tsx` to fit your layout:

- `width = 300`, `height = 180`: overall SVG size.
- `trackStroke = 14`: arc thickness.
- `innerFillRadius`: white label semicircle radius (currently inset; reduced by 20px to reveal more needle).
- `innerRectHeight = 8`: white rectangle height under the semicircle.
- `needleOvershoot = 9`: how far the needle tip extends past the track.
- Animation tuning: `perPercentMs`, static easing function, perpetual `periodMs`.
- Palette values in the `palette` object per `type`.

### Edge cases and tips

- Values are clamped to 0–100; start may be > end (the component handles either order).
- If you ever notice a tiny seam at 0%, we intentionally use butt caps and bind progress to the needle to avoid a visible dot. A small mask could be added if a design requires it.
- The component uses `requestAnimationFrame` inside `useEffect`, so it runs only on the client.

### Example placements

- Dashboard cards at ~300×180 render nicely side-by-side.
- Use a wrapper to center the component and provide margins, e.g.

```tsx
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
  <SpeedometerV2 startValue={0} endValue={54} type="free" perpetual={false} label="Your score" subLabel="This month" />
  <SpeedometerV2 startValue={0} endValue={83} type="pro" perpetual={false} label="Most Pro users" subLabel="Benchmark" />
</div>
```

