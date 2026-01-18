// components/UI/StatusBar.jsx
// StatusBar - FULL UI FIXED
// ✅ Uses layoutConfig for positioning/sizing
// ✅ No viewport units
// ✅ All values in px from layout

import React from 'react';

export default function StatusBar({ 
  cgOk, 
  dataSource, 
  lastUpdateUTC,
  ttrCap,
  ttrLoading,
  ttrError,
  ttrData,
  isForging,
  onRefresh,
  refreshing,
  cooldownLeft,
  blockedLeft,
  fmtPrice,
  layoutConfig
}) {
  // Configuration par défaut
  const statusCfg = layoutConfig?.statusBar || {
    bottomPx: 20,
    leftPx: 30,
    fontScale: 1,
    fontSize: 11,
    zIndex: 100,
  };

  return (
    <div 
      data-status-bar
      style={{
        position: 'absolute',
        bottom: `${statusCfg.bottomPx}px`,
        left: `${statusCfg.leftPx}px`,
        zIndex: statusCfg.zIndex,
        fontFamily: "'Press Start 2P', monospace",
        fontSize: `${statusCfg.fontSize * statusCfg.fontScale}px`,
        color: cgOk ? '#33ff66' : '#ff4444',
        textShadow: cgOk ? '0 0 6px rgba(50,255,120,0.35)' : '0 0 6px rgba(255,70,70,0.35)',
        lineHeight: statusCfg.lineHeight ?? 1.2,
        display: 'flex',
        flexDirection: 'column',
        gap: `${statusCfg.lineGap ?? 4}px`,
      }}
    >
      <div>
        Live • <a href="https://birdeye.so/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>BD</a>
      </div>
      <div>Last update: {lastUpdateUTC}</div>
      <div>
        TTR: {isForging ? (
          <span style={{ color: '#ffaa55' }}>FORGING</span>
        ) : (
          `${(ttrCap / 1e6).toFixed(2)}M`
        )}
        {!isForging && ttrLoading ? ' • Raydium…' : ''}
      </div>
      
      {!isForging && ttrData?.price != null && (
        <div style={{ opacity: 0.9 }}>
          Price: ${fmtPrice(ttrData.price, 8)}
        </div>
      )}
      
      {!isForging && ttrError && (
        <div style={{ color: '#ff8888' }}>TTR: {ttrError}</div>
      )}

      <button
        onClick={onRefresh}
        disabled={refreshing || cooldownLeft > 0 || blockedLeft > 0}
        style={{
          marginTop: 4,
          background: 'rgba(0,0,0,0.35)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: refreshing || cooldownLeft > 0 || blockedLeft > 0 ? 'not-allowed' : 'pointer',
          opacity: refreshing || cooldownLeft > 0 || blockedLeft > 0 ? 0.55 : 1,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: `${9 * statusCfg.fontScale}px`,
        }}
      >
        {refreshing
          ? 'Refreshing…'
          : blockedLeft > 0
            ? `Hold ${blockedLeft}s`
            : cooldownLeft > 0
              ? `Cooldown ${cooldownLeft}s`
              : 'Refresh Data'}
      </button>
    </div>
  );
}
