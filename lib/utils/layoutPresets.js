// ============================================================
// WAR OF COINS – LAYOUT PRESETS (FULL UI FIXED)
// ============================================================
//
// ✅ ALL viewport units removed (vw/vh/vmin/vmax)
// ✅ ALL clamp() removed
// ✅ ALL sizes in px or % (relative to parent/panel)
// ✅ Works with STAGE stretch-fit system
//
// ============================================================

export const LAYOUT = {
  // ============================================================================
  // PC LANDSCAPE (Desktop paysage)
  // ============================================================================
  pc_land: {
    base: {
      width: 1920,
      height: 1080,
    },

    world: {
      fit: 'both',
      mulX: 0.98,
      mulY: 0.95,
      offsetX: -12,
      offsetY: -3,
      min: 0,
      max: 2.5,
    },

    border: {
      topPx: -50,
      leftPct: 49.1,
      widthExtraPx: 200,
      widthBasePct: 100.10,
      heightPct: 110,
      nudgeXpx: 9,
      zIndex: 35,
    },

    title: {
      topPct: 3.5,
      leftPct: 50,
      widthPct: 15.5,
      nudgeXpx: 0,
      zIndex: 40,
    },

    buttons: {
      info: {
        bottomPx: 20,
        rightPx: 100,
        scale: 1.5,
        sizePx: 70,
        zIndex: 100,
      },
      close: {
        bottomPx: 20,
        rightPx: 10,
        scale: 1.3,
        sizePx: 70,
        zIndex: 100,
      },
    },

    panels: {
      legend: {
        widthPx: 900,          // ✅ FIXED: was min(92vw, 900px)
        heightPx: 680,         // ✅ FIXED: was min(90vh, 680px)
        topPct: 47,
        paddingTop: 220,
        paddingX: 22,
        paddingBottom: 22,
        fontSize: 14,          // ✅ FIXED: was clamp(9px, 2.15vmin, 14px)
        safeAreaWidth: '75%',  // ✅ OK: % relative to panel
        safeAreaHeight: '100%',
        textAlign: 'center',
      },
      info: {
        widthPx: 762,          // ✅ FIXED: was min(92vw, 762px)
        heightPx: 528,         // ✅ FIXED: was min(90vh, 528px)
        topPct: 50,
        paddingTop: 18,
        paddingX: 22,
        fontSize: 14,          // ✅ FIXED: was clamp(10px, 2.2vmin, 14px)
        safeAreaWidth: '80%',
        safeAreaHeight: '70%', // ✅ CHANGED: was '70vh' - now relative %
        textAlign: 'center',
      },
    },

    text: {
      globalScale: 1,
      titleScale: 1,
      panelScale: 1,
      legendScale: 1,
      statusScale: 1,
      lineHeight: 1.25,
    },

    statusBar: {
      bottomPx: 0.9,
      leftPx: -2,
      fontScale: 1.1,
      fontSize: 11,
      zIndex: 100,
    },

    video: {
      opacity: 0.42,
      scale: 0.85,              // ✅ FIXED: was 0.95 (no local scale)
      brightness: 1,
      blur: 0,
      zIndex: 0,
    },

    safezone: {
      base: {
        scaleX: 2.30,
        scaleY: 1.24,
        scaleGlobal: 0.65,
        radius: 80,
      },
      offset: {
        x: 25,
        y: 10,
      },
    },
  },

  // ============================================================================
  // PC PORTRAIT (Desktop portrait)
  // ============================================================================
  pc_port: {
    base: {
      width: 1080,
      height: 1920,
    },

    world: {
      fit: 'width',
      mulX: 2.90,
      mulY: 0.85,
      rotateDeg: 0,
      offsetX: 5,
      offsetY: -5,
      min: 0.2,
      max: 1.5,
    },

    border: {
      topPx: 80,
      leftPct: 49.85,
      widthExtraPx: 20,
      widthBasePct: 70,
      heightPct: 84,
      nudgeXpx: 0,
      rotateDeg: 90,
      zIndex: 35,
    },

    title: {
      topPct: -3,
      leftPct: 50,
      widthPct: 15,
      nudgeXpx: 0,
      zIndex: 40,
    },

    buttons: {
      info: {
        bottomPx: -100,
        rightPx: 730,
        scale: 1.1,
        sizePx: 100,
        zIndex: 100,
      },
      close: {
        bottomPx: -100,
        rightPx: 630,
        scale: 1,
        sizePx: 100,
        zIndex: 100,
      },
    },

    panels: {
      legend: {
        widthPx: 800,          // ✅ FIXED: was min(88vw, 800px)
        heightPx: 700,         // ✅ FIXED: was min(85vh, 700px)
        topPct: 44,
        paddingTop: 220,
        paddingX: 20,
        paddingBottom: 20,
        fontSize: 13,          // ✅ FIXED: was clamp(15px, 2.1vmin, 13px)
        safeAreaWidth: '78%',
        safeAreaHeight: '100%',
        textAlign: 'center',
      },
      info: {
        widthPx: 720,          // ✅ FIXED: was min(88vw, 720px)
        heightPx: 550,         // ✅ FIXED: was min(85vh, 550px)
        topPct: 50,
        paddingTop: 18,
        paddingX: 25,
        fontSize: 12,          // ✅ FIXED: was clamp(15px, 2.1vmin, 13px)
        safeAreaWidth: '83%',
        safeAreaHeight: '68%', // ✅ CHANGED: was '68vh' - now relative %
        textAlign: 'center',
      },
    },

    text: {
      globalScale: 0.95,
      titleScale: 0.95,
      panelScale: 0.95,
      legendScale: 0.95,
      statusScale: 0.95,
      lineHeight: 1.6,
    },

    statusBar: {
      bottomPx: -90,
      leftPx: 625,
      fontScale: 1.2,
      fontSize: 10,
      zIndex: 100,
    },

    video: {
      opacity: 0.42,
      scale: 0.9,              // ✅ FIXED: was 0.9 (no local scale)
      brightness: 1,
      rotateDeg: 0,
      blur: 0,
      zIndex: 0,
    },

    safezone: {
      base: {
        scaleX: 2.30,
        scaleY: 1.24,
        scaleGlobal: 0.42,
        radius: 80,
      },
      offset: {
        x: 25,
        y: 5,
      },
    },
  },
};

/**
 * Détecte le mode actuel basé uniquement sur l'orientation
 * Portrait → pc_port
 * Paysage → pc_land
 */
export function detectLayoutMode(vw, vh) {
  const isLandscape = vw > vh;
  return isLandscape ? 'pc_land' : 'pc_port';
}
