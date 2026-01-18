// components/UI/VideoBackground.jsx
// VideoBackground - FULL UI FIXED
// ✅ position: absolute (stays in STAGE)
// ✅ No local scale() - uses scale=1 from layout
// ✅ No viewport units
// ✅ transformOrigin: "50% 50%"

import React from 'react';

export default function VideoBackground({ 
  src = '/map.mp4',
  layoutConfig
}) {
  const videoCfg = layoutConfig?.video || {
    opacity: 0.45,
    scale: 1,        // ✅ NO local scale
    rotateDeg: 0,
    brightness: 1,
    blur: 0,
    zIndex: 0,
  };

  const filterParts = [];
  if (videoCfg.brightness !== 1) {
    filterParts.push(`brightness(${videoCfg.brightness})`);
  }
  if (videoCfg.blur > 0) {
    filterParts.push(`blur(${videoCfg.blur}px)`);
  }
  const filterStr = filterParts.length > 0 ? filterParts.join(' ') : 'none';

  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      style={{
        position: "absolute",         // ✅ FIXED: was "fixed"
        top: 0,                        // ✅ FIXED: simplified positioning
        left: 0,
        width: '100%',                 // ✅ FIXED: was vw/vh
        height: '100%',
        objectFit: "cover",
        zIndex: videoCfg.zIndex ?? 0,
        opacity: videoCfg.opacity ?? 1,
        transform: `rotate(${videoCfg.rotateDeg ?? 0}deg)`,  // ✅ FIXED: only rotation, no scale
        transformOrigin: "50% 50%",    // ✅ REQUIRED
        filter: filterStr,
        pointerEvents: "none",
      }}
    />
  );
}
