import React from 'react';
import { MapPin, Clock, Route, ShieldCheck, AlertTriangle, Zap, Navigation } from 'lucide-react';
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
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Header with Search - Fixed at top */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-white/15 backdrop-blur-xl border-b border-white/30 shadow-lg">
          <div className="p-3">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <Navigation className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Ventr</h1>
                <p className="text-xs text-slate-600">Safe route planning</p>
              </div>
            </div>
            <SearchBox 
              onLocationSelect={onLocationSelect}
              placeholder="Where to?"
              startValue={startInputValue}
              destinationValue={destinationInputValue}
              onInputChange={onInputChange}
              onClear={onClear}
            />
          </div>
        </div>

        {/* Mobile Bottom Sheet with Route Info - Fixed at bottom */}
        {startPoint && destinationPoint && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-white/15 backdrop-blur-xl border-t border-white/30 shadow-2xl max-h-[25vh] overflow-y-auto sidebar-scroll">
            <div className="p-3 space-y-3">
              {/* Loading state */}
              {isLoadingRoutes && (
                <div className="bg-white/10 border border-white/20 rounded-lg p-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl">
                        <Route className="w-5 h-5 text-white animate-pulse" />
                      </div>
                      <div className="absolute inset-0 border-2 border-cyan-200/50 rounded-full animate-spin border-t-cyan-400"></div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Finding routes...</h3>
                      <p className="text-xs text-slate-600">Analyzing safety data</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {routeError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-800 mb-1">Route Error</h3>
                      <p className="text-xs text-red-700">{routeError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Route details */}
              {routes && !isLoadingRoutes && !routeError && (
                <div className="space-y-3">
                  {/* Safe Route - Recommended */}
                  <div className="bg-emerald-500/10 border border-emerald-500 rounded-lg overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                            <ShieldCheck className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-800">Recommended</h3>
                            <p className="text-xs text-emerald-600 font-semibold">Safest option</p>
                          </div>
                        </div>
                        <div className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-md">
                          <span className="text-xs text-emerald-700 font-bold">
                            +{Math.round((routes.safe.route_stats.safety_score - routes.shortest.route_stats.safety_score) * 100)}% safer
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="bg-white/20 border border-white/30 rounded-md p-2">
                            <div className="flex items-center space-x-1">
                              <Route className="w-6 h-6 text-emerald-600" />
                              <div className="flex-1 pl-2">
                                <p className="text-xs text-slate-600">Distance</p>
                                <p className="text-sm font-bold text-slate-800">{RoutingService.formatDistance(routes.safe.route_stats.total_distance_m)}</p>
                                <p className="text-xs text-amber-600 font-medium">
                                  +{RoutingService.formatDistance(routes.safe.route_stats.total_distance_m - routes.shortest.route_stats.total_distance_m)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white/20 border border-white/30 rounded-md p-2">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-6 h-6 text-emerald-600" />
                              <div className="flex-1 pl-2">
                                <p className="text-xs text-slate-600">Time</p>
                                <p className="text-sm font-bold text-slate-800">{RoutingService.formatTime(routes.safe.route_stats.total_time_s)}</p>
                                <p className="text-xs text-amber-600 font-medium">
                                  +{RoutingService.formatTime(routes.safe.route_stats.total_time_s - routes.shortest.route_stats.total_time_s)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <OpenRouteInMapsButton 
                            geojson={routes.safe.route_geojson} 
                            routeType="safe" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fastest Route - Alternative */}
                  <div className="bg-transparent border border-slate-400/20 rounded-lg overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-800">Fastest Route</h3>
                          <p className="text-xs text-blue-600 font-semibold">Quickest option</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="bg-white/20 border border-white/30 rounded-md p-2">
                            <div className="flex items-center space-x-1">
                              <Route className="w-6 h-6 text-blue-600" />
                              <div className="flex-1 pl-2">
                                <p className="text-xs text-slate-600">Distance</p>
                                <p className="text-sm font-bold text-slate-800">{RoutingService.formatDistance(routes.shortest.route_stats.total_distance_m)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white/20 border border-white/30 rounded-md p-2">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-6 h-6 text-blue-600" />
                              <div className="flex-1 pl-2">
                                <p className="text-xs text-slate-600">Time</p>
                                <p className="text-sm font-bold text-slate-800">{RoutingService.formatTime(routes.shortest.route_stats.total_time_s)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <OpenRouteInMapsButton 
                            geojson={routes.shortest.route_geojson} 
                            routeType="shortest" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state for mobile - Fixed at bottom */}
        {(!startPoint || !destinationPoint) && (
          <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/15 backdrop-blur-xl border border-white/30 rounded-lg shadow-2xl p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3 shadow-xl">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Plan Your Route</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your destination to discover safe walking routes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <aside className="hidden md:flex absolute top-4 left-4 w-[32rem] max-h-[calc(100vh-2rem)] bg-white/15 backdrop-blur-xl border border-white/30 shadow-2xl rounded-2xl flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Navigation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Ventr</h1>
              <p className="text-slate-600">Safe route planning</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-5 border-b border-white/20">
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
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          {startPoint && destinationPoint ? (
            <div className="p-5 space-y-5">
              {/* Loading state */}
              {isLoadingRoutes && (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-6">
                  <div className="flex items-center space-x-5">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl">
                        <Route className="w-8 h-8 text-white animate-pulse" />
                      </div>
                      <div className="absolute inset-0 border-4 border-cyan-200/50 rounded-full animate-spin border-t-cyan-400"></div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Finding routes...</h3>
                      <p className="text-slate-600">Analyzing safety data</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {routeError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                  <div className="flex items-start space-x-5">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Route Error</h3>
                      <p className="text-red-700">{routeError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Route details */}
              {routes && !isLoadingRoutes && !routeError && (
                <div className="space-y-5">
                  {/* Safe Route - Recommended */}
                  <div className="bg-emerald-500/10 border border-emerald-500 rounded-2xl overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                            <ShieldCheck className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">Recommended Route</h3>
                            <p className="text-emerald-600 font-semibold">Safest option</p>
                          </div>
                        </div>
                        <div className="bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-xl">
                          <span className="text-emerald-700 font-bold">
                            +{Math.round((routes.safe.route_stats.safety_score - routes.shortest.route_stats.safety_score) * 100)}% safer
                          </span>
                        </div>
                      </div>
                      
                      {/* Primary stats with Open in Maps button */}
                      <div className="flex items-end gap-4 mb-5">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="bg-white/20 border border-white/30 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                              <Route className="w-6 h-6 text-emerald-600" />
                              <div>
                                <p className="text-slate-600 text-sm">Distance</p>
                                <p className="text-xl font-bold text-slate-800">{RoutingService.formatDistance(routes.safe.route_stats.total_distance_m)}</p>
                                <p className="text-sm text-amber-600 font-medium">
                                  +{RoutingService.formatDistance(routes.safe.route_stats.total_distance_m - routes.shortest.route_stats.total_distance_m)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white/20 border border-white/30 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                              <Clock className="w-6 h-6 text-emerald-600" />
                              <div>
                                <p className="text-slate-600 text-sm">Time</p>
                                <p className="text-xl font-bold text-slate-800">{RoutingService.formatTime(routes.safe.route_stats.total_time_s)}</p>
                                <p className="text-sm text-amber-600 font-medium">
                                  +{RoutingService.formatTime(routes.safe.route_stats.total_time_s - routes.shortest.route_stats.total_time_s)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <OpenRouteInMapsButton 
                            geojson={routes.safe.route_geojson} 
                            routeType="safe" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fastest Route - Alternative */}
                  <div className="bg-transparent border border-slate-400/20 rounded-2xl overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center space-x-4 mb-5">
                        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Zap className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">Fastest Route</h3>
                          <p className="text-blue-600 font-semibold">Quickest option</p>
                        </div>
                      </div>
                      
                      <div className="flex items-end gap-4">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="bg-white/20 border border-white/30 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                              <Route className="w-6 h-6 text-blue-600" />
                              <div>
                                <p className="text-slate-600 text-sm">Distance</p>
                                <p className="text-xl font-bold text-slate-800">{RoutingService.formatDistance(routes.shortest.route_stats.total_distance_m)}</p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white/20 border border-white/30 rounded-xl p-4">
                            <div className="flex items-center space-x-3">
                              <Clock className="w-6 h-6 text-blue-600" />
                              <div>
                                <p className="text-slate-600 text-sm">Time</p>
                                <p className="text-xl font-bold text-slate-800">{RoutingService.formatTime(routes.shortest.route_stats.total_time_s)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <OpenRouteInMapsButton 
                            geojson={routes.shortest.route_geojson} 
                            routeType="shortest" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl">
                  <MapPin className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Plan Your Route</h3>
                <p className="text-slate-600 leading-relaxed">
                  Enter your destination to discover safe walking routes that avoid crime hotspots.
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
