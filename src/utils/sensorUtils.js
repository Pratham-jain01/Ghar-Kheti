/**
 * sensorUtils.js
 * Pure utility functions for sensor validation, interpretation,
 * actuator state derivation, smart alerts, and activity log generation.
 *
 * ThingSpeak field mapping:
 *   field1 = Soil Moisture (raw analog 0–1023)
 *   field2 = Rain Sensor   (raw analog 0–1023)
 *   field3 = Temperature   (°C, DHT11/22)
 *   field4 = Humidity       (%, DHT11/22)
 *   field5 = pH Sensor     (raw analog 0–1023)
 */

// ─── Sensor Validation ──────────────────────────────────────────────
// Returns { isValid, errorType, errorMessage } for each sensor

export function validateSoil(raw) {
  if (raw === null || raw === undefined) return { isValid: false, errorType: 'error', errorMessage: 'No data received' };
  if (raw === 0) return { isValid: false, errorType: 'warning', errorMessage: 'Check Sensor ⚠️' };
  return { isValid: true, errorType: null, errorMessage: null };
}

export function validateHumidity(raw) {
  if (raw === null || raw === undefined) return { isValid: false, errorType: 'error', errorMessage: 'No data received' };
  const val = Math.max(0, Math.min(100, parseFloat(raw)));
  if (isNaN(val)) return { isValid: false, errorType: 'error', errorMessage: 'Sensor Error ❌' };
  return { isValid: true, errorType: null, errorMessage: null };
}

export function validatePH(raw) {
  if (raw === null || raw === undefined) return { isValid: false, errorType: 'error', errorMessage: 'No data received' };
  if (raw === 0) return { isValid: false, errorType: 'error', errorMessage: 'Sensor Error ❌' };
  return { isValid: true, errorType: null, errorMessage: null };
}

export function validateTemperature(raw) {
  if (raw === null || raw === undefined) return { isValid: false, errorType: 'error', errorMessage: 'No data received' };
  if (raw < -40 || raw > 80) return { isValid: false, errorType: 'error', errorMessage: 'Sensor Error ❌' };
  return { isValid: true, errorType: null, errorMessage: null };
}

export function validateRain(raw) {
  if (raw === null || raw === undefined) return { isValid: false, errorType: 'error', errorMessage: 'No data received' };
  return { isValid: true, errorType: null, errorMessage: null };
}

// ─── Sensor Interpretation ──────────────────────────────────────────
// Converts raw values into meaningful human-readable status labels

export function interpretSoil(raw) {
  if (raw < 40)  return { label: 'Dry',    emoji: '⚠️', color: 'danger',  status: 'dry' };
  if (raw <= 70) return { label: 'Normal', emoji: '✅', color: 'good',    status: 'normal' };
  return                 { label: 'Wet',    emoji: '💧', color: 'info',    status: 'wet' };
}

export function interpretRain(raw) {
  if (raw < 2500) return { label: 'Rain Detected', emoji: '🌧️', color: 'info',  status: 'rain' };
  return                 { label: 'No Rain',       emoji: '☀️', color: 'good',  status: 'clear' };
}

export function interpretTemperature(raw) {
  if (raw > 36)  return { label: 'High',   emoji: '🔥', color: 'danger',  status: 'high' };
  return                { label: 'Normal', emoji: '✅', color: 'good',    status: 'normal' };
}

export function interpretHumidity(raw) {
  const clamped = Math.max(0, Math.min(100, raw));
  if (clamped < 30)  return { label: 'Low',    emoji: '⚠️', color: 'warning', status: 'low',    value: clamped };
  if (clamped > 85)  return { label: 'High',   emoji: '💦', color: 'warning', status: 'high',   value: clamped };
  return                    { label: 'Normal', emoji: '✅', color: 'good',    status: 'normal', value: clamped };
}

export function interpretPH(raw) {
  if (raw < 1400) return { label: 'Acidic',   emoji: '🧪', color: 'warning', status: 'acidic' };
  if (raw <= 1600) return { label: 'Neutral',  emoji: '⚖️', color: 'good',    status: 'neutral' };
  return                  { label: 'Alkaline', emoji: '🧴', color: 'info',    status: 'alkaline' };
}

// ─── Full Sensor Processing ─────────────────────────────────────────
// Validates AND interprets all sensors from a single data point

