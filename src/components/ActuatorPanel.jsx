import React from 'react';

const ACTUATOR_CONFIG = [
  {
    id: 'pump',
    name: 'Water Pump',
    icon: '🚿',
    desc: 'Irrigation system',
    onLabel: 'ON',
    offLabel: 'OFF',
  },
  {
    id: 'mist',
    name: 'Misting System',
    icon: '🌫️',
    desc: 'Cooling mist',
    onLabel: 'ON',
    offLabel: 'OFF',
  },
  {
    id: 'shade',
    name: 'Shade Cover',
    icon: '☂️',
    desc: 'Sun protection',
    onLabel: 'OPEN',
    offLabel: 'CLOSED',
  },
];

export default function ActuatorPanel({ actuators }) {
  return (
    <div className="glass-card">
      <div className="actuator-section-title">Actuator Status</div>
      <div className="actuator-grid">
        {ACTUATOR_CONFIG.map(config => {
          const state = actuators?.[config.id];
          const active = state?.active ?? false;
          const label = state?.label ?? config.offLabel;
          const reason = state?.reason ?? 'Waiting for data...';

          return (
            <div
              key={config.id}
              className={`actuator-item ${active ? 'actuator-active' : ''}`}
            >
              <div className="actuator-info">
                <div className={`actuator-icon ${active ? 'actuator-icon-active' : ''}`}>
                  {config.icon}
                </div>
                <div className="actuator-text-block">
                  <div className="actuator-name">{config.name}</div>
                  <div className="actuator-reason">{reason}</div>
                </div>
              </div>
              <div className={`actuator-state-badge ${active ? 'active' : 'inactive'}`}>
                {active && <span className="actuator-pulse-dot" />}
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
