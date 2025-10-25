import { useEffect, useMemo, useRef, useState, useId } from "react";

type GaugeType = "pro" | "free";

export interface SpeedometerV2Props {
  startValue: number; // 0 - 100
  endValue: number; // 0 - 100
  type: GaugeType; // visual style: "pro" | "free"
  perpetual: boolean; // needle oscillates between start and end when true
  label?: string; // large percentage label context, e.g. "Your score"
  subLabel?: string; // optional secondary line under label
}

const clampPercentage = (value: number): number => {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
};

const mapPercentToAngle = (percent: number, halfSweepDeg: number = 90): number => {
  // Map 0..100 to -halfSweep..+halfSweep degrees
  return -halfSweepDeg + (percent * (2 * halfSweepDeg)) / 100;
};

export default function SpeedometerV2({
  startValue,
  endValue,
  type,
  perpetual,
  label,
  subLabel,
}: SpeedometerV2Props) {
  // Layout tuned to resemble the screenshot proportions
  const width = 300;
  const baseHeight = 180;
  const centerX = width / 2;
  const trackStroke = 14 * 1.5; // thicker arc paths (1.5x), grows inward
  const arcInsetPx = 8; // used for track centerline inset

  // Droop configuration: how far each end dips below the horizontal
  const droopDeg = 14;

  // Estimate droop in pixels and expand height so arc isn't clipped
  // Use width-limited radius so geometry remains stable regardless of height
  const widthLimitedOuterRadius = centerX - 10;
  const widthLimitedRadius = widthLimitedOuterRadius - trackStroke / 2;
  const widthLimitedTrackRadius = widthLimitedRadius - arcInsetPx;
  const droopRad = (droopDeg * Math.PI) / 180;
  const droopExtraPx = Math.max(0, widthLimitedTrackRadius * Math.sin(droopRad));
  const height = baseHeight + Math.ceil(droopExtraPx) + 2; // add space BELOW for droop
  const centerY = baseHeight - 24; // keep visual anchor fixed; expand canvas downward
  const outerRadius = widthLimitedOuterRadius; // keep outer edge fixed by width
  const radius = widthLimitedRadius; // centerline shifted inward so thickness adds inside
  // White backdrop radius (reduced by 20px to reveal more needle)
  const innerFillRadius = Math.max(0, radius - trackStroke / 2 - 2 - 12);

  const clampedStart = useMemo(() => clampPercentage(startValue), [startValue]);
  const clampedEnd = useMemo(() => clampPercentage(endValue), [endValue]);

  // For static mode, begin at startValue and animate once to endValue
  const [displayPercent, setDisplayPercent] = useState<number>(clampedStart);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(false);

  // Color palettes inspired by the screenshot (left: blue, right: teal/green)
  const palette = useMemo(() => {
    return type === "pro"
      ? {
          // teal/green gradient
          gradStart: "#34d399", // emerald-400
          gradEnd: "#059669", // emerald-600
          bgArc: "#e5e7eb", // gray-200
          pointerFill: "#ffffff",
          pointerStroke: "#111827", // gray-900
          text: "#111827",
          subText: "#6b7280", // gray-500
        }
      : {
          // blue gradient
          gradStart: "#60a5fa", // blue-400
          gradEnd: "#1d4ed8", // blue-700
          bgArc: "#e5e7eb",
          pointerFill: "#ffffff",
          pointerStroke: "#111827",
          text: "#111827",
          subText: "#6b7280",
        };
  }, [type]);

  // Animate between bounds when perpetual; otherwise one-time animation from start->end
  useEffect(() => {
    if (!perpetual) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const from = clampedStart;
      const to = clampedEnd;
      const totalDelta = Math.abs(to - from);
      const sign = to >= from ? 1 : -1;
      const initialBoost = Math.min(6, totalDelta * 0.12);
      const boostedStart = from + sign * initialBoost;
      setDisplayPercent(boostedStart);
      const delta = Math.abs(to - boostedStart);
      const perPercentMs = 24;
      const durationMs = Math.min(2600, Math.max(180, delta * perPercentMs));
      // Irregular easing: quicker start with a subtle damped wobble
      const ease = (t: number) => {
        const fastStart = 1 - Math.pow(1 - t, 2.1); // faster at the beginning
        const wobble = 0.025 * Math.sin(t * Math.PI * 1.25) * (1 - t); // small, damped
        const v = fastStart + wobble;
        return v < 0 ? 0 : v > 1 ? 1 : v;
      };
      const startTs = performance.now();
      setIsAnimating(true);
      const step = () => {
        const now = performance.now();
        const t = Math.min(1, (now - startTs) / durationMs);
        const v = boostedStart + (to - boostedStart) * ease(t);
        setDisplayPercent(v);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          setIsAnimating(false);
        }
      };
      rafRef.current = requestAnimationFrame(step);
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        setIsAnimating(false);
      };
    }

    const min = Math.min(clampedStart, clampedEnd);
    const max = Math.max(clampedStart, clampedEnd);
    const center = (min + max) / 2;
    const amplitude = (max - min) / 2;
    const periodMs = 5200;

    let startTs = performance.now();
    const tick = () => {
      const now = performance.now();
      const t = (now - startTs) / periodMs;
      const value = center + amplitude * Math.sin(t * Math.PI * 2);
      setDisplayPercent(value);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [perpetual, clampedStart, clampedEnd]);

  // Smooth updates when not perpetual
  useEffect(() => {
    if (perpetual) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      setDisplayPercent(clampedEnd);
      return;
    }
    setDisplayPercent(clampedEnd);
  }, [perpetual, clampedEnd]);

  // Extend arc beyond a perfect semicircle by drooping ends down a bit
  const halfSweep = 90 + droopDeg; // total sweep = 180 + 2*droop
  const sweepDeg = 2 * halfSweep; // convenience
  const conicFromDeg = 180+droopDeg; // align 0deg with left-lower (drooped) endpoint in CSS coords

  const angle = mapPercentToAngle(displayPercent, halfSweep);
  const progressPercent = clampPercentage(displayPercent);

  // Arc path with drooped ends — bring closer to number by reducing radius ~8px
  const trackRadius = radius - arcInsetPx;
  // Start/end points for a >180° arc (large-arc flag = 1) with drooped ends
  const startAngleRad = ((180 - droopDeg) * Math.PI) / 180;
  const endAngleRad = (droopDeg * Math.PI) / 180;
  const startX = centerX + trackRadius * Math.cos(startAngleRad);
  const startY = centerY + trackRadius * Math.sin(startAngleRad);
  const endX = centerX + trackRadius * Math.cos(endAngleRad);
  const endY = centerY + trackRadius * Math.sin(endAngleRad);
  // Use large-arc (1) and sweep (1, CCW) to take the long way across the top
  const arcPath = `M ${startX} ${startY} A ${trackRadius} ${trackRadius} 0 1 1 ${endX} ${endY}`;
  // Inner white semicircle path (filled)
  const innerStartX = centerX - innerFillRadius;
  const innerEndX = centerX + innerFillRadius;
  const innerSemiPath = `M ${innerStartX} ${centerY} A ${innerFillRadius} ${innerFillRadius} 0 0 1 ${innerEndX} ${centerY} L ${centerX} ${centerY} Z`;
  const innerRectWidth = innerEndX - innerStartX;
  const innerRectHeight = 8;

  // Needle geometry (center-anchored line with hub)
  const needleOvershoot = 9; // ~8px more than before so it sticks out
  const needleLength = radius + trackStroke / 2 + needleOvershoot; // extend past the arc edge

  const gradientId = useId();
  const textGradientId = useId();
  const conicMaskId = useId();
  const innerRadialId = useId();

  // Runtime feature detect for CSS conic-gradient support (fallback to SVG stroke if unsupported)
  const supportsConic = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      // Using background-image ensures broad engines check the right feature
      return (window as any).CSS?.supports?.("background-image", "conic-gradient(#000, #fff)") ?? false;
    } catch {
      return false;
    }
  }, []);

  const percentText = `${Math.round(progressPercent)}%`;
  const mainLabel = label ?? (type === "pro" ? "Most Pro users" : "Your score");
  const secondary = subLabel ?? "";

  return (
    <div style={{ width, userSelect: "none" }} aria-label="SpeedometerV2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
          >
            {type === "free" ? (
              <>
                {/* Approximation of updated conic gradient across the semi-arc */}
                <stop offset="0%" stopColor="#F1FAFF" />
                <stop offset="50%" stopColor="#00B3F4" />
                <stop offset="100%" stopColor="#2944EF" />
              </>
            ) : (
              <>
                {/* Pro gradient: #30B7A4 (100%) -> #006166 (100%) -> #30B7A4 (0%) */}
                <stop offset="0%" stopColor="#D0EEEA" />
                <stop offset="60%" stopColor="#30B7A4" />
                <stop offset="100%" stopColor="#006166" />
              </>
            )}
          </linearGradient>
          {/* Vertical gradient for big percentage text (black to gray) */}
          <linearGradient id={textGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="86.36%" stopColor="#808080" />
            <stop offset="100%" stopColor="#808080" />
          </linearGradient>

          {/* Radial gradient for inner semicircle fade (opaque center -> transparent edge) */}
          <radialGradient id={innerRadialId} gradientUnits="userSpaceOnUse" cx={centerX} cy={centerY} r={innerFillRadius}>
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          {/* Mask that reveals only the current progress arc with the same thickness */}
          <mask id={conicMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <path
              d={arcPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={trackStroke}
              strokeLinecap="butt"
              pathLength={100}
              style={{
                transition: !perpetual && !isAnimating ? "stroke-dasharray 600ms ease-in-out" : undefined,
                strokeDasharray: `${progressPercent} ${100}`,
                strokeDashoffset: 0,
              }}
            />
          </mask>
        </defs>

        {/* Background arc (light gray) */}
        <path
          d={arcPath}
          fill="none"
          stroke={palette.bgArc}
          strokeWidth={trackStroke}
          strokeLinecap="butt"
          pathLength={100}
        />

        {/* Progress arc: use CSS conic gradient overlay when supported, otherwise fallback to SVG gradient stroke */}
        {supportsConic ? (
          <foreignObject x={0} y={0} width={width} height={height} mask={`url(#${conicMaskId})`} pointerEvents="none">
            <div
              style={{
                position: "relative",
                width: `${width}px`,
                height: `${height}px`,
              }}
            >
              {/* Centered square covering the circle area so the sweep centers at the gauge center */}
              <div
                style={{
                  position: "absolute",
                  left: `${centerX - outerRadius}px`,
                  top: `${centerY - outerRadius}px`,
                  width: `${outerRadius * 2}px`,
                  height: `${outerRadius * 2}px`,
                  borderRadius: "50%",
                  // Conic gradient aligned to sweep across the extended arc
                  backgroundImage:
                    (() => {
                      const mid = sweepDeg / 2;
                      if (type === "free") {
                        return `conic-gradient(from ${conicFromDeg}deg, #F1FAFF ${90-droopDeg*2}deg,rgb(84, 210, 255) ${mid}deg, #1378FB ${sweepDeg+90+droopDeg}deg)`;
                      }
                      return `conic-gradient(from ${conicFromDeg}deg,rgb(204, 232, 228) ${90-droopDeg*2}deg,rgb(138, 214, 196) ${mid}deg,rgb(0, 123, 10) ${sweepDeg+90+droopDeg}deg)`;
                    })(),
                }}
              />
            </div>
          </foreignObject>
        ) : (
          <path
            d={arcPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={trackStroke}
            strokeLinecap="butt"
            pathLength={100}
            style={{
              transition: !perpetual && !isAnimating ? "stroke-dasharray 600ms ease-in-out" : undefined,
              strokeDasharray: `${progressPercent} ${100}`,
              strokeDashoffset: 0,
            }}
          />
        )}

        

        {/* Needle: center-anchored line, oriented by angle */}
        <g
          style={{
            transition: !perpetual && !isAnimating ? "transform 600ms ease-in-out" : undefined,
            transformOrigin: `${centerX}px ${centerY}px`,
            transform: `rotate(${angle}deg)`,
          }}
        >
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX}
            y2={centerY - needleLength}
            stroke={palette.pointerStroke}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
        {/* Inner white semicircle above needle, below hub/text */}
        <path d={innerSemiPath} fill={`url(#${innerRadialId})`} />
        {/* White rectangle below semicircle (above needle) */}
        <rect
          x={innerStartX}
          y={centerY}
          width={innerRectWidth}
          height={innerRectHeight}
          fill="#ffffff"
        />

       

        {/* Big percentage number */}
        <text
          x={centerX}
          y={centerY - radius * 0.35}
          textAnchor="middle"
          dominantBaseline="central"
          fill={`url(#${textGradientId})`}
          style={{
            fontVariantNumeric: "lining-nums tabular-nums",
            fontFamily: "Inter",
            fontSize: "2.75rem",
            fontStyle: "normal",
            fontWeight: 500,
            lineHeight: "2.75rem",
          }}
        >
          <tspan>{percentText.replace("%", "")}</tspan>
          <tspan fontSize="1.1rem" dx="4" alignmentBaseline="central" dominantBaseline="central">%</tspan>
        </text>

        {/* Label(s) below the number */}
        <text
          x={centerX}
          y={centerY - radius * 0.15 + 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#000"
          style={{
            textAlign: "center",
            fontFamily: "Inter",
            fontSize: "1rem",
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "normal",
          }}
        >
          {mainLabel}
        </text>
        <text
          x={centerX}
          y={centerY - radius * 0.05}
          textAnchor="middle"
          dominantBaseline="central"
          fill={palette.subText}
          style={{ fontSize: 12, fontWeight: 400 }}
        >
          {secondary}
        </text>
      </svg>
    </div>
  );
}