export function processSensorData(dataPoint) {
  if (!dataPoint) return null;

  const soil = {
    raw: dataPoint.soilMoisture,
    validation: validateSoil(dataPoint.soilMoisture),
    interpretation: dataPoint.soilMoisture != null ? interpretSoil(dataPoint.soilMoisture) : null,
  };

  const rain = {
    raw: dataPoint.rain,
    validation: validateRain(dataPoint.rain),
    interpretation: dataPoint.rain != null ? interpretRain(dataPoint.rain) : null,
  };

  const temperature = {
    raw: dataPoint.temperature,
    validation: validateTemperature(dataPoint.temperature),
    interpretation: dataPoint.temperature != null ? interpretTemperature(dataPoint.temperature) : null,
  };

  const humidityRaw = dataPoint.humidity;
  const humidityVal = validateHumidity(humidityRaw);
  const humidity = {
    raw: humidityRaw,
    validation: humidityVal,
    interpretation: humidityVal.isValid ? interpretHumidity(humidityRaw) : null,
  };

  const ph = {
    raw: dataPoint.ph,
    validation: validatePH(dataPoint.ph),
    interpretation: dataPoint.ph != null && dataPoint.ph !== 0 ? interpretPH(dataPoint.ph) : null,
  };

  const allValid = soil.validation.isValid
    && rain.validation.isValid
    && temperature.validation.isValid
    && humidity.validation.isValid
    && ph.validation.isValid;

  const errorSensors = [];
  if (!soil.validation.isValid) errorSensors.push({ name: 'Soil Moisture', ...soil.validation });
  if (!rain.validation.isValid) errorSensors.push({ name: 'Rain Sensor', ...rain.validation });
  if (!temperature.validation.isValid) errorSensors.push({ name: 'Temperature', ...temperature.validation });
  if (!humidity.validation.isValid) errorSensors.push({ name: 'Humidity', ...humidity.validation });
  if (!ph.validation.isValid) errorSensors.push({ name: 'pH Sensor', ...ph.validation });

  return {
    soil,
    rain,
    temperature,
    humidity,
    ph,
    allValid,
    errorSensors,
    timestamp: dataPoint.created_at,
  };
}

// ─── Actuator State Derivation ──────────────────────────────────────
// Determines actuator ON/OFF states based on sensor data & logic

export function deriveActuatorStates(processed) {
  if (!processed) {
    return {
      pump:  { active: false, label: 'OFF', reason: 'Waiting for sensor data' },
      mist:  { active: false, label: 'OFF', reason: 'Waiting for sensor data' },
      shade: { active: false, label: 'CLOSED', reason: 'Waiting for sensor data' },
    };
  }

  const soilDry = processed.soil.validation.isValid && processed.soil.interpretation?.status === 'dry';
  const isRaining = processed.rain.validation.isValid && processed.rain.interpretation?.status === 'rain';
  const tempHigh = processed.temperature.validation.isValid && processed.temperature.interpretation?.status === 'high';

  // Pump: ON when soil is dry AND no rain
  const pumpActive = soilDry && !isRaining;
  const pump = {
    active: pumpActive,
    label: pumpActive ? 'ON' : 'OFF',
    reason: pumpActive
      ? 'Soil dry, no rain — irrigating'
      : soilDry && isRaining
        ? 'Soil dry, but rain detected — pump paused'
        : 'Soil moisture adequate',
  };

  // Mist: ON when temperature > 32°C
  const mistActive = tempHigh;
  const mist = {
    active: mistActive,
    label: mistActive ? 'ON' : 'OFF',
    reason: mistActive
      ? `High temperature (${processed.temperature.raw}°C) — cooling active`
      : 'Temperature normal',
  };

  // Shade: OPEN when temperature > 32°C
  const shadeActive = tempHigh;
  const shade = {
    active: shadeActive,
    label: shadeActive ? 'OPEN' : 'CLOSED',
    reason: shadeActive
      ? `High temperature (${processed.temperature.raw}°C) — shade deployed`
      : 'Temperature normal — shade retracted',
  };

  return { pump, mist, shade };
}

// ─── Smart Alert Generation ─────────────────────────────────────────

