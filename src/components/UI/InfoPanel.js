// components/UI/InfoPanel.jsx
// InfoPanel - FULL UI FIXED
// ✅ Uses widthPx/heightPx from layoutConfig
// ✅ No viewport units (vw/vh/vmin)
// ✅ safeAreaHeight is now % relative to panel
// ✅ fontSize in px

import React from 'react';

export default function InfoPanel({ 
  coin, 
  panelStats, 
  closingInfo, 
  onClose,
  normalizePrice,
  fmtPrice,
  layoutConfig
}) {
  if (!coin) return null;

  // Configuration par défaut si pas de preset
  const panelCfg = layoutConfig?.panels?.info || {
    widthPx: 762,
    heightPx: 528,
    topPct: 50,
    paddingTop: 18,
    paddingX: 22,
    fontSize: 14,
    safeAreaWidth: '80%',
    safeAreaHeight: '70%',   // ✅ FIXED: was '70vh'
    textAlign: 'center',
  };

  const textCfg = layoutConfig?.text || {
    globalScale: 1,
    lineHeight: 1.25,
  };

  return (
    <div
      data-info-panel
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: '50%',
        top: `${panelCfg.topPct}%`,
        transform: 'translate(-50%, -50%)',
        width: `${panelCfg.widthPx}px`,       // ✅ FIXED: pure px
        height: `${panelCfg.heightPx}px`,     // ✅ FIXED: pure px
        zIndex: 1000001,
        fontFamily: '"Press Start 2P", monospace',
        color: '#dfd87a',
        textShadow: '0 0 6px rgba(255,215,100,0.6)',
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
          display: 'flex',
          flexDirection: 'column',
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

        {/* Text safe-zone + scroll container */}
        <div className="info-text-zone">
          <div
            className="woc-text woc-safe"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: panelCfg.safeAreaWidth,
              maxHeight: panelCfg.safeAreaHeight,  // ✅ FIXED: now % relative to panel
              transform: 'translate(-50%, -50%)',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: `${panelCfg.paddingTop}px ${panelCfg.paddingX}px`,
              boxSizing: 'border-box',
              zIndex: 2,
              textAlign: panelCfg.textAlign,
              fontSize: `${panelCfg.fontSize}px`,  // ✅ FIXED: pure px
              lineHeight: textCfg.lineHeight,
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <div className="woc-title" style={{ marginBottom: 10 }}>
                INFO
              </div>

              <div>Name: {coin.name}</div>

              <div>
                Mkt Cap:{' '}
                {coin.capNum > 0 ? `${(coin.capNum / 1e6).toFixed(2)}M` : 'N/A'}
              </div>

              <div>
                Price:{' '}
                {(() => {
                  const p = normalizePrice(coin?.price);
                  return p != null && p !== 0 ? `$${fmtPrice(p, 8)}` : 'N/A';
                })()}
              </div>
            </div>

            <div style={{ marginTop: 8, marginBottom: 10, fontWeight: 800 }}>
              Price variation:
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>1H:</div>
                <div>
                  %:{' '}
                  {panelStats?.h1?.changePct != null
                    ? `${Number(panelStats.h1.changePct).toFixed(2)}%`
                    : 'N/A'}
                </div>
                <div>High: ${fmtPrice(panelStats?.h1?.high, 8)}</div>
                <div>Low: ${fmtPrice(panelStats?.h1?.low, 8)}</div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>24H:</div>
                <div>
                  %:{' '}
                  {panelStats?.h24?.changePct != null
                    ? `${Number(panelStats.h24.changePct).toFixed(2)}%`
                    : 'N/A'}
                </div>
                <div>High: ${fmtPrice(panelStats?.h24?.high, 8)}</div>
                <div>Low: ${fmtPrice(panelStats?.h24?.low, 8)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
