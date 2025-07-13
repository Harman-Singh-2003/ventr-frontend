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
}

export default function ClickPopup({
  lng,
  lat,
  x,
  y,
  onSetLocation,
  onClose,
}: ClickPopupProps) {
  const popupOffset = 16; // How many px above the click you want the popup to appear (adjust as needed)
  const pulseSize = 36;

  return (
    <>
      <div
        className="pointer-events-none z-30"
        style={{
          position: "absolute",
          left: `${x - pulseSize / 2}px`,
          top: `${y}px`,
          transform: "translate(-50%, -50%)", // center at click
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "rgba(80,120,255,1)",
          boxShadow: "0 3px 24px 0 rgba(80,120,255,0.22)",
          animation: "pulseGlass 1.3s infinite cubic-bezier(0.4,0,0.2,1)",
          opacity: 1,
          marginTop: `-${popupOffset}px`, // Adjust to position above the click
        }}
      />

      {/* Popup above the pulse */}
      <div
        className="absolute z-40"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: "translate(-50%, -100%)", // bottom-center at click
          marginTop: "-24px",
        }}
      >
        <div
          className="relative min-w-[180px] max-w-[230px] p-3 flex flex-col items-center
                     rounded-xl border border-white/30 shadow-xl
                     backdrop-blur-md bg-white/25"
          style={{
            background: "rgba(255,255,255,0.17)",
            boxShadow: "0 4px 24px 0 rgba(31,38,135,0.14)",
            pointerEvents: "auto",
          }}
        >
          {/* Top-right close (X) */}
          <button
            onClick={onClose}
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
              onClick={() => onSetLocation(lng, lat, "start")}
              className="
                flex-1 flex flex-col items-center px-1.5 py-1.5 rounded-lg
                bg-green-500 hover:bg-green-600 active:bg-green-700
                text-white font-semibold text-xs shadow
                transition-all duration-150
              "
            >
              <FaMapMarkerAlt className="text-xs mb-0.5" />
              Start
            </button>
            <button
              onClick={() => onSetLocation(lng, lat, "destination")}
              className="
                flex-1 flex flex-col items-center px-1.5 py-1.5 rounded-lg
                bg-red-500 hover:bg-red-600 active:bg-red-700
                text-white font-semibold text-xs shadow
                transition-all duration-150
              "
            >
              <FaFlagCheckered className="text-xs mb-0.5" />
              End
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
