import React, { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((item, i) => (
        <div key={i} className="value" style={{ color: item.color }}>
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  );
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const CHART_CONFIGS = [
  {
    id: 'temp-humidity',
    title: 'Temperature & Humidity',
    icon: '🌡️',
    lines: [
      { key: 'temperature', name: 'Temp (°C)', color: '#ef4444', type: 'monotone' },
      { key: 'humidity', name: 'Humidity (%)', color: '#06b6d4', type: 'monotone' },
    ],
    yDomain: [0, 100],
    referenceLines: [
      { y: 32, stroke: '#ef4444', strokeDasharray: '6 4', label: '32°C Threshold' },
    ],
  },
  {
    id: 'soil-rain',
    title: 'Soil Moisture & Rain',
    icon: '💧',
    lines: [
      { key: 'soilMoisture', name: 'Soil Moisture', color: '#3b82f6', type: 'monotone' },
      { key: 'rain', name: 'Rain Sensor', color: '#8b5cf6', type: 'monotone' },
    ],
    yDomain: [0, 1100],
    referenceLines: [
      { y: 800, stroke: '#8b5cf6', strokeDasharray: '6 4', label: 'Rain Threshold (800)' },
      { y: 40, stroke: '#3b82f6', strokeDasharray: '6 4', label: 'Dry Threshold (40)' },
    ],
  },
  {
    id: 'ph',
    title: 'pH Sensor',
    icon: '🧪',
    lines: [
      { key: 'ph', name: 'pH (raw)', color: '#f59e0b', type: 'monotone' },
    ],
    yDomain: [0, 2100],
    referenceLines: [
      { y: 1400, stroke: '#ef4444', strokeDasharray: '6 4', label: 'Acidic (<1400)' },
      { y: 1600, stroke: '#3b82f6', strokeDasharray: '6 4', label: 'Alkaline (>1600)' },
    ],
  },
];

export default function SensorCharts({ data }) {
  const [timeRange, setTimeRange] = useState('all');

  const filteredData = (() => {
    if (timeRange === 'all') return data;
    const now = new Date();
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 12;
    const cutoff = new Date(now.getTime() - hours * 3600000);
    return data.filter(d => new Date(d.created_at) >= cutoff);
  })();

  const chartData = filteredData.map(d => ({
    ...d,
    time: formatTime(d.created_at),
  }));

  return (
    <div className="charts-section">
      {CHART_CONFIGS.map(config => (
        <div key={config.id} className="glass-card chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <span className="chart-icon">{config.icon}</span>
              {config.title}
            </h3>
            <div className="chart-time-selector">
              {['1h', '6h', '12h', 'all'].map(range => (
                <button
                  key={range}
                  className={`chart-time-btn ${timeRange === range ? 'active' : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range === 'all' ? 'All' : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-placeholder">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  {config.lines.map(line => (
                    <linearGradient key={line.key} id={`grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={line.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={line.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={config.yDomain}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {config.referenceLines?.map((rl, i) => (
                  <ReferenceLine
                    key={i}
                    y={rl.y}
                    stroke={rl.stroke}
                    strokeDasharray={rl.strokeDasharray}
                    label={{
                      value: rl.label,
                      position: 'insideTopRight',
                      fill: rl.stroke,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                ))}
                {config.lines.map(line => (
                  <Area
                    key={line.key}
                    type={line.type}
                    dataKey={line.key}
                    name={line.name}
                    stroke={line.color}
                    strokeWidth={2.5}
                    fill={`url(#grad-${line.key})`}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
