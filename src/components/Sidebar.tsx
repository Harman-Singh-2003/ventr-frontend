import React from 'react';
import { MapPin, Clock, Route, Shield, AlertTriangle, TrendingUp, Navigation } from 'lucide-react';
import SearchBox from './SearchBox';
import OpenRouteInMapsButton from './OpenRouteInMapsButton';
import { ProcessedRoutes } from '../services/routingService';
import RoutingService from '../services/routingService';

interface LocationPoint {
  lng: number;
  lat: number;
  address?: string;
}

interface SidebarProps {
  startPoint: LocationPoint | null;
  destinationPoint: LocationPoint | null;
  startInputValue: string;
  destinationInputValue: string;
  routes: ProcessedRoutes | null;
  isLoadingRoutes: boolean;
  routeError: string | null;
  onLocationSelect: (location: { lng: number; lat: number; address: string }, type: 'start' | 'destination') => void;
  onInputChange: (value: string, type: 'start' | 'destination') => void;
  onClear: () => void;
}

export default function Sidebar({
  startPoint,
  destinationPoint,
  startInputValue,
  destinationInputValue,
  routes,
  isLoadingRoutes,
  routeError,
  onLocationSelect,
  onInputChange,
  onClear
}: SidebarProps) {
  return (
    <div className="w-96 h-full bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Ventr</h1>
            <p className="text-xs text-slate-500">Safe route planning</p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="p-4 bg-white border-b border-slate-100">
        <SearchBox 
          onLocationSelect={onLocationSelect}
          placeholder="Where to?"
          startValue={startInputValue}
          destinationValue={destinationInputValue}
          onInputChange={onInputChange}
          onClear={onClear}
        />
      </div>

      {/* Route Information Section */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {startPoint && destinationPoint ? (
          <div className="p-4 space-y-4">
            {/* Loading state */}
            {isLoadingRoutes && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Route className="w-6 h-6 text-white animate-pulse" />
                    </div>
                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Finding routes...</h3>
                    <p className="text-sm text-slate-500">Analyzing safety data</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {routeError && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-1">Route Error</h3>
                    <p className="text-sm text-red-600">{routeError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Route details */}
            {routes && !isLoadingRoutes && !routeError && (
              <div className="space-y-3">
                {/* Safe Route - Recommended */}
                <div className="bg-white/90 rounded-xl shadow-sm border border-white/60 backdrop-blur-sm">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-emerald-100/80 rounded-md flex items-center justify-center backdrop-blur-sm">
                          <Shield className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="font-semibold text-slate-900 text-sm">Recommended Route</span>
                      </div>
                      <div className="flex items-center space-x-1 bg-emerald-50/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <span className="text-xs font-medium text-emerald-700">
                          +{Math.round((routes.safe.route_stats.safety_score - routes.shortest.route_stats.safety_score) * 100)}% safer
                        </span>
                      </div>
                    </div>
                    
                    {/* Primary stats row */}
                    <div className="flex items-center space-x-6 mb-3">
                      <div className="flex items-center space-x-1.5">
                        <Route className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900 text-sm">{RoutingService.formatDistance(routes.safe.route_stats.total_distance_m)}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900 text-sm">{RoutingService.formatTime(routes.safe.route_stats.total_time_s)}</span>
                      </div>
                    </div>

                    {/* Difference stats row */}
                    <div className="flex items-center justify-between mb-3 p-2 bg-slate-50/60 rounded-lg backdrop-blur-sm border border-slate-100/40">
                      <div className="flex items-center space-x-3 text-xs">
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-600">+{RoutingService.formatTime(routes.safe.route_stats.total_time_s - routes.shortest.route_stats.total_time_s)}</span>
                        </div>
                        <div className="w-px h-3 bg-slate-300"></div>
                        <div className="flex items-center space-x-1">
                          <Route className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-600">+{RoutingService.formatDistance(routes.safe.route_stats.total_distance_m - routes.shortest.route_stats.total_distance_m)}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">vs fastest</span>
                    </div>

                    <div className="flex justify-end">
                      <OpenRouteInMapsButton 
                        geojson={routes.safe.route_geojson} 
                        routeType="safe" 
                      />
                    </div>
                  </div>
                </div>

                {/* Shortest Route - Alternative */}
                <div className="bg-white/90 rounded-xl shadow-sm border border-white/60 backdrop-blur-sm">
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-5 h-5 bg-blue-100/80 rounded-md flex items-center justify-center backdrop-blur-sm">
                        <TrendingUp className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-semibold text-slate-900 text-sm">Fastest Route</span>
                      <span className="text-xs text-slate-500">Alternative option</span>
                    </div>
                    
                    <div className="flex items-center space-x-6 mb-3">
                      <div className="flex items-center space-x-1.5">
                        <Route className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900 text-sm">{RoutingService.formatDistance(routes.shortest.route_stats.total_distance_m)}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-slate-900 text-sm">{RoutingService.formatTime(routes.shortest.route_stats.total_time_s)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <OpenRouteInMapsButton 
                        geojson={routes.shortest.route_geojson} 
                        routeType="shortest" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-sm">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Plan Your Route</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Enter your destination to discover safe walking routes that avoid crime hotspots.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
