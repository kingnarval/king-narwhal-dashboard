// components/UI/GlobalStyles.jsx
// GlobalStyles - FULL UI FIXED
// ✅ All @media removed
// ✅ No viewport units
// ✅ Pure animations and button styles only

import React from 'react';

/**
 * GlobalStyles - Toutes les animations CSS et styles globaux
 * Ce composant injecte les styles une seule fois au montage
 */
export default function GlobalStyles() {
  return (
    <>
      {/* Google Fonts */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" 
        rel="stylesheet" 
      />

      {/* Styles globaux */}
      <style jsx global>{`
        /* ================================
           ANIMATIONS
        ================================ */
        @keyframes borderGlow {
          0%, 100% {
            filter: drop-shadow(0 0 15px rgba(255,200,100,.25)) 
                    drop-shadow(0 0 30px rgba(255,160,60,.15));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(255,210,120,.4)) 
                    drop-shadow(0 0 50px rgba(255,180,80,.3));
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes clusterBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }

        .cluster-breath {
          transform-origin: center center;
          transform-box: fill-box;
          will-change: transform, opacity;
          backface-visibility: hidden;
          animation: clusterBreath 4.8s ease-in-out infinite;
        }

        @keyframes ttrHaloPulse {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
            filter: drop-shadow(0 0 6px rgba(80, 190, 255, 0.35)) 
                    drop-shadow(0 0 14px rgba(40, 140, 255, 0.22));
          }
          50% {
            opacity: 0.65;
            transform: scale(1.06);
            filter: drop-shadow(0 0 10px rgba(80, 190, 255, 0.55)) 
                    drop-shadow(0 0 22px rgba(40, 140, 255, 0.35));
          }
        }

        .ttr-halo-pulse {
          transform-origin: center center;
          transform-box: fill-box;
          will-change: transform, opacity, filter;
          animation: ttrHaloPulse 4.8s ease-in-out infinite;
        }

        @keyframes ttrMatBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.055); }
        }

        .ttr-mat-breath {
          transform-origin: center center;
          transform-box: fill-box;
          will-change: transform;
          animation: ttrMatBreath 4.6s ease-in-out infinite;
        }

        /* ================================
           BOUTONS
        ================================ */
        .woc-icon-btn {
          filter: drop-shadow(0 0 4px rgba(255, 220, 100, 0.14)) 
                  drop-shadow(0 0 10px rgba(255, 190, 80, 0.08));
          transform: scale(1);
          transition: filter 180ms ease, transform 180ms ease;
          will-change: filter, transform;
        }

        .woc-icon-btn:hover {
          filter: drop-shadow(0 0 10px rgba(255, 220, 120, 0.42)) 
                  drop-shadow(0 0 24px rgba(255, 190, 90, 0.26));
          transform: scale(1.05);
        }

        .woc-icon-btn:active {
          transform: scale(0.98);
        }

        /* ================================
           SAFE ZONE (texte qui wrappe)
        ================================ */
        .woc-safe {
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
          -webkit-overflow-scrolling: touch;
        }

        .woc-safe * {
          max-width: 100%;
        }
      `}</style>
    </>
  );
}
