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
def get_thingspeak_data(num_results=2880): # Fetch last 24 hours of data (assuming 1 reading/min)
    """Fetches a specified number of data points from the ThingSpeak channel."""
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

    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching data from ThingSpeak: {e}")
        return pd.DataFrame()
    except (KeyError, ValueError) as e:
        st.error(f"Error parsing ThingSpeak data. Check channel configuration. Error: {e}")
        return pd.DataFrame()

def convert_to_percentage(raw_val, min_val, max_val):
    """Converts a raw sensor value to a percentage, handling inverse relationships."""
    # Ensure max_val is greater than min_val to avoid division by zero or incorrect logic
    if max_val <= min_val:
        return 0.0
        
    # Clamp the value to be within the calibrated range
    clamped_val = max(min(raw_val, max_val), min_val)
    # Calculate percentage (assuming lower value means more moisture for capacitive sensors)
    percentage = 100 * (max_val - clamped_val) / (max_val - min_val)
    return max(0, min(percentage, 100)) # Ensure percentage is between 0 and 100

# --- Main App Layout ---

st.title("🏡 Ghar-Kheti: Live Farm Monitoring")
st.markdown("A real-time dashboard for your automated rooftop farming system.")

# --- Sensor Calibration Section ---
st.subheader("🛠️ Soil Moisture Sensor Calibration")
st.info("To get an accurate percentage, calibrate your sensor. Note the reading when the soil is completely dry and when it's fully saturated with water.")

cal_col1, cal_col2 = st.columns(2)
with cal_col1:
    # Most capacitive sensors show a higher value when dry.
    dry_value = st.number_input("Enter Sensor Value for Dry Soil (0% Moisture):", value=3300, step=10)
with cal_col2:
    # And a lower value when wet.
    wet_value = st.number_input("Enter Sensor Value for Wet Soil (100% Moisture):", value=1300, step=10)

# --- Fetch and Process Data ---
farm_data = get_thingspeak_data()

if not farm_data.empty:
    # Apply the conversion to the Soil_Moisture column
    # We use the wet_value as the min and dry_value as the max for the conversion function
    farm_data['Soil_Moisture_Percent'] = farm_data['Soil_Moisture'].apply(
        lambda x: convert_to_percentage(x, wet_value, dry_value)
    )

    # --- Live Metrics Section ---
    st.subheader("📊 Current Sensor Readings")
    latest_data = farm_data.iloc[-1]
    
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "Soil Moisture", 
            f"{latest_data['Soil_Moisture_Percent']:.1f} %",
            help="The calibrated moisture content of the soil."
        )

    with col2:
        st.metric("Temperature", f"{latest_data['Temperature']:.1f} °C")
        
    with col3:
        st.metric("Humidity", f"{latest_data['Humidity']:.1f} %")

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
            farm_data,
            x='created_at',
            y=sensor_to_plot,
            title=f"Historical Readings for {selected_display_name}",
            labels={'created_at': 'Time (Local)', sensor_to_plot: selected_display_name},
            template="plotly_white"
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.warning(f"Data for '{selected_display_name}' is not available to plot.")

    with st.expander("Show Raw and Calibrated Data Table"):
        st.dataframe(farm_data.sort_values(by='created_at', ascending=False))

else:
    st.info("Attempting to fetch data... Please wait.")

