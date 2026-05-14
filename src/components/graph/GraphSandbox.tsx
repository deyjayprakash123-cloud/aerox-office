'use client';

import { useStore } from '@/store/useStore';
import {
  BarChart, Bar,
  LineChart, Line,
  ScatterChart, Scatter,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LabelList,
} from 'recharts';
import { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Circle, Layers, PieChart as PieIcon, Info } from 'lucide-react';

type ChartMode = 'bar' | 'line' | 'area' | 'scatter' | 'pie';

// ── Parse spreadsheet into chart data ────────────────────────────────────────
// Expects: Column A = labels, Column B (and beyond) = series values
// First row = header labels if non-numeric
function parseChartData(data: any[][]): {
  series: { name: string; data: { name: string; [key: string]: any }[] };
  headers: string[];
  hasData: boolean;
} {
  // Find how many columns have data (up to col F = col 5)
  const MAX_SERIES = 5;
  const seriesLabels: string[] = [];
  const rows: { name: string; [key: string]: any }[] = [];

  // Check if first row is a header (non-numeric in col B+)
  const firstRowIsHeader =
    data[0]?.[0] !== '' &&
    (isNaN(parseFloat(String(data[0]?.[1] ?? ''))) || data[0]?.[1] === '');

  const dataStartRow = firstRowIsHeader ? 1 : 0;

  // Determine series count
  let seriesCount = 1;
  for (let c = 1; c < Math.min(MAX_SERIES + 1, 26); c++) {
    let hasAnyValue = false;
    for (let r = dataStartRow; r < data.length; r++) {
      if (data[r]?.[c] !== '' && data[r]?.[c] !== null && data[r]?.[c] !== undefined) {
        hasAnyValue = true;
        break;
      }
    }
    if (hasAnyValue) seriesCount = c;
    else break;
  }

  // Series names from header row or default
  for (let c = 1; c <= seriesCount; c++) {
    seriesLabels.push(
      firstRowIsHeader
        ? String(data[0]?.[c] ?? `Series ${c}`)
        : `Series ${c}`
    );
  }

  // Build rows
  let hasData = false;
  for (let r = dataStartRow; r < data.length; r++) {
    const label = String(data[r]?.[0] ?? '');
    if (!label && data[r].every((v: any) => v === '' || v === null)) continue;

    const row: { name: string; [key: string]: any } = { name: label || `Row ${r + 1}` };
    for (let c = 1; c <= seriesCount; c++) {
      const raw = String(data[r]?.[c] ?? '');
      const val = parseFloat(raw.replace(/[^0-9.-]/g, ''));
      row[seriesLabels[c - 1]] = isNaN(val) ? 0 : val;
      if (!isNaN(val) && val !== 0) hasData = true;
    }
    rows.push(row);
  }

  return { series: { name: 'data', data: rows }, headers: seriesLabels, hasData };
}

// ── Colors ────────────────────────────────────────────────────────────────────
const COLORS = ['#00F2FF', '#7000FF', '#FF6B6B', '#FFD700', '#00FF88', '#FF8C00'];

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(5,5,5,0.95)',
  border: '1px solid rgba(0,242,255,0.25)',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '12px',
  fontFamily: 'JetBrains Mono, monospace',
};

// ── Chart mode button ─────────────────────────────────────────────────────────
function ModeBtn({
  id, icon: Icon, label, active, onClick,
}: {
  id: ChartMode; icon: any; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? 'bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40'
          : 'glass text-white/50 hover:text-white border border-transparent'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

export default function GraphSandbox() {
  const spreadsheetData = useStore((s) => s.spreadsheet.data);
  const [chartMode, setChartMode] = useState<ChartMode>('bar');

  const { series, headers, hasData } = useMemo(
    () => parseChartData(spreadsheetData),
    [spreadsheetData]
  );

  // Use sample data if grid is empty
  const SAMPLE = [
    { name: 'Q1 2024', Revenue: 142500, Expenses: 89200, Profit: 53300 },
    { name: 'Q2 2024', Revenue: 168200, Expenses: 94100, Profit: 74100 },
    { name: 'Q3 2024', Revenue: 195400, Expenses: 101800, Profit: 93600 },
    { name: 'Q4 2024', Revenue: 220800, Expenses: 110500, Profit: 110300 },
  ];
  const SAMPLE_HEADERS = ['Revenue', 'Expenses', 'Profit'];

  const displayData: { name: string; [key: string]: any }[] = hasData ? series.data : SAMPLE;
  const displayHeaders = hasData ? headers : SAMPLE_HEADERS;

  const modes: { id: ChartMode; icon: any; label: string }[] = [
    { id: 'bar', icon: BarChart3, label: 'Bar' },
    { id: 'line', icon: TrendingUp, label: 'Line' },
    { id: 'area', icon: Layers, label: 'Area' },
    { id: 'scatter', icon: Circle, label: 'Scatter' },
    { id: 'pie', icon: PieIcon, label: 'Pie' },
  ];

  // Shared axes
  const sharedAxes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
      <XAxis
        dataKey="name"
        stroke="rgba(255,255,255,0.2)"
        tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono' }}
        tickLine={false}
      />
      <YAxis
        stroke="rgba(255,255,255,0.2)"
        tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono' }}
        tickLine={false}
        axisLine={false}
      />
      <Tooltip contentStyle={TOOLTIP_STYLE} />
      <Legend
        wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'JetBrains Mono' }}
      />
    </>
  );

  const renderChart = () => {
    switch (chartMode) {
      case 'bar':
        return (
          <BarChart data={displayData} barCategoryGap="30%">
            {sharedAxes}
            {displayHeaders.map((h, i) => (
              <Bar key={h} dataKey={h} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={displayData}>
            {sharedAxes}
            {displayHeaders.map((h, i) => (
              <Line
                key={h}
                type="monotone"
                dataKey={h}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={displayData}>
            <defs>
              {displayHeaders.map((h, i) => (
                <linearGradient key={h} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            {sharedAxes}
            {displayHeaders.map((h, i) => (
              <Area
                key={h}
                type="monotone"
                dataKey={h}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                fill={`url(#grad-${i})`}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              stroke="rgba(255,255,255,0.2)"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.2)"
              tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            {displayHeaders.map((h, i) => (
              <Scatter
                key={h}
                name={h}
                data={displayData.map((d) => ({ name: d.name, value: d[h] }))}
                dataKey="value"
                fill={COLORS[i % COLORS.length]}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
          </ScatterChart>
        );

      case 'pie': {
        // Pie uses the first series only
        const seriesKey = displayHeaders[0] ?? 'value';
        const pieData = displayData.map((d, i) => ({
          name: d.name,
          value: d[seriesKey] ?? 0,
          fill: COLORS[i % COLORS.length],
        }));
        return (
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              innerRadius="40%"
              paddingAngle={3}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
              }
              labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
          </PieChart>
        );
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* Mode Selector */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {modes.map((m) => (
          <ModeBtn
            key={m.id}
            {...m}
            active={chartMode === m.id}
            onClick={() => setChartMode(m.id)}
          />
        ))}

        {!hasData && (
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[#00F2FF]/40 font-mono-aerox">
            <Info size={11} />
            Put labels in col A, numbers in B+ to chart your data
          </div>
        )}

        {hasData && (
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400/60 font-mono-aerox">
            ✓ Showing live grid data ({series.data.length} rows, {headers.length} series)
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
