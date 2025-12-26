"use client";
import React, { useEffect, useState } from "react";
import { useGlobalScale } from "../useGlobalScale";

// === CONFIG BASE ===
const BASE_W = 1920;
const BASE_H = 1080;
const BORDER_REF = { OFFSET_RIGHT: 9, OFFSET_UP: 2 };

// === CONFIG SAFEZONE — valeurs calibrées de Yéti ===
const SAFEZONE_BASE = {
  Haut: 0.30,
  Bas: 0.00,
  Gauche: 0.00,
  Droite: 0.20,
  scaleX: 1.76,
  scaleY: 0.80,
  scaleGlobal: 0.94,
  borderRadius: 80,
};

export default function Arena() {
  const { x, y } = useGlobalScale(); // échelle globale fenêtrée
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0c111b",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* === STAGE GLOBAL (tout se scale ensemble) === */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: BASE_W,
          height: BASE_H,
          transform: `translate(-50%, -50%) scale(${x}, ${y})`,
          transformOrigin: "center center",
          transition: "transform 0.2s ease-out",
        }}
      >
        {/* === BORDURE KING NARWHAL === */}
        <img
          src="/border-king-narwhal.png"
          alt="Map border"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: BASE_W,
            height: BASE_H,
            transform: `translate(${BORDER_REF.OFFSET_RIGHT}px, ${-BORDER_REF.OFFSET_UP}px)`,
            imageRendering: "pixelated",
            pointerEvents: "none",
            zIndex: 20,
            animation: "borderGlow 6s ease-in-out infinite",
          }}
        />

        {/* === SAFEZONE RECTANGULAIRE ARRONDIE (valeurs fixes) === */}
        {isClient && (
          <svg
            width={BASE_W}
            height={BASE_H}
            viewBox={`0 0 ${BASE_W} ${BASE_H}`}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 15,
              pointerEvents: "none",
            }}
          >
            {(() => {
              const cx = BASE_W / 2;
              const cy = BASE_H / 2;
              const {
                Haut,
                Bas,
                Gauche,
                Droite,
                scaleX,
                scaleY,
                scaleGlobal,
                borderRadius,
              } = SAFEZONE_BASE;

              // base dynamique + global scale
              const baseSize =
                Math.min(BASE_W, BASE_H) * scaleGlobal * 0.8;
              const width = baseSize * scaleX;
              const height = baseSize * scaleY;

              const offsetX = (Droite - Gauche) * 10;
              const offsetY = (Bas - Haut) * 10;

              const xPos = cx - width / 2 + offsetX;
              const yPos = cy - height / 2 + offsetY;

              return (
                <rect
                  x={xPos}
                  y={yPos}
                  width={width}
                  height={height}
                  rx={borderRadius}
                  ry={borderRadius}
                  fill="none"
                  stroke="rgba(255,0,0,0.55)"
                  strokeWidth="3"
                  strokeDasharray="12,8"
                />
              );
            })()}
          </svg>
        )}

        {/* === HALO ANIMÉ === */}
        <svg
          width={BASE_W}
          height={BASE_H}
          viewBox={`0 0 ${BASE_W} ${BASE_H}`}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <defs>
            <radialGradient id="halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,215,0,0.35)" />
              <stop offset="100%" stopColor="rgba(255,215,0,0)" />
            </radialGradient>
          </defs>
          <circle cx={BASE_W / 2} cy={BASE_H / 2} r={180} fill="url(#halo)">
            <animate
              attributeName="r"
              values="160;190;160"
              dur="6s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>
      </div>

      {/* === STYLE === */}
      <style>{`
        @keyframes borderGlow {
          0%,100% {
            filter: drop-shadow(0 0 15px rgba(255,200,100,.25))
                    drop-shadow(0 0 30px rgba(255,160,60,.15));
          }
          50% {
            filter: drop-shadow(0 0 25px rgba(255,210,120,.4))
                    drop-shadow(0 0 50px rgba(255,180,80,.3));
          }
        }
      `}</style>
    </div>
  );
}
