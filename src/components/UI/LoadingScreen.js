// components/UI/LoadingScreen.jsx
// LoadingScreen - FULL UI FIXED
// ✅ Uses px dimensions
// ✅ No viewport units

import React from 'react';

/**
 * LoadingScreen - Écran de chargement initial
 * 
 * Props:
 * - panelW: largeur du panel en px (default: 920)
 * - panelH: hauteur du panel en px (default: 620)
 * - textW: largeur de la zone de texte en px
 * - textH: hauteur de la zone de texte en px
 */
export default function LoadingScreen({
  panelW = 920,
  panelH = 620,
  textW = 860,
  textH = 520,
}) {
  return (
    <div
      style={{
        width: `${panelW}px`,            // ✅ FIXED: pure px
        height: `${panelH}px`,           // ✅ FIXED: pure px
        '--wocTextW': `${textW}px`,      // ✅ FIXED: pure px
        '--wocTextH': `${textH}px`,      // ✅ FIXED: pure px
        background: '#0c111b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffd87a',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 12,
      }}
    >
      Loading Realm...
    </div>
  );
}
