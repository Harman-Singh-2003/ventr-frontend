// Routing Service for Ventr API
// Handles route calculation requests and responses

export interface RouteStats {
  total_distance_m: number;
  total_time_s: number;
  crime_incidents_nearby: number;
  safety_score: number;
  detour_factor: number;
}

export interface RouteFeature {
  type: 'Feature';
  geometry: {
    type: 'LineString' | 'Point';
    coordinates: number[][] | number[];
  };
  properties: {
    algorithm?: string;
    total_distance_m?: number;
    node_count?: number;
    calculation_time_ms?: number;
    type?: string;
    name?: string;
  };
}

export interface RouteResponse {
  success: boolean;
  message: string;
  route_geojson: {
    type: 'FeatureCollection';
    features: RouteFeature[];
  };
  route_stats: RouteStats;
  shortest_path_stats: RouteStats | null;
}

export interface RouteRequest {
  start_lng: number;
  start_lat: number;
  end_lng: number;
  end_lat: number;
}

// New interfaces for the calculate-multiple API
export interface CalculateMultipleRequest {
  start: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  include_shortest: boolean;
  include_safest: boolean;
  crime_weight_safest: number;
  max_detour_factor: number;
}

export interface CalculateMultipleResponse {
  success: boolean;
  message: string;
  shortest_route: any; // GeoJSON route data
  shortest_stats: RouteStats;
  safest_route: any; // GeoJSON route data
  safest_stats: RouteStats;
  comparison_stats: any; // Additional comparison data
}

export interface ApiRouteRequest {
  start: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  route_type: string;
  distance_weight: number;
  crime_weight: number;
  max_detour_factor?: number;
}

export interface ShortestRouteRequest {
  start: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
}

export interface ProcessedRoutes {
  shortest: RouteResponse;
  safe: RouteResponse;
  comparison?: any; // Additional comparison data from the new API
}

