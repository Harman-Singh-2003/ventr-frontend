'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import SearchBox from './SearchBox';
import { routingService, ProcessedRoutes, RouteResponse } from '../services/routingService';
import RoutingService from '../services/routingService';

// Set the access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

interface MapboxMapProps {
  onRouteChange?: (routeData: any) => void;
}

interface LocationPoint {
  lng: number;
  lat: number;
  address?: string;
}

interface ClickPopup {
  lng: number;
  lat: number;
  x: number;
  y: number;
}

export default function MapboxMap({ onRouteChange }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // New state for point selection and click popup
  const [startPoint, setStartPoint] = useState<LocationPoint | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<LocationPoint | null>(null);
  const [startMarker, setStartMarker] = useState<mapboxgl.Marker | null>(null);
  const [destinationMarker, setDestinationMarker] = useState<mapboxgl.Marker | null>(null);
  const [clickPopup, setClickPopup] = useState<ClickPopup | null>(null);
  
  // Input field values for the search box
  const [startInputValue, setStartInputValue] = useState('');
  const [destinationInputValue, setDestinationInputValue] = useState('');
  
  // Route state
  const [routes, setRoutes] = useState<ProcessedRoutes | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  
  // Use ref to track the latest calculation to handle race conditions
  const latestCalculationId = useRef<number>(0);

  useEffect(() => {
    // Check if we have a token
    if (!mapboxgl.accessToken) {
      setMapError('Mapbox access token is missing. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file.');
      setIsLoading(false);
      return;
    }

    // Check if map is already initialized
    if (map.current) return;

    console.log('🗺️ Step 1: Initializing basic Mapbox map...');

    try {
      // Initialize the map
      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12', // Simple street style
        center: [-79.3832, 43.6532], // Toronto coordinates
        zoom: 11
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map load
      map.current.on('load', () => {
        console.log('✅ Step 1 Complete: Basic map loaded successfully!');
        setIsLoading(false);
        setMapError(null);
        
        // Step 2: Import crime data
        addCrimeDataSource();
        
        // Step 3: Add click event listener for point selection
        addClickHandler();
      });

      // Handle map errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setMapError(`Map failed to load: ${e.error?.message || 'Unknown error'}`);
        setIsLoading(false);
      });

    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError(error instanceof Error ? error.message : 'Failed to initialize map');
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add click handler for location popup
  const addClickHandler = () => {
    if (!map.current) return;

    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      const { x, y } = e.point;
      
      console.log(`📍 Map clicked at:`, { lng, lat, x, y });

      // Show click popup with coordinates
      setClickPopup({
        lng,
        lat,
        x,
        y
      });
    });
  };

  // Add start point marker with reverse geocoding
  const addStartMarker = async (lng: number, lat: number) => {
    if (!map.current) return;

    // Remove existing start marker
    if (startMarker) {
      startMarker.remove();
    }

    // Get address using reverse geocoding
    const address = await reverseGeocode(lng, lat);
    
    // Update start point with address
    setStartPoint(prev => prev ? { ...prev, address } : { lng, lat, address });

    // Create custom marker element for start point
    const el = document.createElement('div');
    el.className = 'start-marker';
    el.style.cssText = `
      background-color: #22c55e;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-3 max-w-xs">
          <h3 class="font-bold text-green-600 mb-2">🟢 Start Point</h3>
          <p class="text-sm text-gray-700 mb-1"><strong>Address:</strong></p>
          <p class="text-sm text-gray-600 mb-2">${address}</p>
          <p class="text-xs text-gray-500">
            <strong>Coordinates:</strong><br/>
            Lng: ${lng.toFixed(6)}<br/>
            Lat: ${lat.toFixed(6)}
          </p>
        </div>
      `))
      .addTo(map.current);

    setStartMarker(marker);
  };

  // Add destination point marker with reverse geocoding
  const addDestinationMarker = async (lng: number, lat: number) => {
    if (!map.current) return;

    // Remove existing destination marker
    if (destinationMarker) {
      destinationMarker.remove();
    }

    // Get address using reverse geocoding
    const address = await reverseGeocode(lng, lat);
    
    // Update destination point with address
    setDestinationPoint(prev => prev ? { ...prev, address } : { lng, lat, address });

    // Create custom marker element for destination point
    const el = document.createElement('div');
    el.className = 'destination-marker';
    el.style.cssText = `
      background-color: #ef4444;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup().setHTML(`
        <div class="p-3 max-w-xs">
          <h3 class="font-bold text-red-600 mb-2">🔴 Destination</h3>
          <p class="text-sm text-gray-700 mb-1"><strong>Address:</strong></p>
          <p class="text-sm text-gray-600 mb-2">${address}</p>
          <p class="text-xs text-gray-500">
            <strong>Coordinates:</strong><br/>
            Lng: ${lng.toFixed(6)}<br/>
            Lat: ${lat.toFixed(6)}
          </p>
        </div>
      `))
      .addTo(map.current);

    setDestinationMarker(marker);
  };

  // Clear all markers and points
  const clearPoints = () => {
    if (startMarker) {
      startMarker.remove();
      setStartMarker(null);
    }
    if (destinationMarker) {
      destinationMarker.remove();
      setDestinationMarker(null);
    }
    setStartPoint(null);
    setDestinationPoint(null);
    setClickPopup(null);
    setStartInputValue('');
    setDestinationInputValue('');
  };

  // Handle setting a location from click popup
  const handleSetLocation = async (lng: number, lat: number, type: 'start' | 'destination') => {
    console.log(`📍 Setting ${type} location:`, { lng, lat });
    
    // Get address using reverse geocoding
    const address = await reverseGeocode(lng, lat);
    
    if (type === 'start') {
      setStartPoint({ lng, lat, address });
      setStartInputValue(address);
      await addStartMarker(lng, lat);
    } else {
      setDestinationPoint({ lng, lat, address });
      setDestinationInputValue(address);
      await addDestinationMarker(lng, lat);
    }

    // Hide popup after selection
    setClickPopup(null);
  };

  // Handle location selection from search
  const handleLocationSelect = async (location: { lng: number; lat: number; address: string }, type: 'start' | 'destination') => {
    console.log(`🔍 Search result selected for ${type}:`, location);
    
    if (type === 'start') {
      setStartPoint(location);
      setStartInputValue(location.address);
      await addStartMarker(location.lng, location.lat);
    } else {
      setDestinationPoint(location);
      setDestinationInputValue(location.address);
      await addDestinationMarker(location.lng, location.lat);
    }

    // Fly to the selected location
    if (map.current) {
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 15,
        duration: 2000
      });
    }
  };

  // Handle input changes from the search box
  const handleInputChange = (value: string, type: 'start' | 'destination') => {
    if (type === 'start') {
      setStartInputValue(value);
    } else {
      setDestinationInputValue(value);
    }
  };

  // Calculate routes when both start and destination are available
  const calculateRoutes = useCallback(async () => {
    if (!startPoint || !destinationPoint || !map.current) {
      return;
    }

    // Generate a unique ID for this calculation to handle race conditions
    const currentCalculationId = Date.now();
    latestCalculationId.current = currentCalculationId;

    console.log('🚗 Starting route calculation...', currentCalculationId);
    setIsLoadingRoutes(true);
    setRouteError(null);

    try {
      const routeRequest = {
        start_lng: startPoint.lng,
        start_lat: startPoint.lat,
        end_lng: destinationPoint.lng,
        end_lat: destinationPoint.lat
      };

      const calculatedRoutes = await routingService.calculateRoutes(routeRequest);
      
      // Check if this is still the latest calculation
      if (currentCalculationId === latestCalculationId.current) {
        console.log('✅ Routes calculated successfully:', calculatedRoutes);
        setRoutes(calculatedRoutes);
        
        // Add routes to map
        addRoutesToMap(calculatedRoutes);
      } else {
        console.log('🔄 Discarding outdated route calculation:', currentCalculationId);
      }
    } catch (error) {
      // Only update error state if this is still the latest calculation
      if (currentCalculationId === latestCalculationId.current) {
        console.error('❌ Route calculation failed:', error);
        setRouteError(error instanceof Error ? error.message : 'Failed to calculate routes');
      }
    } finally {
      // Only update loading state if this is still the latest calculation
      if (currentCalculationId === latestCalculationId.current) {
        setIsLoadingRoutes(false);
      }
    }
  }, [startPoint, destinationPoint]);

    // Add route layers to the map
  const addRoutesToMap = (routeData: ProcessedRoutes) => {
    if (!map.current) return;

    console.log('🗺️ Adding routes to map...', routeData);

    // Remove existing route layers if they exist
    removeRoutesFromMap();

    try {
      // Add shortest route (blue)
      if (routeData.shortest.route_geojson) {
        console.log('📍 Adding shortest route to map');
        map.current.addSource('shortest-route', {
          type: 'geojson',
          data: routeData.shortest.route_geojson as GeoJSON.FeatureCollection
        });

        map.current.addLayer({
          id: 'shortest-route-line',
          type: 'line',
          source: 'shortest-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3B82F6', // Blue
            'line-width': 6,
            'line-opacity': 0.8
          },
          filter: ['==', ['geometry-type'], 'LineString']
        });

        // Add a subtle outline
        map.current.addLayer({
          id: 'shortest-route-outline',
          type: 'line',
          source: 'shortest-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#1E40AF',
            'line-width': 8,
            'line-opacity': 0.3
          },
          filter: ['==', ['geometry-type'], 'LineString']
        }, 'shortest-route-line');
      }

      // Add safe route (green)
      if (routeData.safe.route_geojson) {
        console.log('🛡️ Adding safe route to map');
        map.current.addSource('safe-route', {
          type: 'geojson',
          data: routeData.safe.route_geojson as GeoJSON.FeatureCollection
        });

        map.current.addLayer({
          id: 'safe-route-line',
          type: 'line',
          source: 'safe-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#10B981', // Green
            'line-width': 6,
            'line-opacity': 0.8
          },
          filter: ['==', ['geometry-type'], 'LineString']
        });

        // Add a subtle outline
        map.current.addLayer({
          id: 'safe-route-outline',
          type: 'line',
          source: 'safe-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#059669',
            'line-width': 8,
            'line-opacity': 0.3
          },
          filter: ['==', ['geometry-type'], 'LineString']
        }, 'safe-route-line');
      }

      // Fit map to show both routes by getting coordinates from the GeoJSON
      const allCoordinates: number[][] = [];
      
      if (routeData.shortest.route_geojson && 'features' in routeData.shortest.route_geojson) {
        const shortestFeatures = routeData.shortest.route_geojson.features;
        shortestFeatures.forEach((feature: any) => {
          if (feature.geometry.type === 'LineString') {
            allCoordinates.push(...feature.geometry.coordinates);
          }
        });
      }
      
      if (routeData.safe.route_geojson && 'features' in routeData.safe.route_geojson) {
        const safeFeatures = routeData.safe.route_geojson.features;
        safeFeatures.forEach((feature: any) => {
          if (feature.geometry.type === 'LineString') {
            allCoordinates.push(...feature.geometry.coordinates);
          }
        });
      }

      if (allCoordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        allCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
        
        map.current.fitBounds(bounds, {
          padding: 100,
          duration: 2000
        });
      }

      console.log('✅ Routes successfully added to map');
    } catch (error) {
      console.error('❌ Error adding routes to map:', error);
    }
  };

  // Remove route layers from the map
  const removeRoutesFromMap = () => {
    if (!map.current) return;

    const layersToRemove = [
      'shortest-route-outline',
      'shortest-route-line',
      'safe-route-outline', 
      'safe-route-line'
    ];

    const sourcesToRemove = ['shortest-route', 'safe-route'];

    layersToRemove.forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });

    sourcesToRemove.forEach(sourceId => {
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
    });
  };

  // Effect to calculate routes when both points are available (with debouncing)
  useEffect(() => {
    if (startPoint && destinationPoint) {
      console.log('⏰ Route calculation requested, debouncing...');
      
      // Debounce route calculation to prevent multiple rapid API calls
      const timeoutId = setTimeout(() => {
        calculateRoutes();
      }, 300); // 300ms debounce

      return () => {
        console.log('🚫 Cancelling previous route calculation timeout');
        clearTimeout(timeoutId);
      };
    } else {
      // Clear routes if points are missing
      console.log('🧹 Clearing routes - missing start or destination point');
      setRoutes(null);
      removeRoutesFromMap();
    }
  }, [startPoint, destinationPoint, calculateRoutes]);

  // Step 2: Add crime data source
  const addCrimeDataSource = () => {
    if (!map.current) return;

    try {
      console.log('🔍 Step 2: Adding crime data source...');
      
      // Add your tileset from the console link you provided
      map.current.addSource('crime-data', {
        type: 'vector',
        url: 'mapbox://harmansingh2003.9x73mbtr'
      });

      console.log('✅ Step 2 Complete: Crime data source added!');
      
      // Step 3: Add simple visualization layer
      addSimpleVisualization();
      
    } catch (error) {
      console.error('❌ Step 2 Failed: Error adding crime data source:', error);
    }
  };

  // Step 3: Add simple visualization layer
  const addSimpleVisualization = () => {
    if (!map.current) return;

    console.log('🔍 Step 3: Using exact source-layer name provided by user...');
    
    try {
      // Add heatmap layer first (so circles appear on top)
      map.current.addLayer({
        id: 'assault-heatmap-3312730771-3b869h',
        type: 'heatmap',
        source: 'crime-data',
        'source-layer': 'Assault_Open_Data_-3312730771-3b869h',
        filter: [
          'match',
          ['geometry-type'],
          ['Point'],
          true,
          false
        ],
        paint: {
          'heatmap-color': [
            'step',
            ['heatmap-density'],
            'hsla(0, 0%, 0%, 0)',
            0.05, 'hsla(60, 100%, 80%, 0.45)',
            0.2, 'hsla(48, 100%, 67%, 0.5)',
            0.3, 'hsla(35, 100%, 58%, 0.65)',
            0.6, 'hsla(26, 100%, 50%, 0.8)',
            0.99, 'hsla(8, 100%, 50%, 0.7)',
            1, 'hsla(0, 100%, 45%, 0.8)'
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 0.7,
            15.9, 0.55,
            20, 0
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 20,
            14, 60,
            17, 60,
            18, 10
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11, 0.1,
            12, 0.2,
            14, 0.5
          ]
        }
      });

      // Add circle layer on top of heatmap
      map.current.addLayer({
        id: 'assault-circles-3312730771-3b869h',
        type: 'circle',
        source: 'crime-data',
        'source-layer': 'Assault_Open_Data_-3312730771-3b869h',
        paint: {
          'circle-color': 'hsl(0, 93%, 53%)',
          'circle-blur': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 100,
            15.5, 0.5,
            22, 0.1
          ],
          'circle-stroke-opacity': 0,
          'circle-stroke-width': 10,
          'circle-radius': 8,
          'circle-stroke-color': 'hsl(269, 100%, 49%)'
        },
        layout: {}
      });
      
      console.log('✅ Step 3 Complete: Heatmap + Circle layers added!');
      
    } catch (error) {
      console.error('❌ Step 3 Failed with exact source-layer name:', error);
      console.log('This means there might be an issue with the tileset itself');
    }
  };

  // Reverse geocoding function using Mapbox Geocoding API
  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Forward geocoding function using Mapbox Search Box API
  const forwardGeocode = async (query: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(query)}&access_token=${mapboxgl.accessToken}&session_token=${Date.now()}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Forward geocoding error:', error);
      return null;
    }
  };

  return (
    <div className="w-full h-full relative">
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Step 1: Loading basic map...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {mapError && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-50 p-4">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Map Error</h3>
            <p className="text-red-600 text-sm mb-4">{mapError}</p>
            <div className="text-xs text-gray-600 bg-white p-3 rounded border">
              <p><strong>Quick Fix:</strong></p>
              <p>1. Get a free token at <a href="https://account.mapbox.com" target="_blank" className="text-blue-600 underline">mapbox.com</a></p>
              <p>2. Add it to your .env.local file</p>
              <p>3. Restart the dev server</p>
            </div>
          </div>
        </div>
      )}

      {/* Modern Search Interface */}
      {!isLoading && !mapError && (
        <div className="absolute top-6 left-6 z-20 max-w-md w-full">
          <SearchBox 
            onLocationSelect={handleLocationSelect}
            placeholder="Type an address or place..."
            startValue={startInputValue}
            destinationValue={destinationInputValue}
            onInputChange={handleInputChange}
            onClear={clearPoints}
          />
          
          {/* Route Information Panel - show loading, error, or route details */}
          {startPoint && destinationPoint && (
            <div className="mt-2 bg-white rounded-lg shadow-lg border border-gray-100 p-3">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Route Information</h3>
              
              {/* Loading state */}
              {isLoadingRoutes && (
                <div className="flex items-center space-x-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Calculating routes...</span>
                </div>
              )}

              {/* Error state */}
              {routeError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ {routeError}
                </div>
              )}

              {/* Route details */}
              {routes && !isLoadingRoutes && !routeError && (
                <div className="space-y-3">
                  {/* Shortest Route */}
                  <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-800">Shortest Route</span>
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                      <div>Distance: {RoutingService.formatDistance(routes.shortest.route_stats.total_distance_m)}</div>
                      <div>Time: {RoutingService.formatTime(routes.shortest.route_stats.total_time_s)}</div>
                      <div>Safety Score: {Math.round(routes.shortest.route_stats.safety_score * 100)}%</div>
                      <div>Crime Incidents: {routes.shortest.route_stats.crime_incidents_nearby}</div>
                    </div>
                  </div>

                  {/* Safe Route */}
                  <div className="bg-green-50 p-2 rounded border-l-4 border-green-500">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Safe Route</span>
                    </div>
                    <div className="text-xs text-green-700 space-y-1">
                      <div>Distance: {RoutingService.formatDistance(routes.safe.route_stats.total_distance_m)}</div>
                      <div>Time: {RoutingService.formatTime(routes.safe.route_stats.total_time_s)}</div>
                      <div>Safety Score: {Math.round(routes.safe.route_stats.safety_score * 100)}%</div>
                      <div>Crime Incidents: {routes.safe.route_stats.crime_incidents_nearby}</div>
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                    <div>Extra distance: {RoutingService.formatDistance(
                      routes.safe.route_stats.total_distance_m - routes.shortest.route_stats.total_distance_m
                    )}</div>
                    <div>Extra time: {RoutingService.formatTime(
                      routes.safe.route_stats.total_time_s - routes.shortest.route_stats.total_time_s
                    )}</div>
                    <div>Safety improvement: {Math.round(
                      (routes.safe.route_stats.safety_score - routes.shortest.route_stats.safety_score) * 100
                    )}%</div>
                  </div>
                </div>
              )}

              {/* Coordinates */}
              <div className="pt-2 mt-2 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Start:</span> [{startPoint.lng.toFixed(6)}, {startPoint.lat.toFixed(6)}]
                </div>
                <div>
                  <span className="font-medium">End:</span> [{destinationPoint.lng.toFixed(6)}, {destinationPoint.lat.toFixed(6)}]
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click Popup */}
      {clickPopup && (
        <div 
          className="absolute z-30 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-48"
          style={{
            left: `${clickPopup.x}px`,
            top: `${clickPopup.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px'
          }}
        >
          <div className="text-center mb-3">
            <div className="text-sm font-medium text-gray-900 mb-1">Location Coordinates</div>
            <div className="text-xs text-gray-600 font-mono">
              {clickPopup.lat.toFixed(6)}, {clickPopup.lng.toFixed(6)}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleSetLocation(clickPopup.lng, clickPopup.lat, 'start')}
              className="flex-1 px-3 py-2 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors"
            >
              Set as Start
            </button>
            <button
              onClick={() => handleSetLocation(clickPopup.lng, clickPopup.lat, 'destination')}
              className="flex-1 px-3 py-2 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 transition-colors"
            >
              Set as End
            </button>
          </div>
          
          <button
            onClick={() => setClickPopup(null)}
            className="w-full mt-2 px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}



      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }} 
      />

      {/* Crime Data Status */}
      {!isLoading && !mapError && (
        <div className="absolute bottom-4 left-4 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm z-10">
          ✅ Crime data + Point selection ready
        </div>
      )}
    </div>
  );
} 