import streamlit as st
import pandas as pd
import requests
import plotly.express as px
from datetime import datetime

# --- Configuration ---
st.set_page_config(page_title="Ghar-Kheti Dashboard", layout="wide")

# Get ThingSpeak secrets using the simpler secret names
THINGSPEAK_CHANNEL_ID = st.secrets["TS_CHANNEL_ID"]
THINGSPEAK_READ_API_KEY = st.secrets["TS_API_KEY"]
THINGSPEAK_URL = f"https://api.thingspeak.com/channels/{THINGSPEAK_CHANNEL_ID}/feeds.json"

# --- Helper Functions ---
@st.cache_data(ttl=300) # Cache data for 5 minutes
def get_thingspeak_data(num_results=2880):
    """Fetches and processes data from the ThingSpeak channel."""
    try:
        params = {'api_key': THINGSPEAK_READ_API_KEY, 'results': num_results}
        response = requests.get(THINGSPEAK_URL, params=params)
        response.raise_for_status()
        data = response.json()

        if 'feeds' not in data or not data['feeds']:
            st.warning("No data found in the ThingSpeak channel.")
            return pd.DataFrame()

        df = pd.DataFrame(data['feeds'])
        field_mapping = {'field1': 'Temperature', 'field2': 'Humidity', 'field3': 'Soil_Moisture', 'field4': 'pH'}
        df = df.rename(columns=field_mapping)

        for col in field_mapping.values():
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        df['created_at'] = pd.to_datetime(df['created_at']).dt.tz_convert('Asia/Kolkata')
        df = df.dropna(subset=['Temperature', 'Humidity', 'Soil_Moisture'])
        return df
    except Exception as e:
        st.error(f"An error occurred: {e}")
        return pd.DataFrame()

# --- Data Interpretation Functions ---
def interpret_temperature(temp):
    """Returns a user-friendly description for a temperature value."""
    if temp < 15: return "Cold"
    if 15 <= temp < 20: return "Cool"
    if 20 <= temp < 28: return "Optimal"
    if 28 <= temp < 35: return "Warm"
    return "Hot"

def interpret_humidity(hum):
    """Returns a user-friendly description for a humidity value."""
    if hum < 40: return "Dry"
    if 40 <= hum < 60: return "Optimal"
    if 60 <= hum < 80: return "Humid"
    return "Very Humid"

def interpret_ph(ph_val):
    """Returns a user-friendly description for a pH value."""
    if not 0 <= ph_val <= 14: return "Invalid"
    if ph_val < 5.5: return "Very Acidic"
    if 5.5 <= ph_val < 6.5: return "Acidic"
    if 6.5 <= ph_val < 7.5: return "Neutral"
    return "Alkaline"

def convert_soil_moisture_to_percent(raw_val, dry_val, wet_val):
    """Converts raw soil moisture to a percentage based on calibration."""
    if dry_val == wet_val: return 0.0 # Avoid division by zero
    # Clamp the value within the calibrated range
    clamped_val = max(min(raw_val, dry_val), wet_val)
    # Calculate percentage (assuming lower raw value means more moisture)
    percentage = 100 * (dry_val - clamped_val) / (dry_val - wet_val)
    return max(0, min(percentage, 100)) # Ensure percentage is between 0 and 100


# --- Main App Layout ---
st.title("🏡 Ghar-Kheti: Live Farm Monitoring")
st.markdown("A real-time dashboard for your automated rooftop farming system.")

# --- Sensor Calibration Section ---
with st.expander("🛠️ Calibrate Your Soil Moisture Sensor"):
    st.info("To get an accurate moisture percentage, note the sensor's raw reading when the soil is completely dry and when it's fully saturated with water.")
    cal_col1, cal_col2 = st.columns(2)
    with cal_col1:
        dry_value = st.number_input("Enter Sensor Value for Dry Soil (0% Moisture):", value=3300, step=10)
    with cal_col2:
        wet_value = st.number_input("Enter Sensor Value for Wet Soil (100% Moisture):", value=1300, step=10)

# --- Fetch and Process Data ---
farm_data = get_thingspeak_data()

if not farm_data.empty:
    farm_data['Soil_Moisture_Percent'] = farm_data['Soil_Moisture'].apply(
        lambda x: convert_soil_moisture_to_percent(x, dry_value, wet_value)
    )

    # --- Live Metrics Section ---
    st.subheader("📊 Current Conditions")
    latest_data = farm_data.iloc[-1]
    
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            label="Soil Moisture",
            value=f"{latest_data['Soil_Moisture_Percent']:.1f} %",
            delta=f"Raw: {latest_data['Soil_Moisture']}",
            delta_color="off"
        )

    with col2:
        st.metric(
            label="Temperature",
            value=f"{latest_data['Temperature']:.1f} °C",
            delta=interpret_temperature(latest_data['Temperature'])
        )
        
    with col3:
        st.metric(
            label="Humidity",
            value=f"{latest_data['Humidity']:.1f} %",
            delta=interpret_humidity(latest_data['Humidity'])
        )

    with col4:
        if 'pH' in latest_data and pd.notna(latest_data['pH']):
            st.metric(
                label="Soil pH",
                value=f"{latest_data['pH']:.1f}",
                delta=interpret_ph(latest_data['pH'])
            )
        else:
            st.metric(label="Soil pH", value="N/A", delta="No data")

    st.divider()

    # --- Historical Data Chart ---
    st.subheader("📈 Sensor Data Over Time")
    sensor_options = {
        'Soil Moisture (%)': 'Soil_Moisture_Percent',
        'Temperature (°C)': 'Temperature',
        'Humidity (%)': 'Humidity',
        'pH Level': 'pH'
    }
    selected_display_name = st.selectbox(
        "Select a sensor to visualize its history:",
        options=list(sensor_options.keys())
    )
    sensor_to_plot = sensor_options[selected_display_name]
    
    if sensor_to_plot in farm_data.columns and not farm_data[sensor_to_plot].isnull().all():
        fig = px.line(
            farm_data, x='created_at', y=sensor_to_plot,
            title=f"Historical Readings for {selected_display_name}",
            labels={'created_at': 'Time', sensor_to_plot: selected_display_name},
            template="plotly_white"
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning(f"Data for '{selected_display_name}' is not available to plot.")

    with st.expander("Show Raw and Calibrated Data Table"):
        st.dataframe(farm_data.sort_values(by='created_at', ascending=False))

else:
    st.info("Awaiting data from ThingSpeak...")

