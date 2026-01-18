// components/UI/ActionButtons.jsx
// ActionButtons - FULL UI FIXED
// ✅ Uses layoutConfig for all positioning/sizing
// ✅ No viewport units
// ✅ All values in px from layout

import React from 'react';

export default function ActionButtons({ 
  infoHover,
  xHover,
  setInfoHover,
  setXHover,
  onInfoClick,
  layoutConfig
}) {
  // Valeurs par défaut si pas de config
  const buttons = layoutConfig?.buttons || {
    info: {
      bottomPx: 30,
      rightPx: 180,
      scale: 1,
      sizePx: 70,
      zIndex: 100,
    },
    close: {
      bottomPx: 30,
      rightPx: 115,
      scale: 1,
      sizePx: 70,
      zIndex: 100,
    },
  };

  return (
    <div data-action-buttons>
      {/* INFO button */}
      <div
        data-btn="info"
        onClick={onInfoClick}
        onMouseEnter={() => setInfoHover(true)}
        onMouseLeave={() => setInfoHover(false)}
        onTouchStart={() => setInfoHover(true)}
        onTouchEnd={() => setInfoHover(false)}
        style={{
          position: 'absolute',
          bottom: `${buttons.info.bottomPx}px`,
          right: `${buttons.info.rightPx}px`,
          zIndex: buttons.info.zIndex,
          width: `${buttons.info.sizePx}px`,
          height: `${buttons.info.sizePx}px`,
          transform: `scale(${buttons.info.scale})`,
          transformOrigin: "50% 50%",  // ✅ ADDED for consistency
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
        title="Legend / Scales"
      >
        <img
          src={infoHover ? '/btn-info-hover.png' : '/btn-info.png'}
          alt="Info"
          className="woc-icon-btn"
          style={{ width: '100%', height: '100%' }}
          draggable={false}
        />
      </div>

      {/* X button */}
      <a
        data-btn="x"
        href="https://x.com/Kingnarval10307"
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => setXHover(true)}
        onMouseLeave={() => setXHover(false)}
        onTouchStart={() => setXHover(true)}
        onTouchEnd={() => setXHover(false)}
        style={{
          position: 'absolute',
          bottom: `${buttons.close.bottomPx}px`,
          right: `${buttons.close.rightPx}px`,
          zIndex: buttons.close.zIndex,
          width: `${buttons.close.sizePx}px`,
          height: `${buttons.close.sizePx}px`,
          transform: `scale(${buttons.close.scale})`,
          transformOrigin: "50% 50%",  // ✅ ADDED for consistency
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
        title="King Narwhal on X"
      >
        <img
          src={xHover ? '/btn-x-hover.png' : '/btn-x.png'}
          alt="X"
          className="woc-icon-btn"
          style={{ width: '100%', height: '100%' }}
          draggable={false}
        />
      </a>
    </div>
  );
}
