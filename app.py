import streamlit as st
import pandas as pd
import requests
import plotly.express as px
from datetime import datetime

# --- Configuration ---
# Get ThingSpeak secrets from Streamlit's secret management
THINGSPEAK_CHANNEL_ID = st.secrets["thingspeak"]["3074280"]
THINGSPEAK_READ_API_KEY = st.secrets["thingspeak"]["ZU0E71HE51M2QNC7"]
THINGSPEAK_URL = f"https://api.thingspeak.com/channels/{THINGSPEAK_CHANNEL_ID}/feeds.json"

# Open-Meteo Configuration for Nagpur, India (No API Key needed)
NAGPUR_LAT = 21.1458
NAGPUR_LON = 79.0882
WEATHER_URL = f"https://api.open-meteo.com/v1/forecast?latitude={NAGPUR_LAT}&longitude={NAGPUR_LON}&current=temperature_2m,weather_code"

# --- Helper Function for Weather ---
def interpret_weather_code(code):
    """
    Translates WMO weather codes from Open-Meteo into readable descriptions and emojis.
    """
    codes = {
        0: ("Clear sky", "☀️"),
        1: ("Mainly clear", "🌤️"),
        2: ("Partly cloudy", "⛅"),
        3: ("Overcast", "☁️"),
        45: ("Fog", "🌫️"),
        48: ("Depositing rime fog", "🌫️"),
        51: ("Light drizzle", "🌦️"),
        53: ("Moderate drizzle", "🌦️"),
        55: ("Dense drizzle", "🌦️"),
        61: ("Slight rain", "🌧️"),
        63: ("Moderate rain", "🌧️"),
        65: ("Heavy rain", "🌧️"),
        80: ("Slight rain showers", "⛈️"),
        81: ("Moderate rain showers", "⛈️"),
        82: ("Violent rain showers", "⛈️"),
        95: ("Thunderstorm", "🌩️"),
    }
    return codes.get(code, ("Unknown", ""))


# --- Functions to Fetch Data ---

def get_thingspeak_data():
    """
    Fetches the last 100 data points from the ThingSpeak channel.
    """
    try:
        params = {'api_key': THINGSPEAK_READ_API_KEY, 'results': 100}
        response = requests.get(THINGSPEAK_URL, params=params)
        response.raise_for_status()
        data = response.json()

        if 'feeds' not in data or not data['feeds']:
            st.warning("No data found in the ThingSpeak channel.")
            return pd.DataFrame()

        df = pd.DataFrame(data['feeds'])
        field_mapping = {
            'field1': 'Temperature',
            'field2': 'Humidity',
            'field3': 'Soil_Moisture',
            'field4': 'pH'
        }
        df = df.rename(columns=field_mapping)

        for col in field_mapping.values():
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        df['created_at'] = pd.to_datetime(df['created_at'])
        return df

    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching data from ThingSpeak: {e}")
        return pd.DataFrame()
    except (KeyError, ValueError) as e:
        st.error(f"Error parsing ThingSpeak data. Check channel configuration. Error: {e}")
        return pd.DataFrame()

def get_weather_data():
    """
    Fetches current weather data from Open-Meteo.
    """
    try:
        response = requests.get(WEATHER_URL)
        response.raise_for_status()
        data = response.json()
        # The relevant data is in the 'current' dictionary
        return data.get('current')
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching weather data: {e}")
        return None
    except (KeyError, ValueError):
        st.error("Error parsing weather data. Check API response.")
        return None

# --- Streamlit App Layout ---

st.set_page_config(page_title="Ghar-Kheti Dashboard", layout="wide")

st.title("🏡 Ghar-Kheti: IoT Rooftop Farming Dashboard")
st.markdown("Live sensor data and weather conditions for your automated farm.")

# --- Fetch Data ---
farm_data = get_thingspeak_data()
weather_data = get_weather_data()

# --- Display Key Metrics ---
st.header("Live Metrics")

col1, col2, col3, col4 = st.columns(4)

with col1:
    if not farm_data.empty and 'Temperature' in farm_data.columns:
        current_temp = farm_data['Temperature'].iloc[-1]
        st.metric(label="Farm Temperature", value=f"{current_temp:.2f} °C")
    else:
        st.metric(label="Farm Temperature", value="N/A")

with col2:
    if not farm_data.empty and 'Soil_Moisture' in farm_data.columns:
        current_moisture = farm_data['Soil_Moisture'].iloc[-1]
        st.metric(label="Soil Moisture", value=f"{current_moisture:.2f} %")
    else:
        st.metric(label="Soil Moisture", value="N/A")

with col3:
    city_name = "Nagpur"
    if weather_data and 'temperature_2m' in weather_data:
        weather_temp = weather_data['temperature_2m']
        st.metric(label=f"Weather in {city_name}", value=f"{weather_temp:.2f} °C")
    else:
        st.metric(label=f"Weather in {city_name}", value="N/A")

with col4:
    if weather_data and 'weather_code' in weather_data:
        code = weather_data['weather_code']
        desc, emoji = interpret_weather_code(code)
        st.markdown(f"**Condition:** {desc} {emoji}")
    else:
        st.markdown("**Condition:** N/A")

st.divider()

# --- Data Visualization ---
st.header("Sensor Data Analysis (Last 100 readings)")

if not farm_data.empty:
    sensor_to_plot = st.selectbox(
        "Select a sensor to visualize:",
        options=[col for col in ['Temperature', 'Humidity', 'Soil_Moisture', 'pH'] if col in farm_data.columns]
    )

    if sensor_to_plot:
        fig = px.line(
            farm_data.dropna(subset=[sensor_to_plot]),
            x='created_at',
            y=sensor_to_plot,
            title=f"{sensor_to_plot} over Time",
            labels={'created_at': 'Timestamp', sensor_to_plot: 'Value'},
            markers=True
        )
        fig.update_layout(xaxis_title="Time", yaxis_title=sensor_to_plot, title_x=0.5)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning("The selected sensor has no data to display.")

    with st.expander("Show Raw Farm Data"):
        st.dataframe(farm_data)
else:
    st.info("Waiting for farm data to display visualizations.")




