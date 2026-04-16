import React, { useState } from 'react';
import { useThingSpeak } from './hooks/useThingSpeak';
import SystemStatusCard from './components/SystemStatusCard';
import MetricsGrid from './components/MetricsGrid';
import SensorCharts from './components/SensorCharts';
import ActuatorPanel from './components/ActuatorPanel';
import ActionLog from './components/ActionLog';
import WeatherWidget from './components/WeatherWidget';
import NotificationBar from './components/NotificationBar';

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function formatLastUpdate(date) {
  if (!date) return '--';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function App() {
  const {
    data, latest, processed, actuators, alerts, logs,
    loading, error, lastFetched, isDemo, refetch,
  } = useThingSpeak(50, 5000);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 600);
  };

  if (loading) {
    return (
      <div className="app-wrapper">
        <div className="bg-pattern" />
        <div className="dashboard-container" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', flexDirection: 'column', gap: '16px',
        }}>
          <div className="loading-spinner" />
          <p style={{ color: '#6b7280', fontWeight: 600, fontSize: '0.9rem' }}>
            Loading Ghar-Kheti Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="bg-pattern" />

      <div className="dashboard-container">
        {/* Header */}
        <header className="header" id="dashboard-header">
          <div className="header-brand">
            <div className="header-logo">🌱</div>
            <div className="header-text">
              <h1>Ghar-Kheti</h1>
              <p>Smart Rooftop Farm Dashboard</p>
            </div>
          </div>
          <div className="header-status">
            <div className={`status-badge ${isDemo ? 'offline' : 'online'}`}>
              <div className="status-dot" />
              {isDemo ? 'Demo Mode' : 'Live'}
            </div>
            <span className="last-update">
              Updated: {formatLastUpdate(lastFetched)}
            </span>
            <button
              className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              id="refresh-button"
            >
              <RefreshIcon />
              Refresh
            </button>
          </div>
        </header>

        {/* System Status Card */}
        <SystemStatusCard
          processed={processed}
          lastFetched={lastFetched}
          isDemo={isDemo}
        />

        {/* Notifications */}
        <NotificationBar alerts={alerts} />

        {/* Weather */}
        <WeatherWidget />

        {/* Sensor Readings */}
        <div className="section-row">
          <h2 className="section-title">Sensor Readings</h2>
        </div>
        <MetricsGrid processed={processed} />

        {/* Actuator Status */}
        <div className="section-row">
          <h2 className="section-title">Actuator Status</h2>
        </div>
        <div className="actuator-section-wrapper">
          <ActuatorPanel actuators={actuators} />
        </div>

        {/* Charts */}
        <div className="section-row">
          <h2 className="section-title">Trend Analysis</h2>
        </div>
        <SensorCharts data={data} />

        {/* Activity Log */}
        <div className="section-row">
          <h2 className="section-title">Activity Feed</h2>
        </div>
        <ActionLog logs={logs} />
      </div>
    </div>
  );
}

export default App;
