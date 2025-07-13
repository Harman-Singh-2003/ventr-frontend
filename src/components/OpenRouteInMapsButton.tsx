import React from 'react';
import { ExternalLink, Navigation } from 'lucide-react';

interface OpenRouteInMapsButtonProps {
  geojson: any;
  routeType?: 'safe' | 'shortest';
}

const OpenRouteInMapsButton = ({ geojson, routeType = 'safe' }: OpenRouteInMapsButtonProps) => {
  // Handle both GeoJSON Feature and FeatureCollection formats
  let coordinates: number[][] = [];
  
  if (geojson?.type === 'Feature' && geojson?.geometry?.type === 'LineString') {
    coordinates = geojson.geometry.coordinates;
  } else if (geojson?.type === 'FeatureCollection' && geojson?.features?.length > 0) {
    // Find the first LineString feature
    const lineStringFeature = geojson.features.find(
      (feature: any) => feature.geometry?.type === 'LineString'
    );
    if (lineStringFeature) {
      coordinates = lineStringFeature.geometry.coordinates;
    }
  }

  // Need at least a start and end point
  if (coordinates.length < 2) {
    console.error("Invalid GeoJSON provided. Expected coordinates with at least 2 points.");
    return null;
  }

  // GeoJSON is [longitude, latitude], Google Maps URL is "latitude,longitude"
  const formatCoord = (coord: number[]) => `${coord[1]},${coord[0]}`;

  const origin = formatCoord(coordinates[0]);
  const destination = formatCoord(coordinates[coordinates.length - 1]);

  // Use intermediate points as waypoints, but sample them to avoid URL length limits
  // Google Maps has a limit of ~2000 characters for URLs and 25 waypoints max
  const maxWaypoints = 8; // Conservative limit
  const waypointCoords = coordinates.slice(1, coordinates.length - 1);
  
  let sampledWaypoints: number[][] = [];
  if (waypointCoords.length <= maxWaypoints) {
    sampledWaypoints = waypointCoords;
  } else {
    // Sample waypoints evenly across the route
    const step = Math.floor(waypointCoords.length / maxWaypoints);
    for (let i = 0; i < waypointCoords.length; i += step) {
      sampledWaypoints.push(waypointCoords[i]);
      if (sampledWaypoints.length >= maxWaypoints) break;
    }
  }

  const waypoints = sampledWaypoints.map(formatCoord).join('|');

  // Construct the final URL
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=walking`;

  const routeLabel = routeType === 'safe' ? 'Safe Route' : 'Fastest Route';

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="
        inline-flex items-center gap-3 px-6 py-3 
        bg-white/20 border border-white/30 
        text-slate-800 font-semibold hover:text-slate-900
        rounded-xl hover:bg-white/30 transition-all duration-300
        active:scale-95 group
      "
      title={`Open ${routeLabel} in Google Maps`}
    >
      <img 
        src="/Google_Maps_icon.png" 
        alt="Google Maps" 
        className="w-5 h-5"
      />
      <Navigation className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
      <ExternalLink className="w-5 h-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
    </a>
  );
};

export default OpenRouteInMapsButton;
