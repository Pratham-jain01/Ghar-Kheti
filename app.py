import streamlit as st
import pandas as pd
import requests
import plotly.express as px
from datetime import datetime, timedelta
import plotly.graph_objects as go

# --- Page Configuration ---
st.set_page_config(
    page_title="Ghar-Kheti Analytics Dashboard",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- Secrets and API Configuration ---
# Make sure to set these in your Streamlit Cloud secrets
THINGSPEAK_CHANNEL_ID = st.secrets["TS_CHANNEL_ID"]
THINGSPEAK_READ_API_KEY = st.secrets["TS_API_KEY"]
THINGSPEAK_URL = f"https://api.thingspeak.com/channels/{THINGSPEAK_CHANNEL_ID}/feeds.json"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

# --- Data Fetching Functions with Caching ---
@st.cache_data(ttl=600)  # Cache ThingSpeak data for 10 minutes
def get_thingspeak_data(num_results=8000):
    """Fetches and processes the last 8000 data points from ThingSpeak."""
    try:
        params = {'api_key': THINGSPEAK_READ_API_KEY, 'results': num_results}
        response = requests.get(THINGSPEAK_URL, params=params)
        response.raise_for_status()
        data = response.json()

        if 'feeds' not in data or not data['feeds']:
            st.warning("No data found in ThingSpeak channel.")
            return pd.DataFrame()

        df = pd.DataFrame(data['feeds'])
        # Standard field mapping for ThingSpeak
        field_mapping = {
            'field1': 'Temperature', 
            'field2': 'Humidity', 
            'field3': 'Soil_Moisture', 
            'field4': 'pH'
        }
        df = df.rename(columns=field_mapping)
        
        # Convert all potential sensor columns to numeric types
        for col in field_mapping.values():
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Convert 'created_at' to datetime, set timezone, and make it the index
        df['created_at'] = pd.to_datetime(df['created_at']).dt.tz_convert('Asia/Kolkata')
        df.set_index('created_at', inplace=True)
        
        # Drop rows where essential data is missing
        return df.dropna(subset=['Temperature', 'Humidity', 'Soil_Moisture'])

    except (requests.exceptions.RequestException, KeyError, ValueError) as e:
        st.error(f"Error fetching or parsing ThingSpeak data: {e}")
        return pd.DataFrame()

@st.cache_data(ttl=1800) # Cache weather data for 30 minutes
def get_weather_data(lat=17.6599, lon=75.9064): # Coordinates for Solapur
    """Fetches live weather data for Solapur from Open-Meteo."""
    
    # --- CHANGED: Requested more current weather variables ---
    params = {
        'latitude': lat, 
        'longitude': lon, 
        'current': 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m'
    }
    try:
        response = requests.get(WEATHER_URL, params=params)
        response.raise_for_status()
        # Return the whole JSON response which includes 'current' and 'current_units'
        return response.json() 
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching weather data: {e}")
        return {}

# --- Main Application ---
st.title("🏡 Ghar-Kheti: Advanced Analytics Dashboard")

# Fetch data
farm_data = get_thingspeak_data()
weather_data = get_weather_data()

if farm_data.empty:
    st.warning("Could not fetch farm data. Please check your ThingSpeak secrets and channel status.")
else:
    # --- Sidebar for Controls ---
    
    # --- REMOVED: st.sidebar.image() which caused the error ---
    
    st.sidebar.header("Dashboard Controls")
    
    min_date = farm_data.index.min().date()
    max_date = farm_data.index.max().date()
    
    # Set a robust default date range
    default_start_date = max(min_date, max_date - timedelta(days=6))

    date_range = st.sidebar.date_input(
        "Select Date Range",
        value=(default_start_date, max_date),
        min_value=min_date,
        max_value=max_date,
    )
    
    # Filter data based on date range, ensuring timezone awareness
    if len(date_range) == 2:
        start_date, end_date = date_range
        start_datetime = pd.Timestamp(start_date, tz='Asia/Kolkata')
        end_datetime = pd.Timestamp(end_date, tz='Asia/Kolkata') + pd.Timedelta(days=1)
        filtered_data = farm_data.loc[start_datetime:end_datetime]
    else:
        # If date range is not fully selected, use all data
        filtered_data = farm_data

    # --- Main Dashboard Layout ---
    
    # --- UPDATED: Key Metrics section for Farm Data only ---
    st.subheader("Key Metrics (Live Farm Data)")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Latest Farm Temp", f"{farm_data['Temperature'].iloc[-1]:.1f} °C")
    with col2:
        st.metric("Latest Farm Humidity", f"{farm_data['Humidity'].iloc[-1]:.1f} %")
    with col3:
        st.metric("Latest Soil Moisture", f"{farm_data['Soil_Moisture'].iloc[-1]:.0f}", help="Raw ADC Value")
    with col4:
        st.metric("Latest pH", f"{farm_data['pH'].iloc[-1]:.1f}")
        
    st.divider()

    # --- ADDED: New section for Live Weather ---
    st.subheader("Live Weather (Solapur)")
    if weather_data and 'current' in weather_data:
        current_data = weather_data.get('current', {})
        current_units = weather_data.get('current_units', {})

        col_w1, col_w2, col_w3, col_w4 = st.columns(4)
        with col_w1:
            temp = current_data.get('temperature_2m', 'N/A')
            unit = current_units.get('temperature_2m', '')
            st.metric("Temperature", f"{temp} {unit}")
        with col_w2:
            feels_like = current_data.get('apparent_temperature', 'N/A')
            unit = current_units.get('apparent_temperature', '')
            st.metric("Feels Like", f"{feels_like} {unit}")
        with col_w3:
            precip = current_data.get('precipitation', 'N/A')
            unit = current_units.get('precipitation', '')
            st.metric("Precipitation", f"{precip} {unit}")
        with col_w4:
            wind = current_data.get('wind_speed_10m', 'N/A')
            unit = current_units.get('wind_speed_10m', '')
            st.metric("Wind Speed", f"{wind} {unit}")
    else:
        st.warning("Could not load live weather data.")
    
    st.divider()

    # --- Charts for EDA ---
    st.subheader("Exploratory Data Analysis (EDA)")
    
    st.markdown("### Sensor Trends Over Time")
    # Check if filtered_data is empty before plotting
    if not filtered_data.empty:
        sensor_to_plot = st.selectbox("Select a sensor for the time series chart:", filtered_data.columns)
        if sensor_to_plot:
            fig_line = px.line(filtered_data, y=sensor_to_plot, title=f"{sensor_to_plot} Over Time", template="plotly_white")
            st.plotly_chart(fig_line, use_container_width=True)
    else:
        st.warning("No data available for the selected date range.")


    st.markdown("### Data Distribution & Correlation")
    col_hist, col_scatter = st.columns(2)
    
    if not filtered_data.empty:
        with col_hist:
            hist_sensor = st.selectbox("Select sensor for histogram:", filtered_data.columns, key='hist')
            if hist_sensor:
                fig_hist = px.histogram(filtered_data, x=hist_sensor, title=f"Distribution of {hist_sensor}", nbins=50, template="plotly_white")
                st.plotly_chart(fig_hist, use_container_width=True)

        with col_scatter:
            x_axis = st.selectbox("Select X-axis for scatter plot:", filtered_data.columns, key='scatter_x', index=0)
            y_axis = st.selectbox("Select Y-axis for scatter plot:", filtered_data.columns, key='scatter_y', index=1)
            if x_axis and y_axis:
                fig_scatter = px.scatter(filtered_data, x=x_axis, y=y_axis, title=f"{x_axis} vs. {y_axis}", trendline="ols")
                st.plotly_chart(fig_scatter, use_container_width=True)
    else:
        st.info("Charts hidden because no data is available for the selected range.")


    with st.expander("Show Filtered Data Table"):
        st.dataframe(filtered_data)

