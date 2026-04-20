import React, { useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const fullTime = payload?.[0]?.payload?.created_at
    ? new Date(payload[0].payload.created_at).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    : label;
  return (
    <div className="custom-tooltip">
      <div className="label">{fullTime}</div>
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

function formatDateTime(isoString) {
  if (!isoString) return '--';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatMetric(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  const abs = Math.abs(value);
  if (abs >= 1000) return Math.round(value).toString();
  if (abs >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

function getTrend(values) {
  if (values.length < 2) return { label: 'Stable', icon: '→' };
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const delta = last - prev;
  if (Math.abs(delta) < 0.01) return { label: 'Stable', icon: '→' };
  return delta > 0
    ? { label: 'Rising', icon: '↑' }
    : { label: 'Falling', icon: '↓' };
}

function getSeriesStats(data, lineKey) {
  const values = data
    .map(point => Number(point[lineKey]))
    .filter(val => Number.isFinite(val));

  if (!values.length) {
    return {
      hasData: false,
      current: null,
      min: null,
      max: null,
      avg: null,
      trend: { label: 'Stable', icon: '→' },
    };
  }

  const current = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  return {
    hasData: true,
    current,
    min,
    max,
    avg,
    trend: getTrend(values),
  };
}

function getDynamicYDomain(config, data) {
  const allValues = config.lines.flatMap(line => (
    data
      .map(point => Number(point[line.key]))
      .filter(val => Number.isFinite(val))
  ));

  if (!allValues.length) return config.yDomain;

  const maxData = Math.max(...allValues);
  const baseMin = config.yDomain?.[0] ?? 0;
  const baseMax = config.yDomain?.[1] ?? maxData;
  const paddedMax = Math.max(baseMax, Math.ceil((maxData * 1.08) / 10) * 10);
  return [baseMin, paddedMax];
}

const CHART_CONFIGS = [
  {
    id: 'temp-humidity',
    title: 'Temperature & Humidity',
    icon: '🌡️',
    lines: [
      { key: 'temperature', name: 'Temp', color: '#ef4444', type: 'monotone', unit: '°C' },
      { key: 'humidity', name: 'Humidity', color: '#06b6d4', type: 'monotone', unit: '%' },
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
      { key: 'soilMoisture', name: 'Soil Moisture', color: '#3b82f6', type: 'monotone', unit: '' },
      { key: 'rain', name: 'Rain Sensor', color: '#8b5cf6', type: 'monotone', unit: '' },
    ],
    yDomain: [0, 4200],
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
      { key: 'ph', name: 'pH (raw)', color: '#f59e0b', type: 'monotone', unit: '' },
    ],
    yDomain: [0, 3200],
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
      {CHART_CONFIGS.map(config => {
        const yDomain = getDynamicYDomain(config, chartData);
        const latestIso = chartData.length ? chartData[chartData.length - 1].created_at : null;
        const seriesStats = config.lines.map(line => ({
          ...line,
          stats: getSeriesStats(chartData, line.key),
        }));

        return (
        <div key={config.id} className="glass-card chart-card">
          <div className="chart-card-header">
            <h3 className="chart-card-title">
              <span className="chart-icon">{config.icon}</span>
              {config.title}
            </h3>
            <div className="chart-header-actions">
              <span className="chart-meta-chip">Samples: {chartData.length}</span>
              <span className="chart-meta-chip">Updated: {formatDateTime(latestIso)}</span>
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
          </div>
          <div className="chart-insights-grid">
            {seriesStats.map(series => (
              <div key={series.key} className="chart-insight-card">
                <div className="chart-insight-head">
                  <span className="chart-insight-dot" style={{ backgroundColor: series.color }} />
                  <span className="chart-insight-name">{series.name}</span>
                  <span className="chart-insight-trend">{series.stats.trend.icon} {series.stats.trend.label}</span>
                </div>
                <div className="chart-insight-values">
                  <span>Now: {formatMetric(series.stats.current)}{series.unit}</span>
                  <span>Avg: {formatMetric(series.stats.avg)}{series.unit}</span>
                  <span>Min: {formatMetric(series.stats.min)}{series.unit}</span>
                  <span>Max: {formatMetric(series.stats.max)}{series.unit}</span>
                </div>
              </div>
            ))}
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
                  domain={yDomain}
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
                    name={`${line.name}${line.unit ? ` (${line.unit})` : ''}`}
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
      )})}
    </div>
  );
}
