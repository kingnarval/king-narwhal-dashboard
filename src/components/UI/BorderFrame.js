// components/UI/BorderFrame.jsx
// BorderFrame - FULL UI FIXED
// ✅ Uses layoutConfig for all values
// ✅ No viewport units
// ✅ transformOrigin: "50% 50%"

import React from 'react';

export default function BorderFrame({ layoutConfig }) {
  // Utiliser les valeurs par défaut si pas de config
  const border = layoutConfig?.border || {
    topPx: -22,
    leftPct: 49.5,
    widthExtraPx: 150,
    widthBasePct: 99.10,
    heightPct: 105,
    nudgeXpx: 9,
    zIndex: 35,
  };

  const title = layoutConfig?.title || {
    topPct: -2.6,
    leftPct: 50,
    widthPct: 11.5,
    heightPx: null,
    objectFit: null,
    nudgeXpx: 0,
    zIndex: 40,
  };

  return (
    <>
      {/* Bordure principale */}
      <img
        src="/border-king-narwhal.png"
        alt="border"
        style={{
          position: "absolute",
          top: `${border.topPx}px`,
          left: `${border.leftPct}%`,
          transform: `
            translateX(calc(-50% + ${border.nudgeXpx}px))
            rotate(${border.rotateDeg || 0}deg)
          `,
          transformOrigin: "50% 50%",  // ✅ REQUIRED
          width: `calc(${border.widthBasePct}% + ${border.widthExtraPx}px)`,
          height: `${border.heightPct}%`,
          objectFit: "cover",
          pointerEvents: "none",
          zIndex: border.zIndex,
          animation: "borderGlow 6s ease-in-out infinite",
        }}
      />

      {/* Titre en haut */}
      <img
        src="/titel-borde.png"
        alt="title"
        style={{
          position: 'absolute',
          top: `${title.topPct}%`,
          left: `${title.leftPct}%`,
          transform: `translateX(calc(-50% + ${title.nudgeXpx}px))`,
          transformOrigin: "50% 50%",  // ✅ ADDED for consistency
          width: `${title.widthPct}%`,
          ...(title.heightPx ? { height: `${title.heightPx}px` } : {}),
          ...(title.objectFit ? { objectFit: title.objectFit } : {}),
          pointerEvents: 'none',
          zIndex: title.zIndex,
        }}
      />
    </>
  );
}
