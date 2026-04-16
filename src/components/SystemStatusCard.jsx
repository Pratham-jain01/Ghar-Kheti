import React from 'react';

export default function SystemStatusCard({ processed, lastFetched, isDemo }) {
  const allValid = processed?.allValid ?? false;
  const errorSensors = processed?.errorSensors ?? [];

  const statusOk = allValid && !isDemo;
  const statusClass = statusOk ? 'system-status-ok' : 'system-status-warn';

  function formatTimestamp(date) {
    if (!date) return '--';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  return (
    <div className={`glass-card system-status-card ${statusClass}`} id="system-status">
      <div className="system-status-left">
        <div className={`system-status-indicator ${statusOk ? 'ok' : 'warn'}`}>
          <div className="system-status-dot" />
        </div>
        <div className="system-status-info">
          <h2 className="system-status-title">System Status</h2>
          <p className="system-status-message">
            {statusOk
              ? 'All Systems Operational ✅'
              : isDemo
                ? 'Demo Mode — No Live Sensors 📡'
                : `Sensor Issue Detected ⚠️ — ${errorSensors.map(s => s.name).join(', ')}`
            }
          </p>
        </div>
      </div>
      <div className="system-status-right">
        <div className="system-status-timestamp">
          <span className="system-status-timestamp-label">Last Updated</span>
          <span className="system-status-timestamp-value">{formatTimestamp(lastFetched)}</span>
        </div>
      </div>
    </div>
  );
}
