import React, { useState, useEffect } from 'react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Solapur coordinates (project location)
        const lat = 17.6599;
        const lon = 75.9064;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Asia/Kolkata`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.current) {
          setWeather({
            temp: json.current.temperature_2m,
            humidity: json.current.relative_humidity_2m,
            windSpeed: json.current.wind_speed_10m,
            code: json.current.weather_code,
          });
        }
      } catch (err) {
        console.warn('Weather fetch failed:', err);
        // Fallback data
        setWeather({ temp: 32, humidity: 55, windSpeed: 12, code: 1 });
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // 10 min
    return () => clearInterval(interval);
  }, []);

  function getWeatherInfo(code) {
    if (code <= 0) return { icon: '☀️', desc: 'Clear Sky' };
    if (code <= 3) return { icon: '⛅', desc: 'Partly Cloudy' };
    if (code <= 48) return { icon: '🌫️', desc: 'Foggy' };
    if (code <= 57) return { icon: '🌦️', desc: 'Drizzle' };
    if (code <= 67) return { icon: '🌧️', desc: 'Rain' };
    if (code <= 77) return { icon: '❄️', desc: 'Snow' };
    if (code <= 82) return { icon: '🌧️', desc: 'Rain Showers' };
    if (code <= 86) return { icon: '🌨️', desc: 'Snow Showers' };
    if (code <= 99) return { icon: '⛈️', desc: 'Thunderstorm' };
    return { icon: '🌤️', desc: 'Fair' };
  }

  if (loading) {
    return (
      <div className="glass-card weather-card">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  const { icon, desc } = getWeatherInfo(weather?.code ?? 1);

  return (
    <div className="glass-card weather-card">
      <div className="weather-header">
        <h3 className="weather-title">Weather Now</h3>
        <span className="weather-location">📍 Solapur, MH</span>
      </div>
      <div className="weather-main">
        <span className="weather-icon-large">{icon}</span>
        <div>
          <div className="weather-temp-large">{weather?.temp ?? '--'}°</div>
          <div className="weather-desc">{desc}</div>
        </div>
      </div>
      <div className="weather-details">
        <div className="weather-detail-item">
          <div className="weather-detail-value">{weather?.humidity ?? '--'}%</div>
          <div className="weather-detail-label">Humidity</div>
        </div>
        <div className="weather-detail-item">
          <div className="weather-detail-value">{weather?.windSpeed ?? '--'}</div>
          <div className="weather-detail-label">Wind km/h</div>
        </div>
        <div className="weather-detail-item">
          <div className="weather-detail-value">6.8</div>
          <div className="weather-detail-label">UV Index</div>
        </div>
      </div>
    </div>
  );
}
