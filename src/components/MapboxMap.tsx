'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ReactDOMServer from 'react-dom/server';
import ClickPopup from './ClickPopup';
import Sidebar from './Sidebar';
import { routingService, ProcessedRoutes } from '../services/routingService';

// Set the access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

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

// Toronto center for validation
const TORONTO_CENTER = { lat: 43.6532, lng: -79.3832 };
const MAX_DISTANCE_KM = 30;

// Haversine formula to calculate distance between two lat/lng points in km
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapboxMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // New state for point selection and click popup
  const [startPoint, setStartPoint] = useState<LocationPoint | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<LocationPoint | null>(null);
  const startMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const startMarkerIdRef = useRef<string | undefined>(undefined);
  const destinationMarkerIdRef = useRef<string | undefined>(undefined);
  const clickPopupRef = useRef<mapboxgl.Popup | null>(null);
  
  // Input field values for the search box
  const [startInputValue, setStartInputValue] = useState('');
  const [destinationInputValue, setDestinationInputValue] = useState('');
  
  // Route state
  const [routes, setRoutes] = useState<ProcessedRoutes | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  
  // Use ref to track the latest calculation to handle race conditions
  const latestCalculationId = useRef<number>(0);

  // Popup for out-of-bounds selection
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      map.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/standard', 
        center: [-79.3871, 43.6426], // Centered on the CN Tower
        zoom: 15,
        pitch: 60,
        antialias: true
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map load
      map.current.on('load', () => {
        console.log('✅ Step 1 Complete: Basic map loaded successfully!');
        setIsLoading(false);
        setMapError(null);
        
        // Enable 3D buildings
        add3DBuildings();
        
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
      if (clickPopupRef.current) {
        clickPopupRef.current.remove();
        clickPopupRef.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add click handler for location popup
  const addClickHandler = () => {
    if (!map.current) return;

    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      
      console.log(`📍 Map clicked at:`, { lng, lat });

      // Close existing popup if any
      if (clickPopupRef.current) {
        clickPopupRef.current.remove();
      }

      // Create React component content as HTML string
      const popupContent = ReactDOMServer.renderToString(
        <ClickPopup
          lng={lng}
          lat={lat}
          x={0} // Not needed for Mapbox popup
          y={0} // Not needed for Mapbox popup
          onSetLocation={handleSetLocation}
          onClose={() => {}} // Will be handled by popup close event
          isMapboxPopup={true}
        />
      );

      // Create Mapbox popup with fixed positioning
      const popup = new mapboxgl.Popup({
        closeButton: false, // We'll use our custom close button
        closeOnClick: false,
        maxWidth: '300px',
        offset: [0, -15],
        anchor: 'bottom', // Force anchor to bottom
        focusAfterOpen: false,
        className: 'click-popup'
      })
        .setLngLat([lng, lat])
        .setHTML(`<div id="popup-content">${popupContent}</div>`)
        .addTo(map.current!);

      // Override Mapbox's automatic repositioning by locking the anchor
      setTimeout(() => {
        const popupElement = popup.getElement();
        if (popupElement) {
          // Force the popup to maintain bottom anchor
          popupElement.className = popupElement.className.replace(/mapboxgl-popup-anchor-\w+/g, '');
          popupElement.classList.add('mapboxgl-popup-anchor-bottom');
          
          // Override the popup's update method to prevent repositioning
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const originalUpdate = (popup as any)._update;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (popup as any)._update = function() {
            originalUpdate.call(this);
            // Restore bottom anchor after any update
            const element = this.getElement();
            if (element) {
              element.className = element.className.replace(/mapboxgl-popup-anchor-\w+/g, '');
              element.classList.add('mapboxgl-popup-anchor-bottom');
            }
          };
        }
      }, 0);

      // Store popup reference
      clickPopupRef.current = popup;

      // Add event listeners to the popup content after it's added to DOM
      setTimeout(() => {
        const popupElement = document.getElementById('popup-content');
        if (popupElement) {
          // Add click handlers for start/destination buttons
          const startBtn = popupElement.querySelector('[data-action="start"]');
          const destBtn = popupElement.querySelector('[data-action="destination"]');
          const closeBtn = popupElement.querySelector('[data-action="close"]');

          if (startBtn) {
            startBtn.addEventListener('click', () => {
              handleSetLocation(lng, lat, 'start');
              popup.remove();
            });
          }

          if (destBtn) {
            destBtn.addEventListener('click', () => {
              handleSetLocation(lng, lat, 'destination');
              popup.remove();
            });
          }

          if (closeBtn) {
            closeBtn.addEventListener('click', () => {
              popup.remove();
            });
          }
        }
      }, 0);

      // Handle popup close event
      popup.on('close', () => {
        clickPopupRef.current = null;
      });
    });
  };

  // Add start point marker (for search results)
  const addStartMarker = async (lng: number, lat: number) => {
    if (!map.current) return;

    // Remove existing start marker
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
      startMarkerIdRef.current = undefined;
    }

    // Create custom marker element for start point
    const el = document.createElement('div');
    el.className = 'start-marker';
    el.id = `start-marker-search-${Date.now()}`;
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
      .addTo(map.current);

    startMarkerRef.current = marker;
    startMarkerIdRef.current = el.id;
  };

  // Add destination point marker (for search results)
  const addDestinationMarker = async (lng: number, lat: number) => {
    if (!map.current) return;

    // Remove existing destination marker
    if (destinationMarkerRef.current) {
      console.log(`🗑️ [SEARCH] Removing existing destination marker`);
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
      destinationMarkerIdRef.current = undefined;
    }

    // Create custom marker element for destination point
    const el = document.createElement('div');
    el.className = 'destination-marker';
    el.id = `destination-marker-search-${Date.now()}`;
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
      .addTo(map.current);

    destinationMarkerRef.current = marker;
    destinationMarkerIdRef.current = el.id;
  };

  // Clear all markers and points
  const clearPoints = () => {
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
      startMarkerIdRef.current = undefined;
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
      destinationMarkerIdRef.current = undefined;
    }
    if (clickPopupRef.current) {
      clickPopupRef.current.remove();
      clickPopupRef.current = null;
    }
    setStartPoint(null);
    setDestinationPoint(null);
    setStartInputValue('');
    setDestinationInputValue('');
  };

  // Handle setting a location from click popup
  const handleSetLocation = async (lng: number, lat: number, type: 'start' | 'destination') => {
    // Check if within 30km of Toronto center
    const dist = getDistanceKm(lat, lng, TORONTO_CENTER.lat, TORONTO_CENTER.lng);
    console.log(`[DEBUG] handleSetLocation: lat=${lat}, lng=${lng}, dist=${dist}`);
    if (dist > MAX_DISTANCE_KM) {
      setPopupMessage('Select locations within Toronto');
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = setTimeout(() => setPopupMessage(null), 2000);
      if (type === 'start') setStartInputValue('');
      else setDestinationInputValue('');
      return;
    }
    // Get address using reverse geocoding
    const address = await reverseGeocode(lng, lat);
    
    if (type === 'start') {
      // Remove existing start marker first
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
        startMarkerRef.current = null;
        startMarkerIdRef.current = undefined;
      }
      
      // Update state
      setStartPoint({ lng, lat, address });
      setStartInputValue(address);
      
      // Create and add new start marker
      console.log(`🟢 Creating new start marker at:`, { lng, lat });
      const el = document.createElement('div');
      el.className = 'start-marker';
      el.id = `start-marker-${Date.now()}`;
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
        .addTo(map.current!);

      startMarkerRef.current = marker;
      startMarkerIdRef.current = el.id;
    } else {
      // Remove existing destination marker first
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.remove();
        destinationMarkerRef.current = null;
        destinationMarkerIdRef.current = undefined;
      }
      
      // Update state
      setDestinationPoint({ lng, lat, address });
      setDestinationInputValue(address);
      
      // Create and add new destination marker
      const el = document.createElement('div');
      el.className = 'destination-marker';
      el.id = `destination-marker-${Date.now()}`;
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
        .addTo(map.current!);

      destinationMarkerRef.current = marker;
      destinationMarkerIdRef.current = el.id;
    }
  };

  // Handle location selection from search
  const handleLocationSelect = async (location: { lng: number; lat: number; address: string }, type: 'start' | 'destination') => {
    // Check if within 30km of Toronto center
    const dist = getDistanceKm(location.lat, location.lng, TORONTO_CENTER.lat, TORONTO_CENTER.lng);
    console.log(`[DEBUG] handleLocationSelect: lat=${location.lat}, lng=${location.lng}, dist=${dist}`);
    if (dist > MAX_DISTANCE_KM) {
      setPopupMessage('Select locations within Toronto');
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = setTimeout(() => setPopupMessage(null), 2000);
      if (type === 'start') setStartInputValue('');
      else setDestinationInputValue('');
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shortestFeatures.forEach((feature: any) => {
          if (feature.geometry.type === 'LineString') {
            allCoordinates.push(...feature.geometry.coordinates);
          }
        });
      }
      
      if (routeData.safe.route_geojson && 'features' in routeData.safe.route_geojson) {
        const safeFeatures = routeData.safe.route_geojson.features;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        safeFeatures.forEach((feature: any) => {
          if (feature.geometry.type === 'LineString') {
            allCoordinates.push(...feature.geometry.coordinates);
          }
        });
      }

      if (allCoordinates.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        allCoordinates.forEach(coord => bounds.extend(coord as [number, number]));
        const isMobile = window.innerWidth <= 768; // Adjust based on your breakpoint  
        // Use larger padding for mobile to avoid clipping
        const padding = isMobile ? 150 : 100; // Adjust padding based on device
        
        map.current.fitBounds(bounds, {
          padding: padding,
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

  // Only clear routes if points are missing
  useEffect(() => {
    if (!(startPoint && destinationPoint)) {
      setRoutes(null);
      removeRoutesFromMap();
    }
  }, [startPoint, destinationPoint]);

  const add3DBuildings = () => {
    if (!map.current) return;

    console.log('🏢 Enabling realistic 3D buildings...');
    
    try {
      // This single line turns on the detailed 3D building models.
      map.current.setConfigProperty('basemap', 'show3dBuildings', true);
      console.log('✅ Realistic 3D buildings enabled!');
    } catch (error) {
      console.error('❌ Error enabling 3D buildings:', error);
    }
  };

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

    console.log('🔍 Step 3: Adding data layers with correct 3D positioning...');
    
    try {
const layers = map.current.getStyle().layers;
const firstFillExtrusionId = layers.find(layer => layer.type === 'fill-extrusion')?.id;

// Add heatmap layer below 3D buildings (so it's occluded)
map.current.addLayer({
  id: 'assault-heatmap-3312730771-3b869h',
  type: 'heatmap',
  source: 'crime-data',
  'source-layer': 'Assault_Open_Data_-3312730771-3b869h',
  filter: ['match', ['geometry-type'], ['Point'], true, false],
  paint: {
    'heatmap-color': ['step', ['heatmap-density'], 'hsla(0, 0%, 0%, 0)', 0.05, 'hsla(60, 100%, 80%, 0.45)', 0.2, 'hsla(48, 100%, 67%, 0.5)', 0.3, 'hsla(35, 100%, 58%, 0.65)', 0.6, 'hsla(26, 100%, 50%, 0.8)', 0.99, 'hsla(8, 100%, 50%, 0.7)', 1, 'hsla(0, 100%, 45%, 0.8)'],
    'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.7, 15.9, 0.55, 20, 0],
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 20, 14, 60, 17, 60, 18, 10],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 0.1, 12, 0.2, 14, 0.5]
  }
}, firstFillExtrusionId);

map.current.addLayer({
  id: 'assault-circles-3312730771-3b869h',
  type: 'circle',
  source: 'crime-data',
  'source-layer': 'Assault_Open_Data_-3312730771-3b869h',
  paint: {
    'circle-color': 'hsl(0, 93%, 53%)',
    'circle-blur': ['interpolate', ['linear'], ['zoom'], 0, 100, 15.5, 0.5, 22, 0.1],
    'circle-stroke-opacity': 0,
    'circle-stroke-width': 10,
    'circle-radius': 8,
    'circle-stroke-color': 'hsl(269, 100%, 49%)',
    'circle-pitch-alignment': 'map'
  },
  layout: {}
}, firstFillExtrusionId);

      
      console.log('✅ Step 3 Complete: Heatmap + Circle layers added with 3D occlusion!');
      
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

  return (
    <div className="w-full h-full relative">
      {/* Out-of-bounds popup */}
      {popupMessage && (
        <div className="fixed top-8 left-1/2 z-50 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg text-base font-semibold animate-fade-in-out pointer-events-none">
          {popupMessage}
        </div>
      )}
      {/* Map Section - Full width background */}
      <div className="absolute inset-0">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
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

        {/* Map Container */}
        <div 
          ref={mapContainer} 
          className="w-full h-full"
        />
      </div>

      {/* Sidebar - Mobile layout will be handled within the Sidebar component */}
      <Sidebar
        startPoint={startPoint}
        destinationPoint={destinationPoint}
        startInputValue={startInputValue}
        destinationInputValue={destinationInputValue}
        routes={routes}
        isLoadingRoutes={isLoadingRoutes}
        routeError={routeError}
        onLocationSelect={handleLocationSelect}
        onInputChange={handleInputChange}
        onClear={clearPoints}
        onCalculate={calculateRoutes}
      />
    </div>
  );
} 