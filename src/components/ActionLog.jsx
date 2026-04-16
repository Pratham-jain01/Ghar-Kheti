import React from 'react';

function formatLogTime(date) {
  if (!date) return '--';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

const TYPE_ICONS = {
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
  danger: '🚨',
};

export default function ActionLog({ logs }) {
  const displayLogs = (logs || []).slice(0, 15);

  return (
    <div className="glass-card log-panel">
      <div className="log-panel-header">
        <h3 className="log-panel-title">System Activity Log</h3>
        <span className="log-count">{displayLogs.length} events</span>
      </div>
      <ul className="log-list">
        {displayLogs.map(log => (
          <li key={log.id} className="log-item">
            <div className={`log-dot ${log.type}`} />
            <div className="log-content">
              <div className="log-message">
                <span className="log-type-icon">{TYPE_ICONS[log.type] || 'ℹ️'}</span>
                {log.message}
              </div>
              <div className="log-time">{formatLogTime(log.time)}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
