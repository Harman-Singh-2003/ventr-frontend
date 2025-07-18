'use client';

import MapboxMap from '@/components/MapboxMap';

export default function Home() {
  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Map Container */}
      <div className="flex-1 relative" style={{ minHeight: '400px' }}>
        <MapboxMap />
      </div>
    </div>
  );
}
