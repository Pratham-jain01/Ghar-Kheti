mport streamlit as st
import pandas as pd
import requests
import plotly.express as px
from datetime import datetime, timedelta

# --- Configuration ---
st.set_page_config(page_title="Ghar-Kheti Dashboard", layout="wide")

# Get ThingSpeak secrets using the simpler secret names
THINGSPEAK_CHANNEL_ID = st.secrets["TS_CHANNEL_ID"]
THINGSPEAK_READ_API_KEY = st.secrets["TS_API_KEY"]
THINGSPEAK_URL = f"https://api.thingspeak.com/channels/{THINGSPEAK_CHANNEL_ID}/feeds.json"

# Open-Meteo Configuration for Nagpur, India
NAGPUR_LAT = 21.1458
NAGPUR_LON = 79.0882
WEATHER_URL = f"https://api.open-meteo.com/v1/forecast?latitude={NAGPUR_LAT}&longitude={NAGPUR_LON}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m"

# --- Helper Functions ---
def interpret_weather_code(code):
    """Translates WMO weather codes into readable descriptions and emojis."""
    codes = {0: ("Clear sky", "☀️"), 1: ("Mainly clear", "🌤️"), 2: ("Partly cloudy", "⛅"), 3: ("Overcast", "☁️"), 45: ("Fog", "🌫️"), 48: ("Rime fog", "🌫️"), 51: ("Light drizzle", "🌦️"), 53: ("Moderate drizzle", "🌦️"), 55: ("Dense drizzle", "🌦️"), 61: ("Slight rain", "🌧️"), 63: ("Moderate rain", "🌧️"), 65: ("Heavy rain", "🌧️"), 80: ("Slight showers", "⛈️"), 81: ("Moderate showers", "⛈️"), 82: ("Violent showers", "⛈️"), 95: ("Thunderstorm", "🌩️")}
    return codes.get(code, ("Unknown", ""))

# --- Caching Data Fetching ---
@st.cache_data(ttl=600) # Cache data for 10 minutes
def get_thingspeak_data(num_results=8000):
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
        df = df.dropna()
        return df

    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching data from ThingSpeak: {e}")
        return pd.DataFrame()
    except (KeyError, ValueError) as e:
        st.error(f"Error parsing ThingSpeak data. Check channel configuration. Error: {e}")
        return pd.DataFrame()

@st.cache_data(ttl=600) # Cache data for 10 minutes
def get_weather_data():
    """Fetches current weather data from Open-Meteo."""
    try:
        response = requests.get(WEATHER_URL)
        response.raise_for_status()
        return response.json().get('current')
    except requests.exceptions.RequestException as e:
        st.error(f"Error fetching weather data: {e}")
        return None
    except (KeyError, ValueError):
        st.error("Error parsing weather data.")
        return None

# --- Main App Layout ---

st.title("🏡 Ghar-Kheti: Smart Agriculture Analytics")

# --- Fetch Data ---
farm_data = get_thingspeak_data()
weather_data = get_weather_data()

# --- Sidebar for User Inputs ---
st.sidebar.header("Dashboard Controls")

# --- Live Metrics Section ---
st.subheader("📊 Live Status")
col1, col2, col3, col4 = st.columns(4)

with col1:
    if not farm_data.empty and 'Temperature' in farm_data.columns:
        st.metric("Farm Temperature", f"{farm_data['Temperature'].iloc[-1]:.1f} °C")
    else:
        st.metric("Farm Temperature", "N/A")

with col2:
    if not farm_data.empty and 'Soil_Moisture' in farm_data.columns:
        st.metric("Soil Moisture", f"{farm_data['Soil_Moisture'].iloc[-1]:.1f} %")
    else:
        st.metric("Soil Moisture", "N/A")

with col3:
    if weather_data and 'temperature_2m' in weather_data:
        st.metric("Nagpur Weather", f"{weather_data['temperature_2m']:.1f} °C")
    else:
        st.metric("Nagpur Weather", "N/A")

with col4:
    if weather_data and 'weather_code' in weather_data:
        desc, emoji = interpret_weather_code(weather_data['weather_code'])
        st.metric("Current Condition", f"{desc} {emoji}")
    else:
        st.metric("Current Condition", "N/A")

st.divider()

# --- Exploratory Data Analysis (EDA) Section ---
st.header("📈 Exploratory Data Analysis")

if not farm_data.empty:
    # Sidebar Controls for EDA
    st.sidebar.subheader("Analysis Options")
    selected_sensor = st.sidebar.selectbox(
        "Select Sensor for Analysis",
        options=farm_data.columns.drop(['entry_id', 'created_at']),
        index=0
    )

    # Date Range Selector
    min_date = farm_data['created_at'].min().date()
    max_date = farm_data['created_at'].max().date()
    date_range = st.sidebar.date_input(
        "Select Date Range",
        value=(max_date - timedelta(days=7), max_date),
        min_value=min_date,
        max_value=max_date,
    )

    if len(date_range) == 2:
        start_date, end_date = date_range
        mask = (farm_data['created_at'].dt.date >= start_date) & (farm_data['created_at'].dt.date <= end_date)
        filtered_data = farm_data.loc[mask]
    else:
        filtered_data = farm_data # Show all data if range is not proper

    if not filtered_data.empty:
        # Layout for EDA Charts and Stats
        eda_col1, eda_col2 = st.columns([2, 1])

        with eda_col1:
            st.markdown(f"#### Sensor Trends: **{selected_sensor}**")
            fig = px.line(
                filtered_data,
                x='created_at',
                y=selected_sensor,
                title=f"{selected_sensor} from {start_date.strftime('%b %d')} to {end_date.strftime('%b %d')}",
                labels={'created_at': 'Timestamp'}
            )
            st.plotly_chart(fig, use_container_width=True)

        with eda_col2:
            st.markdown("#### Key Statistics")
            stats = filtered_data[selected_sensor].describe()
            st.metric("Average", f"{stats['mean']:.2f}")
            st.metric("Min Value", f"{stats['min']:.2f}")
            st.metric("Max Value", f"{stats['max']:.2f}")
            st.metric("Standard Deviation", f"{stats['std']:.2f}")

        st.divider()

        # Additional Visualizations
        st.markdown("### Deeper Insights")
        viz_col1, viz_col2 = st.columns(2)

        with viz_col1:
            st.markdown(f"##### **Distribution of {selected_sensor}**")
            fig_hist = px.histogram(filtered_data, x=selected_sensor, nbins=30, title=f"Frequency of {selected_sensor} Readings")
            st.plotly_chart(fig_hist, use_container_width=True)

        with viz_col2:
            st.markdown("##### **Correlation Between Sensors**")
            x_axis = st.selectbox("Select X-axis", farm_data.columns.drop(['entry_id', 'created_at']), index=0)
            y_axis = st.selectbox("Select Y-axis", farm_data.columns.drop(['entry_id', 'created_at']), index=1)
            fig_scatter = px.scatter(filtered_data, x=x_axis, y=y_axis, title=f"{x_axis} vs. {y_axis}", trendline="ols")
            st.plotly_chart(fig_scatter, use_container_width=True)

    else:
        st.warning("No data available for the selected date range.")

else:
    st.info("Waiting for farm data to display visualizations...")

with st.expander("Show Raw Data"):
    if not farm_data.empty:
        st.dataframe(farm_data)
    else:
        st.write("No data to display.")
