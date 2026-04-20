import React from 'react';

const METRICS_CONFIG = [
  {
    key: 'soil',
    label: 'Soil Moisture',
    icon: '💧',
    type: 'soil',
    rawUnit: '',
    showBar: true,
    barMax: 100,
  },
  {
    key: 'rain',
    label: 'Rain Sensor',
    icon: '🌧️',
    type: 'rain',
    rawUnit: '',
    showBar: false,
    barMax: 1023,
  },
  {
    key: 'temperature',
    label: 'Temperature',
    icon: '🌡️',
    type: 'temp',
    rawUnit: '°C',
    showBar: true,
    barMax: 50,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    icon: '💨',
    type: 'humidity',
    rawUnit: '%',
    showBar: true,
    barMax: 100,
  },
  {
    key: 'ph',
    label: 'pH Level',
    icon: '🧪',
    type: 'ph',
    rawUnit: '',
    showBar: false,
    barMax: 2048,
  },
];

function MetricCard({ config, sensorData }) {
  const isValid = sensorData?.validation?.isValid ?? false;
  const interp = sensorData?.interpretation;
  const raw = sensorData?.raw;
  const errorMsg = sensorData?.validation?.errorMessage;
  const errorType = sensorData?.validation?.errorType;

  // Determine card status class
  let statusClass = 'good';
  let statusLabel = 'N/A';
  let displayValue = '--';
  let detailValue = '--';

  if (!isValid) {
    statusClass = errorType === 'error' ? 'error' : 'warning';
    statusLabel = errorMsg || 'Error';
    displayValue = '--';
    detailValue = errorMsg || 'Error';
  } else if (interp) {
    statusClass = interp.color;
    statusLabel = `${interp.label} ${interp.emoji}`;
    displayValue = `${raw ?? '--'}${config.rawUnit}`;
    detailValue = `${interp.label} ${interp.emoji}`;
  }

  const barPercent = isValid && raw != null
    ? Math.min((raw / config.barMax) * 100, 100)
    : 0;

  return (
    <div className={`glass-card metric-card ${config.type} ${!isValid ? 'sensor-error' : ''}`}>
      <div className="metric-header">
        <div className={`metric-icon ${config.type}`}>{config.icon}</div>
        <span className={`metric-status ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className={`metric-value-status ${statusClass}`}>
        {displayValue}
      </div>
      <div className={`metric-detail-status ${statusClass}`}>
        {detailValue}
      </div>
      {isValid && raw != null && (
        <div className="metric-raw">
          Raw: {raw}{config.rawUnit}
        </div>
      )}
      <div className="metric-label">{config.label}</div>
      {config.showBar && isValid && (
        <div className="metric-bar">
          <div
            className={`metric-bar-fill ${config.type}`}
            style={{ width: `${barPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function MetricsGrid({ processed }) {
  return (
    <div className="metrics-grid">
      {METRICS_CONFIG.map(config => (
        <MetricCard
          key={config.key}
          config={config}
          sensorData={processed ? processed[config.key] : null}
        />
      ))}
    </div>
  );
}
