# Handler - Mapbox Setup Guide

## 🗺️ Mapbox Integration Features

This Handler navigation app now includes full Mapbox integration with:

- **Real-time location search** using Mapbox Geocoding API
- **Interactive maps** with Mapbox GL JS
- **Route calculation** with shortest and safest route options
- **Turn-by-turn directions** via Mapbox Directions API
- **Live traffic data** for route optimization
- **Responsive mobile-first design**

## 🚀 Quick Setup

### 1. Get Your Mapbox API Key

1. Go to [https://account.mapbox.com/](https://account.mapbox.com/)
2. Sign up for a free account (includes generous free tier)
3. Navigate to **Access Tokens**
4. Copy your **Default Public Token** or create a new one

### 2. Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace `your_mapbox_access_token_here` with your actual API key:

```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cl91c2VybmFtZSIsImEiOiJjbGV0c3..."
```

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎯 How to Use

1. **Search Locations**: Type in the search boxes to find starting point and destination
2. **View Routes**: The app will automatically calculate and display:
   - **Blue line**: Shortest route
   - **Green line**: Safest route (uses traffic data)
3. **Route Information**: Safety percentage and distance comparison in the top-right panel
4. **Map Controls**: Use +/- buttons to zoom, drag to pan

## 🛠️ Features Implemented

### Mapbox APIs Used:
- **Geocoding API**: Location search and autocomplete
- **Directions API**: Route calculation with multiple profiles
- **Maps API**: Interactive base maps
- **Traffic Data**: Real-time traffic for route optimization

### UI Components:
- Responsive search inputs with autocomplete
- Interactive map with custom markers
- Route visualization with different colors
- Safety metrics display
- Zoom controls and navigation

## 🔧 Customization Options

### Map Styles:
Change the map style in `src/components/MapboxMap.tsx`:
```typescript
style: 'mapbox://styles/mapbox/streets-v12', // Current
// Options: satellite-v9, outdoors-v12, light-v11, dark-v11
```

### Route Profiles:
Modify route calculation profiles:
- `driving` - Fastest route for cars
- `driving-traffic` - Real-time traffic optimization
- `walking` - Pedestrian routes
- `cycling` - Bike-friendly paths

## 💡 Next Steps

Consider adding these advanced features:
- **Real-time location tracking** with device GPS
- **Voice navigation** integration
- **Offline map support** for areas with poor connectivity
- **Custom safety scoring** based on crime/accident data
- **Multi-stop route planning**
- **Integration with ride-sharing APIs**

## 🆘 Troubleshooting

**Map not loading?**
- Check your API key in `.env.local`
- Ensure your Mapbox account has sufficient quota
- Check browser console for errors

**Search not working?**
- Verify geocoding API is enabled in your Mapbox account
- Check network connectivity

**Routes not displaying?**
- Confirm Directions API access in your Mapbox dashboard
- Try different location combinations 