import { useEffect, useState } from 'react';

interface RadarScores {
  industry: number;
  stock: number;
  macro: number;
  strategy: number;
  quant: number;
}

interface RadarChartProps {
  scores: RadarScores;
  maxScore?: number;
  size?: number;
}

const LABELS: Record<keyof RadarScores, string> = {
  industry: '行业研究',
  stock: '个股分析',
  macro: '宏观视野',
  strategy: '策略构建',
  quant: '量化思维',
};

export default function RadarChart({ scores, maxScore = 10, size = 300 }: RadarChartProps) {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    setAnimProgress(0);
    const timer = requestAnimationFrame(() => {
      setAnimProgress(1);
    });
    return () => cancelAnimationFrame(timer);
  }, [scores]);

  const center = size / 2;
  const radius = size * 0.35;
  const axes: (keyof RadarScores)[] = ['industry', 'stock', 'macro', 'strategy', 'quant'];
  const angleStep = (2 * Math.PI) / axes.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / maxScore) * radius * animProgress;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const axisEndPoints = axes.map((_, i) => getPoint(i, maxScore));
  const dataPoints = axes.map((key, i) => getPoint(i, scores[key]));

  const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid levels */}
      {gridLevels.map((level) => {
        const gridPoints = axes.map((_, i) => getPoint(i, maxScore * level));
        const points = gridPoints.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="#2A3040"
            strokeWidth={1}
          />
        );
      })}

      {/* Axis lines */}
      {axisEndPoints.map((p, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={p.x}
          y2={p.y}
          stroke="#2A3040"
          strokeWidth={1}
        />
      ))}

      {/* Data polygon fill */}
      <polygon
        points={polygonPoints}
        fill="rgba(212, 168, 83, 0.15)"
        stroke="#D4A853"
        strokeWidth={2}
        style={{ transition: 'all 0.6s ease-out' }}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#D4A853"
          stroke="#0F1419"
          strokeWidth={2}
          style={{ transition: 'all 0.6s ease-out' }}
        />
      ))}

      {/* Labels */}
      {axes.map((key, i) => {
        const angle = startAngle + i * angleStep;
        const labelRadius = radius + 28;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        const anchor = Math.abs(Math.cos(angle)) < 0.01 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
        const dy = Math.sin(angle) < -0.5 ? -4 : Math.sin(angle) > 0.5 ? 12 : 4;

        return (
          <text
            key={key}
            x={x}
            y={y + dy}
            textAnchor={anchor}
            fill="#8B95A5"
            fontSize={12}
            fontFamily="DM Sans, sans-serif"
          >
            {LABELS[key]}
          </text>
        );
      })}

      {/* Score values */}
      {axes.map((key, i) => {
        const p = dataPoints[i];
        return (
          <text
            key={`score-${key}`}
            x={p.x}
            y={p.y - 10}
            textAnchor="middle"
            fill="#D4A853"
            fontSize={11}
            fontWeight={600}
            fontFamily="DM Sans, sans-serif"
          >
            {scores[key]}
          </text>
        );
      })}
    </svg>
  );
}
