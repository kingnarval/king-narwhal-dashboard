// components/UI/LegendPanel.jsx
// LegendPanel - FULL UI FIXED
// ✅ Uses widthPx/heightPx from layoutConfig
// ✅ No viewport units (vw/vh/vmin)
// ✅ fontSize in px (no clamp)
// ✅ position: absolute (stays in STAGE)

import React from 'react';

export default function LegendPanel({ 
  isOpen, 
  closingInfo, 
  onClose,
  layoutConfig
}) {
  if (!isOpen) return null;

  // Configuration sans responsive CSS
  const panelCfg = layoutConfig?.panels?.legend || {
    widthPx: 900,
    heightPx: 680,
    topPct: 47,
    paddingTop: 220,
    paddingX: 22,
    paddingBottom: 22,
    fontSize: 14,
    safeAreaWidth: '75%',
    safeAreaHeight: '100%',
    textAlign: 'center',
  };

  const textCfg = layoutConfig?.text || {
    globalScale: 1,
    lineHeight: 1.25,
  };

  return (
    <div
      data-legend-panel
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',              // ✅ CRITICAL: stays in STAGE
        left: '50%',
        top: `${panelCfg.topPct}%`,
        transform: 'translate(-50%, -50%)',
        width: `${panelCfg.widthPx}px`,    // ✅ FIXED: pure px
        height: `${panelCfg.heightPx}px`,  // ✅ FIXED: pure px
        zIndex: 1000001,
        fontFamily: "'Press Start 2P', monospace",
        color: '#ffd87a',
        textShadow: '0 0 6px rgba(255,215,100,0.6)',
        textAlign: panelCfg.textAlign,
        pointerEvents: 'auto',
        animation: `${closingInfo ? 'fadeOut' : 'fadeIn'} 0.3s ease forwards`,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="woc-panel-inner"
        style={{
          animation: `${closingInfo ? 'fadeOut' : 'fadeIn'} 0.3s ease forwards`,
          width: '100%',
          height: '100%',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        <img
          src="/virgin-border.png"
          alt="frame"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />

        {/* Text confined to this zone (scroll inside) */}
        <div
          className="legend-text-zone"
          style={{
            width: panelCfg.safeAreaWidth,
            maxHeight: panelCfg.safeAreaHeight,
            margin: '0 auto',
            paddingTop: `${panelCfg.paddingTop}px`,
            paddingLeft: `${panelCfg.paddingX}px`,
            paddingRight: `${panelCfg.paddingX}px`,
            paddingBottom: `${panelCfg.paddingBottom}px`,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            boxSizing: 'border-box',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            hyphens: 'auto',
            fontSize: `${panelCfg.fontSize}px`,  // ✅ FIXED: pure px
            lineHeight: textCfg.lineHeight,
            textAlign: panelCfg.textAlign,
            pointerEvents: 'auto',
            zIndex: 2,
          }}
        >
          <div className="woc-text woc-safe" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{ marginBottom: 14 }}>
              <div className="woc-title">SCALES &amp; LEGEND</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 6, textDecoration: 'underline' }}>CRYPTO CLUSTERS</div>
              <div>Organic sizing (continuous)</div>
              <div>Size reflects relative market cap</div>
              <div>Scales are relative to the active market window</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ marginBottom: 6, textDecoration: 'underline' }}>TTR MATERIALS</div>
              <div>Core starts at 100k market cap</div>
              <div>Rings evolve with growth milestones</div>
              <div>Copper → Silver → Gold → Final</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
