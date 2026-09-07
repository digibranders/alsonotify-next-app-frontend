'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

export interface ProgressChartDatum {
  name: string;
  value: number;
  color: string;
}

interface ProgressChartProps {
  /** Slices to draw. A single grey placeholder slice when the total is 0. */
  renderData: ProgressChartDatum[];
  total: number;
  /** Used in the empty-state copy: "No tasks this period". */
  title: string;
  dateRangeLabel?: string;
  onClick?: () => void;
}

/**
 * The donut from ProgressWidget, isolated so recharts can be code-split away
 * from the dashboard's first load. Rendered via next/dynamic by ProgressWidget.
 *
 * Moved verbatim — this is a bundling change, not a redesign.
 */
export default function ProgressChart({
  renderData,
  total,
  title,
  dateRangeLabel = 'this period',
  onClick,
}: ProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={renderData}
          cx="50%"
          cy="50%"
          innerRadius="68%"
          outerRadius="90%"
          paddingAngle={total === 0 ? 0 : 4}
          cornerRadius={total === 0 ? 0 : 4}
          dataKey="value"
          stroke="#ffffff"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {renderData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                if (total === 0) {
                  const itemType = title.toLowerCase();
                  let periodText = (dateRangeLabel || 'this period').toLowerCase();
                  if (periodText.includes(' - ')) {
                    periodText = 'this period';
                  }
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) - 8}
                        fill="#666666"
                        fontSize="10"
                        fontWeight="500"
                      >
                        No {itemType}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 8}
                        fill="#666666"
                        fontSize="10"
                        fontWeight="500"
                      >
                        {periodText}
                      </tspan>
                    </text>
                  );
                }

                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ cursor: onClick ? 'pointer' : 'default' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onClick) onClick();
                    }}
                  >
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) - 4}
                      fill="#111111"
                      fontSize="18"
                      fontWeight="800"
                    >
                      {total || 0}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 12}
                      fill="#999999"
                      fontSize="8"
                      fontWeight="600"
                      letterSpacing="0.05em"
                    >
                      TOTAL
                    </tspan>
                  </text>
                );
              }
              return null;
            }}
          />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
