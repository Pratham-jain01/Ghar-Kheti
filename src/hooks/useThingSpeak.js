import { useState, useEffect, useCallback, useRef } from 'react';
import { processSensorData, deriveActuatorStates, generateSmartAlerts, generateActivityLog } from '../utils/sensorUtils';

const CHANNEL_ID = import.meta.env.VITE_THINGSPEAK_CHANNEL_ID;
const API_KEY = import.meta.env.VITE_THINGSPEAK_READ_API_KEY;
const BASE_URL = `https://api.thingspeak.com/channels/${CHANNEL_ID}`;

// Field mapping from ThingSpeak
const FIELD_MAP = {
  field1: 'soilMoisture',   // raw analog (0–1023)
  field2: 'humidity',       // % from DHT
  field3: 'temperature',    // °C from DHT
  field4: 'rain',           // raw analog (0–4095)
  field5: 'ph',             // raw analog (0–1023)
};

// Generate realistic demo data with raw analog values matching ESP32 output
function generateDemoData(count = 24) {
  const now = new Date();
  const feeds = [];
  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 15 * 60 * 1000);
    feeds.push({
      created_at: time.toISOString(),
      soilMoisture: parseFloat((45 + Math.sin(i * 0.3) * 25 + Math.random() * 10).toFixed(1)),
      rain: parseFloat((Math.random() < 0.25 ? 400 + Math.random() * 300 : 850 + Math.random() * 150).toFixed(0)),
      temperature: parseFloat((28 + Math.sin(i * 0.25) * 6 + Math.random() * 2).toFixed(1)),
      humidity: parseFloat((55 + Math.cos(i * 0.2) * 15 + Math.random() * 5).toFixed(1)),
      ph: parseFloat((1350 + Math.sin(i * 0.15) * 200 + Math.random() * 100).toFixed(0)),
    });
  }
  return feeds;
}

function parseFeeds(rawFeeds) {
  return rawFeeds.map(feed => {
    const parsed = { created_at: feed.created_at };
    Object.entries(FIELD_MAP).forEach(([fieldKey, name]) => {
      const val = parseFloat(feed[fieldKey]);
      parsed[name] = isNaN(val) ? null : val;
    });
    return parsed;
  });
}

export function useThingSpeak(results = 50, pollInterval = 5000) {
  const [data, setData] = useState([]);
  const [latest, setLatest] = useState(null);
  const [processed, setProcessed] = useState(null);
  const [actuators, setActuators] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Track last entry_id to avoid redundant processing
  const lastEntryIdRef = useRef(null);

  const processLatest = useCallback((latestPoint, demoMode) => {
    const proc = processSensorData(latestPoint);
    setProcessed(proc);

    const acts = deriveActuatorStates(proc);
    setActuators(acts);

    const smartAlerts = generateSmartAlerts(proc, demoMode);
    setAlerts(smartAlerts);

    const activityLogs = generateActivityLog(proc, acts);
    setLogs(activityLogs);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const url = `${BASE_URL}/feeds.json?api_key=${API_KEY}&results=${results}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.feeds && json.feeds.length > 0) {
        const parsed = parseFeeds(json.feeds);
        const latestPoint = parsed[parsed.length - 1];

        // Only reprocess if data actually changed
        const entryId = json.feeds[json.feeds.length - 1]?.entry_id;
        const hasNewData = entryId !== lastEntryIdRef.current;

        setData(parsed);
        setLatest(latestPoint);
        setIsDemo(false);

        if (hasNewData) {
          lastEntryIdRef.current = entryId;
          processLatest(latestPoint, false);
        }
      } else {
        // No data from ThingSpeak — use demo data
        const demo = generateDemoData(24);
        const latestPoint = demo[demo.length - 1];
        setData(demo);
        setLatest(latestPoint);
        setIsDemo(true);
        processLatest(latestPoint, true);
      }

      setLastFetched(new Date());
      setError(null);
    } catch (err) {
      console.warn('ThingSpeak fetch failed, using demo data:', err.message);
      const demo = generateDemoData(24);
      const latestPoint = demo[demo.length - 1];
      setData(demo);
      setLatest(latestPoint);
      setIsDemo(true);
      setLastFetched(new Date());
      setError(err.message);
      processLatest(latestPoint, true);
    } finally {
      setLoading(false);
    }
  }, [results, processLatest]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [fetchData, pollInterval]);

  return {
    data,
    latest,
    processed,
    actuators,
    alerts,
    logs,
    loading,
    error,
    lastFetched,
    isDemo,
    refetch: fetchData,
  };
}
