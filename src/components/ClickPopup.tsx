import React from "react";
import { FaMapMarkerAlt, FaFlagCheckered, FaTimes } from "react-icons/fa";

interface ClickPopupProps {
  lng: number;
  lat: number;
  x: number;
  y: number;
  onSetLocation: (
    lng: number,
    lat: number,
    type: "start" | "destination"
  ) => void;
  onClose: () => void;
  isMapboxPopup?: boolean; // New prop to determine if it's inside a Mapbox popup
}

export default function ClickPopup({
  lng,
  lat,
  x,
  y,
  onSetLocation,
  onClose,
  isMapboxPopup = false,
}: ClickPopupProps) {
  const popupOffset = 16; // How many px above the click you want the popup to appear (adjust as needed)
  const pulseSize = 36;

  // If this is for a Mapbox popup, render simplified content without positioning
return (
  <div style={{ position: "relative" }}>
    {/* 🔵 Animated Pulse */}
    <div className="pulse-glass p-4" />

<div
      style={{
        minWidth: "180px",
        maxWidth: "230px",
        padding: "12px",
        borderRadius: "16px",
        background: "rgba(255, 255, 255, 0.15)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
        color: "#1F2937", // Tailwind gray-800
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Top-right close (X) */}
      <button
        data-action="close"
        className="absolute top-2 right-2 p-0 text-gray-500 hover:text-gray-800 transition"
        style={{
          background: "none",
          border: "none",
          lineHeight: 1,
          fontSize: "1.1rem",
          fontWeight: 300,
        }}
        aria-label="Close"
      >
        <FaTimes />
      </button>
      {/* Icon & Title */}
      <div className="flex flex-col items-center mb-1">
        <div className="text-blue-600 text-lg mb-0.5">
          <FaMapMarkerAlt />
        </div>
        <div className="text-sm font-semibold text-gray-800 mb-1 text-center">
          Location Coordinates
        </div>
      </div>
      {/* Longitude and Latitude */}
      <div className="flex items-center gap-2 mb-2 px-2 rounded-lg">
        <span className="text-[11px] text-gray-700 font-mono">
          {lng.toFixed(5)}
        </span>
        <span className="text-[10px] text-gray-400 mx-1">|</span>
        <span className="text-[11px] text-gray-700 font-mono">
          {lat.toFixed(5)}
        </span>
      </div>
      {/* Buttons */}
      <div className="flex gap-2 w-full mt-1">
        <button
          data-action="start"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: "8px",
            backgroundColor: "#22c55e",
            color: "white",
            fontWeight: 600,
            fontSize: "11px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
            transition: "background-color 0.2s ease-in-out",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#16a34a")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#22c55e")
          }
        >
          <FaMapMarkerAlt className="text-xs mb-0.5" />
          Start
        </button>
        <button
          data-action="destination"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: "8px",
            backgroundColor: "#ef4444", // red-500
            color: "white",
            fontWeight: 600,
            fontSize: "11px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
            cursor: "pointer",
            transition: "background-color 0.2s ease-in-out",
          }}
          onMouseEnter={
            (e) => (e.currentTarget.style.backgroundColor = "#dc2626") // red-600
          }
          onMouseLeave={
            (e) => (e.currentTarget.style.backgroundColor = "#ef4444") // red-500
          }
        >
          <FaFlagCheckered className="text-xs mb-0.5" />
          End
        </button>
      </div>
    </div>
  </div>
);

}