export function generateSmartAlerts(processed, isDemo) {
  const alerts = [];

  if (isDemo) {
    alerts.push({
      id: 'demo',
      type: 'info',
      icon: 'ℹ️',
      text: 'Displaying demo data — connect your ESP32 to see real sensor readings.',
    });
  }

  if (!processed) return alerts;

  // Sensor errors first (highest priority)
  processed.errorSensors.forEach(sensor => {
    alerts.push({
      id: `error-${sensor.name}`,
      type: 'danger',
      icon: '🚨',
      text: `${sensor.name}: ${sensor.errorMessage} — check wiring and connections.`,
    });
  });

  // Intelligent contextual alerts
  if (processed.soil.validation.isValid && processed.soil.interpretation?.status === 'dry') {
    const isRaining = processed.rain.interpretation?.status === 'rain';
    alerts.push({
      id: 'soil-dry',
      type: 'warning',
      icon: '🏜️',
      text: isRaining
        ? 'Soil is critically dry — rain detected, pump paused to avoid waterlogging.'
        : 'Soil is critically dry — irrigation triggered automatically.',
    });
  }

  if (processed.temperature.validation.isValid && processed.temperature.interpretation?.status === 'high') {
    alerts.push({
      id: 'temp-high',
      type: 'warning',
      icon: '🔥',
      text: `High temperature (${processed.temperature.raw}°C) — shade deployed and mist activated.`,
    });
  }

  if (processed.rain.validation.isValid && processed.rain.interpretation?.status === 'rain') {
    alerts.push({
      id: 'rain-detected',
      type: 'info',
      icon: '🌧️',
      text: 'Rain detected — outdoor irrigation paused to conserve water.',
    });
  }

  if (processed.ph.validation.isValid && processed.ph.interpretation?.status === 'acidic') {
    alerts.push({
      id: 'ph-acidic',
      type: 'warning',
      icon: '🧪',
      text: 'Soil pH is acidic — consider adding lime to balance acidity.',
    });
  }

  if (processed.humidity.validation.isValid && processed.humidity.interpretation?.status === 'low') {
    alerts.push({
      id: 'humidity-low',
      type: 'info',
      icon: '💨',
      text: 'Low ambient humidity detected — misting may help protect crops.',
    });
  }

  return alerts;
}

// ─── Activity Log Generation ────────────────────────────────────────
// Generates action-based log entries from sensor data

export function generateActivityLog(processed, actuators) {
  const now = new Date();
  const logs = [];
  let id = 1;

  const addLog = (type, message, minutesAgo = 0) => {
    logs.push({
      id: id++,
      type,
      message,
      time: new Date(now.getTime() - minutesAgo * 60000),
    });
  };

  if (!processed) {
    addLog('info', 'Waiting for sensor data...', 0);
    return logs;
  }

  // Sensor errors
  processed.errorSensors.forEach(sensor => {
    addLog('danger', `${sensor.name}: ${sensor.errorMessage} → Manual inspection recommended`, 1);
  });

  // Actuator actions
  if (actuators.pump.active) {
    addLog('success', 'Soil moisture low → Pump activated for irrigation', 2);
  }

  if (actuators.mist.active) {
    addLog('success', `High temperature (${processed.temperature.raw}°C) → Mist system activated`, 3);
  }

  if (actuators.shade.active) {
    addLog('success', `High temperature (${processed.temperature.raw}°C) → Shade cover deployed`, 3);
  }

  if (processed.rain.validation.isValid && processed.rain.interpretation?.status === 'rain') {
    addLog('info', 'Rain detected → Outdoor irrigation paused', 5);
  }

  // Normal status reports
  if (processed.soil.validation.isValid && processed.soil.interpretation?.status === 'normal') {
    addLog('success', `Soil moisture optimal (${processed.soil.raw}) → No irrigation needed`, 8);
  }

  if (processed.ph.validation.isValid) {
    const phInt = processed.ph.interpretation;
    if (phInt) {
      addLog(
        phInt.status === 'neutral' ? 'success' : 'info',
        `pH reading: ${phInt.label} (${processed.ph.raw}) → ${phInt.status === 'neutral' ? 'Ideal for crops' : 'Monitor required'}`,
        10
      );
    }
  }

  if (processed.humidity.validation.isValid) {
    addLog('info', `Humidity at ${processed.humidity.raw}% → ${processed.humidity.interpretation?.label}`, 12);
  }

  if (processed.allValid) {
    addLog('success', 'All sensors reporting normal readings → System healthy', 15);
  }

  addLog('info', 'Data synced to ThingSpeak cloud successfully', 18);
  addLog('success', 'System initialized — all modules online', 25);

  return logs;
}
