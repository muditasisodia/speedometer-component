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

const mapPercentToAngle = (percent: number): number => {
  // Map 0..100 to -90..+90 degrees (semi-circle)
  return -90 + (percent * 180) / 100;
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
  const height = 180;
  const centerX = width / 2;
  const centerY = height - 24; // padding for labels and bottom
  const radius = Math.min(centerX, centerY) - 10;
  const trackStroke = 14; // stroke width of the arc paths
  // White backdrop radius (reduced by 20px to reveal more needle)
  const innerFillRadius = Math.max(0, radius - trackStroke / 2 - 2 - 20);

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
    const periodMs = 2600;

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

  const angle = mapPercentToAngle(displayPercent);
  const progressPercent = clampPercentage(displayPercent);

  // Arc path (semi-circle)
  const startX = centerX - radius;
  const startY = centerY;
  const endX = centerX + radius;
  const endY = centerY;
  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
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
            <stop offset="0%" stopColor={palette.gradStart} />
            <stop offset="100%" stopColor={palette.gradEnd} />
          </linearGradient>
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

        {/* Progress arc with gradient following the needle */}
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
        <path d={innerSemiPath} fill="#ffffff" />
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
          fill={palette.text}
          style={{ fontSize: 38, fontWeight: 700, letterSpacing: -0.5 }}
        >
          {percentText}
        </text>

        {/* Label(s) below the number */}
        <text
          x={centerX}
          y={centerY - radius * 0.15}
          textAnchor="middle"
          dominantBaseline="central"
          fill={palette.subText}
          style={{ fontSize: 14, fontWeight: 500 }}
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