class RoutingService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') { // User's API URL
    this.baseUrl = baseUrl;
  }

  /**
   * Calculate both shortest and safe routes using the new calculate-multiple endpoint
   */
  async calculateRoutes(request: RouteRequest): Promise<ProcessedRoutes> {
    console.log('🚗 Calculating routes for:', request);

    try {
      // Use the new calculate-multiple endpoint
      const apiRequest: CalculateMultipleRequest = {
        start: {
          latitude: request.start_lat,
          longitude: request.start_lng
        },
        destination: {
          latitude: request.end_lat,
          longitude: request.end_lng
        },
        include_shortest: true,
        include_safest: true,
        crime_weight_safest: 0.1,
        max_detour_factor: 2
      };

      console.log('📡 Calling calculate-multiple API with request:', apiRequest);
      const response = await fetch(`${this.baseUrl}/api/routing/calculate-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Calculate-multiple API failed:', response.status, errorText);
        throw new Error(`Calculate-multiple API failed: ${response.status} - ${errorText}`);
      }

      const result: CalculateMultipleResponse = await response.json();
      console.log('✅ Calculate-multiple response received:', result);

      // Validate the response structure
      if (!RoutingService.validateApiResponse(result)) {
        throw new Error('Invalid API response structure');
      }

      if (!result.success) {
        throw new Error(`API returned success: false - ${result.message}`);
      }

      if (!result.shortest_route || !result.safest_route) {
        throw new Error('API response missing route data');
      }

      if (!result.shortest_stats || !result.safest_stats) {
        throw new Error('API response missing stats data');
      }

      // Convert the response to the expected ProcessedRoutes format
      const processedRoutes: ProcessedRoutes = {
        shortest: {
          success: result.success,
          message: result.message,
          route_geojson: result.shortest_route,
          route_stats: result.shortest_stats,
          shortest_path_stats: null
        },
        safe: {
          success: result.success,
          message: result.message,
          route_geojson: result.safest_route,
          route_stats: result.safest_stats,
          shortest_path_stats: null
        },
        comparison: result.comparison_stats // Add comparison data
      };

      console.log('✅ Routes processed successfully from calculate-multiple endpoint');
      console.log('📍 Shortest route stats:', processedRoutes.shortest.route_stats);
      console.log('🛡️ Safe route stats:', processedRoutes.safe.route_stats);
      
      return processedRoutes;

    } catch (error) {
      console.error('❌ Error calculating routes:', error);
      
      // Fallback to hardcoded data if API fails (for development)
      console.log('🔄 Falling back to hardcoded data...');
      return this.getHardcodedRoutes(request);
    }
  }

  /**
   * Calculate shortest route using dedicated shortest route endpoint
   * @deprecated Use calculateRoutes instead which uses the new calculate-multiple endpoint
   */
  private async calculateShortestRoute(request: RouteRequest): Promise<RouteResponse> {
    console.log('📍 Calling dedicated shortest route API...');
    
    const apiRequest: ShortestRouteRequest = {
      start: {
        latitude: request.start_lat,
        longitude: request.start_lng
      },
      destination: {
        latitude: request.end_lat,
        longitude: request.end_lng
      }
    };

    const response = await fetch(`${this.baseUrl}/api/routing/shortest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Shortest route API failed:', response.status, errorText);
      throw new Error(`Shortest route API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Shortest route received from dedicated endpoint:', result);
    return result;
  }

  /**
   * Calculate safe route using crime-aware algorithm (prioritizes crime avoidance over distance)
   * @deprecated Use calculateRoutes instead which uses the new calculate-multiple endpoint
   */
  private async calculateSafeRoute(request: RouteRequest): Promise<RouteResponse> {
    console.log('🛡️ Calling crime-aware API for safe route...');
    
    const apiRequest: ApiRouteRequest = {
      start: {
        latitude: request.start_lat,
        longitude: request.start_lng
      },
      destination: {
        latitude: request.end_lat,
        longitude: request.end_lng
      },
      route_type: "crime_aware",
      distance_weight: 0.9,
      crime_weight: 0.1, 
      max_detour_factor: 3.0
    };

    const response = await fetch(`${this.baseUrl}/api/routing/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Safe route API failed:', response.status, errorText);
      throw new Error(`Safe route API failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Safe route received from crime-aware endpoint:', result);
    return result;
  }

  /**
   * Hardcoded routes for development/testing
   * TODO: Remove when API integration is complete
   */
  private getHardcodedRoutes(request: RouteRequest): ProcessedRoutes {
    console.log('📝 Using hardcoded route data for development');

    // Shortest route (blue) - from your first GeoJSON
    const shortestRoute: RouteResponse = {
      "success": true,
      "message": "Route calculated successfully",
      "route_geojson": {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [-79.398508, 43.653891],
                [-79.39862, 43.653869],
                [-79.398793, 43.654295],
                [-79.398844, 43.654422],
                [-79.399104, 43.655062],
                [-79.399135, 43.655139],
                [-79.399363, 43.655721],
                [-79.399397, 43.655783],
                [-79.39943, 43.655862],
                [-79.399445, 43.65593],
                [-79.399742, 43.656645],
                [-79.399791, 43.656755],
                [-79.400211, 43.657829],
                [-79.400246, 43.657905],
                [-79.400315, 43.658056],
                [-79.400298, 43.658075],
                [-79.401639, 43.659427],
                [-79.401678, 43.65953],
                [-79.401669, 43.659552],
                [-79.401539, 43.661169],
                [-79.401543, 43.661185],
                [-79.401603, 43.661333],
                [-79.401454, 43.661362],
                [-79.401465, 43.661393]
              ]
            },
            "properties": {
              "algorithm": "shortest_path",
              "total_distance_m": 946.0431277511706,
              "node_count": 24,
              "calculation_time_ms": 3.2889842987060547
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [-79.398508, 43.653891]
            },
            "properties": {
              "type": "start",
              "name": "Start Point"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [-79.401465, 43.661393]
            },
            "properties": {
              "type": "end",
              "name": "End Point"
            }
          }
        ]
      },
      "route_stats": {
        "total_distance_m": 946,
        "total_time_s": 681,
        "crime_incidents_nearby": 23,
        "safety_score": 0.26,
        "detour_factor": 1
      },
      "shortest_path_stats": null
    };

    // Safe route (green) - from your second GeoJSON
    const safeRoute: RouteResponse = {
      "success": true,
      "message": "Route calculated successfully",
      "route_geojson": {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [-79.398508, 43.653891],
                [-79.39862, 43.653869],
                [-79.398793, 43.654295],
                [-79.398393, 43.654379],
                [-79.398443, 43.654508],
                [-79.398604, 43.654918],
                [-79.398634, 43.654996],
                [-79.397042, 43.655334],
                [-79.396922, 43.655358],
                [-79.397069, 43.655732],
                [-79.397215, 43.656079],
                [-79.397368, 43.656456],
                [-79.397399, 43.656541],
                [-79.397561, 43.656937],
                [-79.39806, 43.658183],
                [-79.398143, 43.65837],
                [-79.398773, 43.659993],
                [-79.398947, 43.659964],
                [-79.398984, 43.660067],
                [-79.399004, 43.660063],
                [-79.399303, 43.660804],
                [-79.399468, 43.661525],
                [-79.399598, 43.66158],
                [-79.400791, 43.661332],
                [-79.401184, 43.661251],
                [-79.401245, 43.661411],
                [-79.401454, 43.661362],
                [-79.401465, 43.661393]
              ]
            },
            "properties": {
              "algorithm": "weighted_astar",
              "total_distance_m": 1230.8694700515448,
              "node_count": 28,
              "calculation_time_ms": 3.7293434143066406
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [-79.398508, 43.653891]
            },
            "properties": {
              "type": "start",
              "name": "Start Point"
            }
          },
          {
            "type": "Feature",
            "geometry": {
              "type": "Point",
              "coordinates": [-79.401465, 43.661393]
            },
            "properties": {
              "type": "end",
              "name": "End Point"
            }
          }
        ]
      },
      "route_stats": {
        "total_distance_m": 1230.9,
        "total_time_s": 886,
        "crime_incidents_nearby": 27,
        "safety_score": 0.473,
        "detour_factor": 1
      },
      "shortest_path_stats": null
    };

    return {
      shortest: shortestRoute,
      safe: safeRoute
    };
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else {
      return `${(meters / 1000).toFixed(1)}km`;
    }
  }

  /**
   * Format time for display
   */
  static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes}min`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours}h ${minutes}min`;
    }
  }

  /**
   * Format safety score as percentage
   */
  static formatSafetyScore(score: number): string {
    return `${Math.round(score * 100)}% safer`;
  }

  /**
   * Get comparison summary from the new API response
   */
  static getComparisonSummary(comparisonStats: any): string {
    if (!comparisonStats) return 'No comparison data available';
    
    try {
      // This method can be expanded based on what comparison_stats contains
      return JSON.stringify(comparisonStats, null, 2);
    } catch (error) {
      return 'Error parsing comparison data';
    }
  }

  /**
   * Validate API response structure
   */
  static validateApiResponse(response: CalculateMultipleResponse): boolean {
    return !!(
      response.success &&
      response.shortest_route &&
      response.safest_route &&
      response.shortest_stats &&
      response.safest_stats
    );
  }
}

// Export singleton instance
export const routingService = new RoutingService();
export default RoutingService; 