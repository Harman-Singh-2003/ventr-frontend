'use client';

import { useState } from 'react';
import MapboxMap from '@/components/MapboxMap';

export default function Home() {
  const [routeData, setRouteData] = useState<any>(null);

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Map Container */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        <MapboxMap onRouteChange={setRouteData} />
      </div>
    </div>
  );
}
