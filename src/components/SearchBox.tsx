'use client';

import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';

interface SearchResult {
  id: string;
  name: string;
  full_address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface SearchBoxProps {
  onLocationSelect: (location: { lng: number; lat: number; address: string }, type: 'start' | 'destination') => void;
  placeholder?: string;
  className?: string;
  startValue?: string;
  destinationValue?: string;
  onInputChange?: (value: string, type: 'start' | 'destination') => void;
  onClear?: () => void;
}

export default function SearchBox({ 
  onLocationSelect, 
  placeholder = "Search for a location...", 
  className = "",
  startValue = '',
  destinationValue = '',
  onInputChange,
  onClear
}: SearchBoxProps) {
  const [startQuery, setStartQuery] = useState(startValue);
  const [destinationQuery, setDestinationQuery] = useState(destinationValue);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState<'start' | 'destination' | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync external values with local state
  useEffect(() => {
    setStartQuery(startValue);
  }, [startValue]);

  useEffect(() => {
    setDestinationQuery(destinationValue);
  }, [destinationValue]);

  // Click outside handler to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setActiveField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search function using Mapbox Search Box API
  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || !mapboxgl.accessToken) return;

    setIsLoading(true);
    try {
      console.log('🔍 Searching for:', searchQuery);
      
      // Use the suggest endpoint for autocomplete
      const response = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(searchQuery)}&access_token=${mapboxgl.accessToken}&session_token=${Date.now()}&limit=5&proximity=-79.3832,43.6532&country=CA`
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📡 Suggest response:', data);
      
      if (data.suggestions && data.suggestions.length > 0) {
        // Convert suggestions to our format
        const results: SearchResult[] = data.suggestions.map((suggestion: any, index: number) => {
          console.log(`📍 Processing suggestion ${index}:`, suggestion);
          
          return {
            id: suggestion.mapbox_id || `fallback_${index}_${Date.now()}`,
            name: suggestion.name || suggestion.text || 'Unknown location',
            full_address: suggestion.full_address || suggestion.place_formatted || suggestion.name || suggestion.text || 'Address not available',
            coordinates: {
              // Most suggest responses don't include coordinates - that's normal
              latitude: suggestion.coordinates?.latitude || 0,
              longitude: suggestion.coordinates?.longitude || 0
            }
          };
        });
        
        console.log('✅ Processed suggestions:', results);
        setSuggestions(results);
        setShowSuggestions(true);
      } else {
        console.log('⚠️ No suggestions returned');
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'destination') => {
    const value = e.target.value;
    
    if (type === 'start') {
      setStartQuery(value);
    } else {
      setDestinationQuery(value);
    }

    // Notify parent of input change
    if (onInputChange) {
      onInputChange(value, type);
    }

    setActiveField(type);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      if (value.length >= 2) {
        searchLocations(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: SearchResult) => {
    console.log('🔍 Selected suggestion:', suggestion);
    
    let coordinates = suggestion.coordinates;
    let fullAddress = suggestion.full_address;
    
    // Always try to retrieve full details from the retrieve endpoint
    try {
      console.log('📡 Calling retrieve endpoint with ID:', suggestion.id);
      const retrieveResponse = await fetch(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.id}?access_token=${mapboxgl.accessToken}&session_token=${Date.now()}`
      );

      if (!retrieveResponse.ok) {
        throw new Error(`Retrieve failed: ${retrieveResponse.status} ${retrieveResponse.statusText}`);
      }

      const retrieveData = await retrieveResponse.json();
      console.log('📍 Retrieve response:', retrieveData);

      if (retrieveData.features && retrieveData.features[0]) {
        const feature = retrieveData.features[0];
        
        // Extract coordinates from geometry
        if (feature.geometry && feature.geometry.coordinates) {
          coordinates = {
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0]
          };
          console.log('✅ Extracted coordinates:', coordinates);
        }

        // Get the best address from properties
        if (feature.properties) {
          fullAddress = feature.properties.full_address || 
                       feature.properties.place_formatted || 
                       feature.properties.name || 
                       suggestion.full_address;
        }
      } else {
        console.warn('⚠️ No features in retrieve response, using suggestion coordinates');
      }
    } catch (error) {
      console.error('❌ Error retrieving coordinates:', error);
      console.log('🔄 Falling back to suggestion coordinates');
    }

    // Validate coordinates before proceeding
    if (!coordinates.latitude || !coordinates.longitude || 
        coordinates.latitude === 0 || coordinates.longitude === 0) {
      console.error('❌ Invalid coordinates:', coordinates);
      alert('Sorry, we couldn\'t get the location coordinates. Please try a different search.');
      return;
    }

    console.log('✅ Final coordinates to use:', coordinates);

    // Update the appropriate input field
    if (activeField === 'start') {
      setStartQuery(suggestion.name);
    } else {
      setDestinationQuery(suggestion.name);
    }

    // Call the parent callback
    onLocationSelect(
      {
        lng: coordinates.longitude,
        lat: coordinates.latitude,
        address: fullAddress
      },
      activeField || 'start'
    );

    // Clear the search
    setShowSuggestions(false);
    setSuggestions([]);
    setActiveField(null);
  };

  return (
    <div ref={searchContainerRef} className={`relative ${className}`}>
      {/* Integrated Container with Grey Border */}
      <div className="bg-white/10 border border-slate-300 rounded-xl overflow-hidden shadow-inner">

        {/* Input Fields */}
        <div className="relative">
          
          {/* Start Location */}
          <div className="relative border-b border-slate-300">
            <div className="flex items-center px-5 py-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={startQuery}
                  onChange={(e) => handleInputChange(e, 'start')}
                  placeholder="Add starting point"
                  className="w-full text-slate-800 placeholder-slate-500 bg-transparent border-none outline-none text-base focus:bg-white/20 rounded transition-colors pr-8"
                  onFocus={() => {
                    setActiveField('start');
                    if (suggestions.length > 0 && startQuery.length >= 2) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                {startQuery && (
                  <button
                    onClick={() => {
                      setStartQuery('');
                      if (onInputChange) {
                        onInputChange('', 'start');
                      }
                    }}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-slate-400/20 hover:bg-slate-400/40 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {isLoading && activeField === 'start' && (
                <div className="flex-shrink-0 ml-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
                </div>
              )}
            </div>
          </div>

          {/* Destination Location */}
          <div className="relative">
            <div className="flex items-center px-5 py-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={destinationQuery}
                  onChange={(e) => handleInputChange(e, 'destination')}
                  placeholder="Add destination"
                  className="w-full text-slate-800 placeholder-slate-500 bg-transparent border-none outline-none text-base focus:bg-white/20 rounded transition-colors pr-8"
                  onFocus={() => {
                    setActiveField('destination');
                    if (suggestions.length > 0 && destinationQuery.length >= 2) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                {destinationQuery && (
                  <button
                    onClick={() => {
                      setDestinationQuery('');
                      if (onInputChange) {
                        onInputChange('', 'destination');
                      }
                    }}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-slate-400/20 hover:bg-slate-400/40 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {isLoading && activeField === 'destination' && (
                <div className="flex-shrink-0 ml-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Frosted Glass Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white/15 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id || index}
                onClick={() => handleSuggestionSelect(suggestion)}
                className="px-5 py-4 hover:bg-white/20 cursor-pointer border-b border-white/20 last:border-b-0 transition-colors"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center mr-4">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800 truncate">{suggestion.name}</div>
                    <div className="text-sm text-slate-600 truncate">{suggestion.full_address}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {showSuggestions && !isLoading && suggestions.length === 0 && activeField && (
        <div className="absolute z-50 w-full mt-2 bg-white/15 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl p-6">
          <div className="text-center">
            <div className="text-slate-500 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-slate-600">No locations found</p>
            <p className="text-sm text-slate-500 mt-1">Try a different search term</p>
          </div>
        </div>
      )}
    </div>
  );
}