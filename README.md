
# Ghar-Kheti

Smart rooftop farming dashboard for monitoring IoT sensor data and visualizing automation decisions in real time.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-Not%20Specified-lightgrey)
![Status](https://img.shields.io/badge/Status-Active-success)

The app is built with React + Vite and consumes ThingSpeak feeds for live readings. If cloud data is unavailable, it automatically switches to demo data so the UI and logic remain usable.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Flow](#data-flow)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Hardware and Cloud Setup](#hardware-and-cloud-setup)
- [Current Automation Rules](#current-automation-rules)
- [Screenshots](#screenshots)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

Ghar-Kheti provides a single-pane dashboard for:

- Sensor health and system status
- Live metric interpretation (soil, rain, temperature, humidity, pH)
- Rule-based actuator states (pump, mist, shade)
- Smart alerts and a readable activity timeline
- Trend charts for recent sensor behavior
- Local weather context (Open-Meteo)

## Key Features

- Live + fallback mode:
	- Polls ThingSpeak periodically for latest readings
	- Falls back to generated demo data on API/network failure
- Sensor processing pipeline:
	- Validates sensor values
	- Interprets values into status categories
	- Computes overall system health and error sensors
- Automation logic:
	- Pump ON when soil is dry and rain is not detected
	- Mist and shade activate on high temperature conditions
- Decision transparency:
	- Human-readable alert messages
	- Activity feed explaining why actions were triggered
- Interactive charts:
	- Time range filters (`1h`, `6h`, `12h`, `all`)
	- Threshold reference lines for critical values

## Tech Stack

- React 19
- Vite 7
- Recharts (trend visualizations)
- Tailwind CSS 4 (with custom CSS variables and glassmorphism styling)
- ESLint 9

## Project Structure

```text
.
|-- index.html
|-- src/
|   |-- App.jsx
|   |-- main.jsx
|   |-- index.css
|   |-- components/
|   |   |-- SystemStatusCard.jsx
|   |   |-- MetricsGrid.jsx
|   |   |-- SensorCharts.jsx
|   |   |-- ActuatorPanel.jsx
|   |   |-- NotificationBar.jsx
|   |   |-- ActionLog.jsx
|   |   `-- WeatherWidget.jsx
|   |-- hooks/
|   |   `-- useThingSpeak.js
|   `-- utils/
|       `-- sensorUtils.js
|-- tailwind.config.js
|-- postcss.config.js
|-- vite.config.js
`-- eslint.config.js
```

## Data Flow

1. `useThingSpeak` fetches ThingSpeak feeds (`results=50`, polling interval `5000ms`).
2. Raw fields are mapped to domain keys:
	 - `field1 -> soilMoisture`
	 - `field2 -> rain`
	 - `field3 -> temperature`
	 - `field4 -> humidity`
	 - `field5 -> ph`
3. `processSensorData` validates and interprets the latest datapoint.
4. `deriveActuatorStates`, `generateSmartAlerts`, and `generateActivityLog` build dashboard intelligence.
5. Components render current status, notifications, charts, and logs.

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_THINGSPEAK_CHANNEL_ID=your_channel_id
VITE_THINGSPEAK_READ_API_KEY=your_read_api_key
```

Notes:

- Without valid ThingSpeak credentials or when API calls fail, the app runs in Demo Mode automatically.
- Weather data is fetched from Open-Meteo using fixed coordinates for Solapur, Maharashtra.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build Production Bundle

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Hardware and Cloud Setup

This dashboard expects sensor telemetry to be pushed to ThingSpeak using the following field schema:

- field1: Soil Moisture (raw)
- field2: Humidity (%)
- field3: Temperature (°C)
- field4: Rain Sensor (raw)
- field5: pH Sensor (raw)

Suggested setup flow:

1. Create a ThingSpeak channel.
2. Enable and note the Read API key for dashboard access.
3. Configure your ESP32 firmware to publish sensor values to field1 through field5.
4. Add channel ID and Read API key in your local .env file.
5. Start the app and verify live updates in the header status indicator.

If your firmware currently publishes scaled values instead of raw analog values, update thresholds in src/utils/sensorUtils.js to match your calibration model.

## Current Automation Rules

- Irrigation Pump:
	- ON when soil is dry and rain is not detected
	- OFF otherwise
- Misting System:
	- ON when temperature is high
- Shade Cover:
	- OPEN when temperature is high

These are implemented in `src/utils/sensorUtils.js` and can be tuned to match your physical setup and thresholds.

## Screenshots

Add your dashboard screenshots to a docs/screenshots folder and reference them here.

Example structure:

- docs/screenshots/overview.png
- docs/screenshots/sensors.png
- docs/screenshots/alerts.png

Example markdown you can enable once images are added:

```md
![Dashboard Overview](docs/screenshots/overview.png)
![Sensor Cards](docs/screenshots/sensors.png)
![Alerts and Activity](docs/screenshots/alerts.png)
```

## Deployment

This is a standard Vite SPA and can be deployed to any static hosting provider (for example: Vercel, Netlify, GitHub Pages, Firebase Hosting).

Build output is generated in `dist/`.

## Troubleshooting

- App shows Demo Mode:
	- Verify `VITE_THINGSPEAK_CHANNEL_ID` and `VITE_THINGSPEAK_READ_API_KEY`.
	- Confirm ThingSpeak channel has readable feed data.
- Empty or odd sensor cards:
	- Validate field mapping in ThingSpeak matches expected `field1...field5` schema.
- Charts not updating:
	- Check browser console/network and verify periodic fetch calls are succeeding.

## License

No license file is currently defined in this repository. Add a `LICENSE` file if you want to specify usage terms.
