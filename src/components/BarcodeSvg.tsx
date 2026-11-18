import React from 'react';

interface BarcodeSvgProps {
  value: string;
  height?: number;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  height = 42,
  className = '',
}) => {
  const bars: { x: number; w: number }[] = [];
  let cursor = 2;

  // Start guard bars
  bars.push({ x: cursor, w: 2 });
  cursor += 4;
  bars.push({ x: cursor, w: 1 });
  cursor += 3;

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const pattern = [
      ((code >> 0) & 1) + 1,
      ((code >> 1) & 1) + 1,
      ((code >> 2) & 1) + 1,
      ((code >> 3) & 1) + 1,
      ((code >> 4) & 1) + 1,
    ];
    for (let j = 0; j < pattern.length; j++) {
      if (j % 2 === 0) {
        bars.push({ x: cursor, w: pattern[j] });
      }
      cursor += pattern[j] + 1;
    }
  }

  // Stop guard bars
  bars.push({ x: cursor, w: 1 });
  cursor += 3;
  bars.push({ x: cursor, w: 2 });
  cursor += 4;

  return (
    <svg
      viewBox={`0 0 ${cursor} ${height}`}
      className={className}
      role="img"
      aria-label={`Barcode untuk ${value}`}
      preserveAspectRatio="none"
    >
      <rect x={0} y={0} width={cursor} height={height} fill="#ffffff" />
      {bars.map((b, idx) => (
        <rect
          key={idx}
          x={b.x}
          y={2}
          width={b.w}
          height={height - 4}
          fill="#0f172a"
        />
      ))}
    </svg>
  );
};

interface QrMatrixSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrMatrixSvg: React.FC<QrMatrixSvgProps> = ({
  value,
  size = 84,
  className = '',
}) => {
  const grid = 21;
  const cells: boolean[][] = Array.from({ length: grid }, () =>
    Array.from({ length: grid }, () => false)
  );

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, grid - 7);
  drawFinder(grid - 7, 0);

  let seed = 2166136261;
  for (let i = 0; i < value.length; i++) {
    seed ^= value.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= grid - 8;
      const inBottomLeft = r >= grid - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;

      if (r === 6 || c === 6) {
        cells[r][c] = (r + c) % 2 === 0;
        continue;
      }

      seed ^= (r * 31 + c * 17) | 0;
      seed = Math.imul(seed, 16777619);
      cells[r][c] = (seed >>> 28) % 2 === 0;
    }
  }

  const cellSize = 4;
  const total = grid * cellSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      className={className}
      role="img"
      aria-label={`Kode verifikasi QR untuk ${value}`}
    >
      <rect x={0} y={0} width={total} height={total} fill="#ffffff" />
      {cells.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#0f172a"
            />
          ) : null
        )
      )}
    </svg>
  );
};
