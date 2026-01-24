// pages/index.js
// War of Coins – v9.7.9 (Tahlia Raydium MC Patch — FULL UI + FORGING + FAIL-SAFE)
// Patched:
// ✅ Mobile panels fixed (portrait + landscape)
// ✅ SAFE ZONE (INFO + LEGEND): internal invisible 80% content area, centered, scroll + wrap (no overflow)
// ✅ TTR HUD: show FORGING when mint is "none" OR ttrCap <= 0 (no more 0.00M)
// ✅ Buttons hover: image swap (btn-info-hover / btn-x-hover) + glow

"use client";
/* eslint-disable react-hooks/rules-of-hooks */

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { hexbin as d3Hexbin } from "d3-hexbin";
import { LAYOUT, detectLayoutMode } from "../lib/utils/layoutPresets";

// ============================================================================
// Constantes
// ============================================================================

const BASE_W = 1920;
const BASE_H = 1080;

// ============================================================================
// LAYOUT DRIVER (v1 reactive + layoutPresets as MASTER)
// ============================================================================

// ============================================================================
// LAYOUT DRIVER v2 - Expose ALL layout elements individually
// ============================================================================
const clamp01 = (v, min, max) => Math.max(min, Math.min(max, v));

function useLayoutDriver() {
  const [state, setState] = useState(() => {
    const mode = 'pc_land';
    const L = LAYOUT?.[mode] || {};
    
    return {
      // ✅ BACKWARD COMPATIBILITY: Keep old properties at root level
      x: 1,
      y: 1,
      offsetX: 0,
      offsetY: 0,
      rotateDeg: 0,
      mode,
      L,
      
      // NEW: WORLD transform (global UI positioning)
      world: {
        x: 1,
        y: 1,
        offsetX: 0,
        offsetY: 0,
        rotateDeg: 0,
      },
      
      // NEW: All independent elements from layout
      border: L.border || {},
      title: L.title || {},
      outline18: L.outline18 || {},
      outline30: L.outline30 || {},
      outline42: L.outline42 || {},
      buttons: L.buttons || {},
      panels: L.panels || {},
      text: L.text || {},
      statusBar: L.statusBar || {},
      video: L.video || {},
      safezone: L.safezone || {},
    };
  });

  useEffect(() => {
    function update() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const mode = detectLayoutMode(vw, vh);
      const L = LAYOUT?.[mode] || LAYOUT?.pc_land || {};
      const W = L?.world || {};

      const sxBase = vw / BASE_W;
      const syBase = vh / BASE_H;

      const minS = Number.isFinite(W.min) ? W.min : 0;
      const maxS = Number.isFinite(W.max) ? W.max : 10;

      const x = clamp01(sxBase * (Number.isFinite(W.mulX) ? W.mulX : 1), minS, maxS);
      const y = clamp01(syBase * (Number.isFinite(W.mulY) ? W.mulY : 1), minS, maxS);
      const offsetX = Number.isFinite(W.offsetX) ? W.offsetX : 0;
      const offsetY = Number.isFinite(W.offsetY) ? W.offsetY : 0;
      const rotateDeg = Number.isFinite(W.rotateDeg) ? W.rotateDeg : 0;

      setState({
        // ✅ BACKWARD COMPATIBILITY: Keep old properties at root level
        x,
        y,
        offsetX,
        offsetY,
        rotateDeg,
        mode,
        L,
        
        // NEW: WORLD transform
        world: {
          x,
          y,
          offsetX,
          offsetY,
          rotateDeg,
        },
        
        // NEW: All independent elements from layout
        border: L.border || {},
        title: L.title || {},
        outline18: L.outline18 || {},
        outline30: L.outline30 || {},
        outline42: L.outline42 || {},
        buttons: L.buttons || {},
        panels: L.panels || {},
        text: L.text || {},
        statusBar: L.statusBar || {},
        video: L.video || {},
        safezone: L.safezone || {},
      });
    }

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return state;
}

// ============================================================================
// HELPER FUNCTIONS to apply layout values to elements
// ============================================================================

function getBorderStyles(layout) {
  const b = layout.border || {};
  return {
    top: b.topPx != null ? `${b.topPx}px` : '0px',
    left: b.leftPct != null ? `${b.leftPct}%` : '50%',
    width: b.widthBasePct != null 
      ? `calc(${b.widthBasePct}% + ${b.widthExtraPx || 0}px)` 
      : '100%',
    height: b.heightPct != null ? `${b.heightPct}%` : '100%',
    transform: `translate(calc(-50% + ${b.nudgeXpx || 0}px), 0) ${b.rotateDeg ? `rotate(${b.rotateDeg}deg)` : ''}`,
    zIndex: b.zIndex || 35,
  };
}

function getTitleStyles(layout) {
  const t = layout.title || {};
  return {
    top: t.topPct != null ? `${t.topPct}%` : '0%',
    left: t.leftPct != null ? `${t.leftPct}%` : '50%',
    width: t.widthPct != null ? `${t.widthPct}%` : 'auto',
    transform: `translate(calc(-50% + ${t.nudgeXpx || 0}px), -50%)`,
    zIndex: t.zIndex || 40,
  };
}

function getButtonStyles(layout, buttonType) {
  const btn = layout.buttons?.[buttonType] || {};
  return {
    bottom: btn.bottomPx != null ? `${btn.bottomPx}px` : '40px',
    right: btn.rightPx != null ? `${btn.rightPx}px` : '10px',
    width: btn.sizePx != null ? `${btn.sizePx}px` : '70px',
    height: btn.sizePx != null ? `${btn.sizePx}px` : '70px',
    transform: `scale(${btn.scale || 1})`,
    zIndex: btn.zIndex || 100,
  };
}

function getPanelStyles(layout, panelType) {
  const p = layout.panels?.[panelType] || {};
  return {
    width: p.widthPx != null ? `${p.widthPx}px` : '900px',
    height: p.heightPx != null ? `${p.heightPx}px` : '680px',
    top: p.topPct != null ? `${p.topPct}%` : '50%',
    fontSize: p.fontSize != null ? `${p.fontSize}px` : '14px',
    paddingTop: p.paddingTop != null ? `${p.paddingTop}px` : '18px',
    paddingX: p.paddingX != null ? `${p.paddingX}px` : '22px',
    paddingBottom: p.paddingBottom != null ? `${p.paddingBottom}px` : '22px',
    safeAreaWidth: p.safeAreaWidth || '80%',
    safeAreaHeight: p.safeAreaHeight || '70%',
    textAlign: p.textAlign || 'center',
  };
}

function getStatusBarStyles(layout) {
  const s = layout.statusBar || {};
  return {
    bottom: s.bottomPx != null ? `${s.bottomPx}px` : '0px',
    left: s.leftPx != null ? `${s.leftPx}px` : '0px',
    fontSize: s.fontSize != null ? `${s.fontSize}px` : '11px',
    transform: `scale(${s.fontScale || 1})`,
    zIndex: s.zIndex || 100,
  };
}

function getVideoStyles(layout) {
  const v = layout.video || {};
  return {
    opacity: v.opacity != null ? v.opacity : 0.45,
    transform: `scale(${v.scale || 1}) ${v.rotateDeg ? `rotate(${v.rotateDeg}deg)` : ''}`,
    filter: `brightness(${v.brightness || 1}) blur(${v.blur || 0}px)`,
    zIndex: v.zIndex || 0,
  };
}

function getSafezoneConfig(layout) {
  const s = layout.safezone || {};
  return {
    scaleX: s.base?.scaleX || 2.0,
    scaleY: s.base?.scaleY || 1.13,
    scaleGlobal: s.base?.scaleGlobal || 0.72,
    radius: s.base?.radius || 80,
    offsetX: s.offset?.x || 20,
    offsetY: s.offset?.y || 0,
  };
}

function getTextConfig(layout) {
  const t = layout.text || {};
  return {
    globalScale: t.globalScale || 1,
    titleScale: t.titleScale || 1,
    panelScale: t.panelScale || 1,
    legendScale: t.legendScale || 1,
    statusScale: t.statusScale || 1,
    lineHeight: t.lineHeight || 1.25,
  };
}

function getOutline18Styles(layout) {
  const o = layout.outline18 || {};
  return {
    top: o.topPct != null ? `${o.topPct}%` : '50%',
    left: o.leftPct != null ? `${o.leftPct}%` : '50%',
    width: o.sizePx != null ? `${o.sizePx}px` : '520px',
    height: o.sizePx != null ? `${o.sizePx}px` : '520px',
    transform: `translate(-50%, -50%) translate(${o.nudgeXpx || 0}px, ${o.nudgeYpx || 0}px) scale(${o.scale || 1}) rotate(${o.rotateDeg || 0}deg)`,
    opacity: o.opacity != null ? o.opacity : 1,
    zIndex: o.zIndex || 55,
  };
}

function getOutline30Styles(layout) {
  const o = layout.outline30 || {};
  return {
    position: "absolute",
    top: o.topPct != null ? `${o.topPct}%` : '50%',
    left: o.leftPct != null ? `${o.leftPct}%` : '50%',
    width: o.sizePx != null ? `${o.sizePx}px` : '520px',
    height: o.sizePx != null ? `${o.sizePx}px` : '520px',
    transform: `translate(-50%, -50%) translate(${o.nudgeXpx || 0}px, ${o.nudgeYpx || 0}px) rotate(${o.rotateDeg || 0}deg) scale(${o.scale || 1})`,
    opacity: o.opacity != null ? o.opacity : 1,
    zIndex: o.zIndex || 54,
  };
}

function getOutline42Styles(layout) {
  const o = layout.outline42 || {};
  return {
    position: "absolute",
    top: o.topPct != null ? `${o.topPct}%` : '50%',
    left: o.leftPct != null ? `${o.leftPct}%` : '50%',
    width: o.sizePx != null ? `${o.sizePx}px` : '520px',
    height: o.sizePx != null ? `${o.sizePx}px` : '520px',
    transform: `translate(-50%, -50%) translate(${o.nudgeXpx || 0}px, ${o.nudgeYpx || 0}px) rotate(${o.rotateDeg || 0}deg) scale(${o.scale || 1})`,
    opacity: o.opacity != null ? o.opacity : 1,
    zIndex: o.zIndex || 53,
  };
}


const SCALE_SWITCH_CAP = 10_000_000;

const TTR_IMAGE_SCALE = {
  copper: 0.92,
  silver: 0.96,
  gold: 1.0,
  final: 1.08,
};

// TTR material images (unlock / lock)
// NOTE: put these PNGs in /public with the exact names below.
const TTR_IMG_UNLOCK = {
  copper: "/hexacuivre.png",
  silver: "/hexasilver.png",
  gold: "/hexagold.png",
  final: "/hexafinal.png",
};
const TTR_IMG_LOCK = {
  copper: "/hexacuivre-lock.png",
  silver: "/hexasilver-lock.png",
  gold: "/hexagold-lock.png",
  final: "/hexafinal-lock.png",
};

const WINDOW_SIZE = 14;
// When TTR is big, reduce the number of OTHER cryptos to free space
const TTR_DEDENSIFY_CAP = 10_000_000; // 10M
const WINDOW_SIZE_DEDENSED = 10;      // 1 TTR + 9 others (removes 4)

const MAX_TRIES_PER_CLUSTER = 1200;
const MAX_HEX_PER_CLUSTER = 37; // 3 crowns (center + 6 + 12 + 18)
const CLUSTER_BUFFER = 1;

const LS_TTRCAP = "woc_v978_ttr_cap";
const SESSION_CG_DATA = "woc_v978_window_data";
const SESSION_CG_TIME = "woc_v978_window_time";

const SAFEZONE_BASE = { scaleX: 2.0, scaleY: 1.13, scaleGlobal: 0.72, radius: 80 };
const SAFEZONE_OFFSET = { x: 20.5, y: 0 };

const DEFAULT_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEFAULT_WSOL = "So11111111111111111111111111111111111111112";
// ============================================================================
// TTR CONFIG (Raydium → MC)
// ============================================================================
const TTR_CONFIG = {
  STATUS: "LIVE", // LIVE | OFF
  SOURCE: "RAYDIUM",
  MINT: "none",
  QUOTE_MINT: DEFAULT_WSOL,
};


// ============================================================================
// PRE-LAUNCH MODE (FIXED LIST)
// Shows a fixed list of 14 tokens while TTR market cap is below the threshold.
// ============================================================================
const PRELAUNCH_TTR_THRESHOLD = 1_100_000;
const PRELAUNCH_TARGET_COUNT = 14;

const PRELAUNCH_MINTS = [
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
  "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC",
  "8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh",
  "AZsHEMXd36Bj1EMNXhowJajpUXzrKcK57wW4ZGXVa7yR",
  "7iT1GRYYhEop2nV1dyCwK2MGyLmPHq47WhPGSwiqcUg5",
  "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ",
  "9999FVbjHioTcoJpoBiSjpxHW6xEn3witVuXKqBh2RFQ",
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
];

const PRELAUNCH_MIN_MC = 1_000_000;
const PRELAUNCH_MAX_MC = 10_000_000;

function pickPrelaunchCoins(coinsAll) {
  const byAddr = new Map();
  for (const c of (coinsAll || [])) {
    if (c?.addr) byAddr.set(c.addr, c);
  }

  const pool = PRELAUNCH_MINTS
    .map((m) => byAddr.get(m))
    .filter(Boolean)
    .filter((c) => Number.isFinite(Number(c?.capNum)) && Number(c.capNum) > 0);

  const inRange = pool.filter(
    (c) => Number(c.capNum) >= PRELAUNCH_MIN_MC && Number(c.capNum) <= PRELAUNCH_MAX_MC
  );

  const mid = (PRELAUNCH_MIN_MC + PRELAUNCH_MAX_MC) / 2;
  const outRange = pool
    .filter((c) => Number(c.capNum) < PRELAUNCH_MIN_MC || Number(c.capNum) > PRELAUNCH_MAX_MC)
    .sort((a, b) => Math.abs(Number(a.capNum) - mid) - Math.abs(Number(b.capNum) - mid));

  const picked = [...inRange, ...outRange].slice(0, PRELAUNCH_TARGET_COUNT);
  picked.sort((a, b) => Number(b.capNum) - Number(a.capNum));
  return picked;
}

function pickPrelaunchBuckets(coinsAll, targetCount) {
  const min = PRELAUNCH_MIN_MC;
  const max = PRELAUNCH_MAX_MC;

  const pool = [...(coinsAll || [])]
    .filter((c) => c?.id !== "TTR")
    .filter((c) => Number.isFinite(Number(c?.capNum)) && Number(c.capNum) > 0)
    .filter((c) => Number(c.capNum) >= min && Number(c.capNum) <= max);

  if (pool.length <= targetCount) return pool;

  // 7 buckets across 1M–10M, pick ~2 per bucket (14 total)
  const BUCKETS = 7;
  const PER = Math.max(1, Math.floor(targetCount / BUCKETS)); // should be 2
  const span = max - min;
  const step = span / BUCKETS;

  const buckets = Array.from({ length: BUCKETS }, () => []);
  for (const c of pool) {
    const cap = Number(c.capNum);
    let bi = Math.floor((cap - min) / step);
    if (bi < 0) bi = 0;
    if (bi >= BUCKETS) bi = BUCKETS - 1;
    buckets[bi].push(c);
  }

  // For each bucket: sort by cap, take one near low and one near high (or closest to extremes)
  const picked = [];
  for (let i = 0; i < BUCKETS; i++) {
    const b = buckets[i].sort((a, b) => Number(a.capNum) - Number(b.capNum));
    if (!b.length) continue;

    // pick low-ish
    picked.push(b[Math.floor(b.length * 0.25)] || b[0]);
    // pick high-ish
    if (picked.length < targetCount) picked.push(b[Math.floor(b.length * 0.75)] || b[b.length - 1]);

    if (picked.length >= targetCount) break;
  }

  // If still not enough (some buckets empty), fill with evenly spaced from full pool
  if (picked.length < targetCount) {
    const sorted = pool.sort((a, b) => Number(a.capNum) - Number(b.capNum));
    const need = targetCount - picked.length;
    const used = new Set(picked.map((c) => c.addr || c.id || c.symbol));
    for (let i = 0; i < sorted.length && (targetCount - picked.length) > 0; i++) {
      const c = sorted[Math.floor((i * (sorted.length - 1)) / Math.max(1, need))];
      const k = c?.addr || c?.id || c?.symbol;
      if (!k || used.has(k)) continue;
      used.add(k);
      picked.push(c);
    }
  }

  // Deduplicate + stable sort by cap desc for display
  const seen = new Set();
  const uniq = [];
  for (const c of picked) {
    const k = (c?.addr || c?.id || c?.symbol || "").toString();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    uniq.push(c);
    if (uniq.length >= targetCount) break;
  }

  return uniq.sort((a, b) => Number(b.capNum) - Number(a.capNum)).slice(0, targetCount);
}


// Core value: forging threshold (USD market cap)
const TTR_CORE_VALUE = 100_000;


// ============================================================================
// Helpers
// ============================================================================
function normalizePrice(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    // accepts "$0.00123", "0.00123", "€0.00123" etc.
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}


const keyOf = (q, r) => `${q},${r}`;

function fmtPrice(v, maxDecimals = 8) {
  if (v == null) return "N/A";

  const n = Number(v);
  if (!Number.isFinite(n)) return "N/A";

  if (n > 0 && n < 1) {
    return n.toFixed(maxDecimals).replace(/\.?0+$/, "");
  }

  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}


function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeSeededRand(seedStr) {
  return mulberry32(hash32(String(seedStr || "")));
}

function drawHexImage(g, href, h, hexRadius, scale, opacity = 1, className = "", delayMs = 0) {
  const size = hexRadius * 2 * scale;
  const img = g.append("image")
    .attr("href", href)
    .attr("width", size)
    .attr("height", size)
    .attr("x", h.x - size / 2)
    .attr("y", h.y - size / 2)
    .style("pointer-events", "none")
    .style("image-rendering", "auto")
    .style("opacity", opacity)
    .style("transform-box", "fill-box")
    .style("transform-origin", "center center")
    .style("will-change", "transform")
    .style("filter", "drop-shadow(0 0 4px rgba(0,0,0,0.35))");

  if (className) {
    img.attr("class", className);
    if (delayMs) img.style("animation-delay", `${delayMs}ms`);
  }
  return img;
}

function normSym(c) {
  const s = (c?.symbol ?? "").toString().trim();
  return s ? s.toUpperCase() : "";
}
function normName(c) {
  const s = (c?.name ?? "").toString().trim();
  return s ? s.toUpperCase() : "";
}
function groupKey(c) {
  return normSym(c) || normName(c) || String(c?.id ?? c?.address ?? c?.mint ?? c?.tokenAddress ?? "").trim();
}
function dedupeBestByGroup(list) {
  const best = new Map();
  for (const c of list || []) {
    const k = groupKey(c);
    if (!k) continue;
    const prev = best.get(k);
    const cap = Number(c?.capNum ?? 0) || 0;
    const prevCap = Number(prev?.capNum ?? 0) || 0;
    if (!prev || cap > prevCap) best.set(k, c);
  }
  return Array.from(best.values());
}
function axialDistance(aQ, aR, bQ, bR) {
  const ax = aQ,
    az = aR,
    ay = -ax - az;
  const bx = bQ,
    bz = bR,
    by = -bx - bz;
  return (Math.abs(ax - bx) + Math.abs(ay - by) + Math.abs(az - bz)) / 2;
}
function genSpiralAxialPositions(n) {
  const res = [[0, 0]];
  const dirs = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  let layer = 1;
  while (res.length < n) {
    let q = -layer,
      r = layer;
    for (let side = 0; side < 6 && res.length < n; side++) {
      const [dq, dr] = dirs[side];
      for (let step = 0; step < layer && res.length < n; step++) {
        q += dq;
        r += dr;
        res.push([q, r]);
      }
    }
    layer++;
  }
  return res;
}
function hexCorners(cx, cy, radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return pts;
}

// ============================================================================
// Other coins sizing (organic)
// ============================================================================
function computeHexCountContinuousLarge(capUSD) {
  // OTHER COINS ONLY: TTR-like ring sizing (no locks).
  // Returns the number of hexes to draw for a cluster (including center).
  const cap = Math.max(0, Number(capUSD) || 0);

  // Always at least 1 hex so the logo has a "base" cell.
  if (cap <= 0) return { total: 1 };

  // Spend market cap across rings in spiral order (center already counted).
  let remaining = Math.max(0, cap - OTHER_CORE_VALUE);
  let total = 1;

  const byKey = OTHER_RING_HEX_VALUE;

  // Same ring key logic as TTR (distance from center)
  function keyForRingDist(dist) {
    if (dist <= 1) return "copper";
    if (dist === 2) return "silver";
    if (dist === 3) return "gold";
    return "final";
  }

  const spiral = genSpiralAxialPositions(61).slice(1); // 60 positions around center
  for (let i = 0; i < spiral.length; i++) {
    const [dq, dr] = spiral[i];
    const dist = axialDistance(0, 0, dq, dr);
    const key = keyForRingDist(dist);
    const cost = byKey[key] ?? byKey.copper;
    if (remaining < cost) break;
    remaining -= cost;
    total += 1;
    if (total >= MAX_HEX_PER_CLUSTER) break;
  }

  return { total };
}
function computeHexCountContinuous(capUSD, scaleMode) {
  return computeHexCountContinuousLarge(capUSD);
}

// ============================================================================
// TTR materials (rings-only)
// ============================================================================
// TTR MATERIAL THRESHOLDS (Rebalanced for perception)
// Copper: < 3M | Silver: 3–15M | Gold: 15–50M | Final: 50M+
const TTR_MATS_LARGE = [
  { key: "copper", value: 166_667, stroke: "rgba(255,170,90,0.95)" },
  { key: "silver", value: 563_218, stroke: "rgba(255,255,255,0.95)" },
  { key: "gold", value: 844_828, stroke: "rgba(255,230,140,0.95)" },
  { key: "final", value: 1_126_437, stroke: "rgba(210,190,255,0.95)" },
];
// ============================================================================
// OTHER COINS sizing (TTR-like rings, NO LOCKS) — used for non-TTR clusters only
// Core is always visible via the logo; rings scale by market cap using the same
// ring geometry (center + rings) as TTR, but without lock visuals.
// ============================================================================
const OTHER_CORE_VALUE = 100_000;

// These values mirror the "representative" ring thresholds we agreed on:
// - Copper ring total ≈ 1,000,000 (so core+ring ≈ 1,100,000)
// - Silver/Gold/Final use the same per-hex values as our ring reference.
const OTHER_RING_HEX_VALUE = {
  // Representative thresholds (same as TTR rings, but without lock visuals)
  // Copper ring total ≈ 1,000,000 (so core+ring ≈ 1,100,000)
  copper: 166_667,   // 6 * 166_667 ≈ 1,000,002
  silver: 563_218,
  gold: 844_828,
  final: 1_126_437,
};

// Opacity only (keep colors as-is). Applied per-hex depending on ring distance.
const OTHER_RING_OPACITY = {
  // Opacity only (keep colors as-is). Make differences clearly visible.
  copper: 0.65,
  silver: 0.78,
  gold: 0.90,
  final: 1.00,
};

function computeTtrMaterialsRingsOnly(capMatsUSD) {
  const cap = Math.max(0, Number(capMatsUSD) || 0);
  if (cap <= 0) return [];
  const byKey = Object.fromEntries(TTR_MATS_LARGE.map((m) => [m.key, m]));
  function keyForRingDist(dist) {
    if (dist <= 1) return "copper";
    if (dist === 2) return "silver";
    if (dist === 3) return "gold";
    return "final";
  }
  const spiral = genSpiralAxialPositions(61).slice(1);
  const mats = [];
  let acc = 0;
  for (let i = 0; i < spiral.length; i++) {
    const [dq, dr] = spiral[i];
    const dist = axialDistance(0, 0, dq, dr);
    const key = keyForRingDist(dist);
    const mat = byKey[key] || byKey.copper;
    if (acc >= cap) break;
    mats.push(mat);
    acc += mat.value;
  }
  return mats;
}

// ============================================================================
// Birdeye window fetch
// ============================================================================
let __lastGoodWindow = null;

async function fetchWindowCoins(force = false) {
  try {
    const url = force ? "/api/birdeye-window?force=1" : "/api/birdeye-window";
    const res = await fetch(url, force ? { cache: "no-store" } : undefined);
    if (!res.ok) {
      if (__lastGoodWindow) return { ...__lastGoodWindow, meta: { servedFrom: "client-last-good" } };
      return { source: "Birdeye (no data)", coins: [] };
    }
    const json = await res.json();
    const coins = Array.isArray(json?.coins) ? json.coins : [];
    if (coins.length > 0) {
      __lastGoodWindow = { source: json.source || "Birdeye Token List (BDS)", coins };
      return __lastGoodWindow;
    }
    if (__lastGoodWindow) return { ...__lastGoodWindow, meta: { servedFrom: "client-last-good" } };
    return { source: json?.source || "Birdeye (empty)", coins: [] };
  } catch (e) {
    if (__lastGoodWindow) return { ...__lastGoodWindow, meta: { servedFrom: "client-last-good" } };
    return { source: "Birdeye (fetch failed)", coins: [] };
  }
}


// Attach robust tap/click handler (works across iOS Safari / Android / Desktop)
function attachTapHandler(selection, handler) {
  if (!selection) return;

  // Use ONE event only to avoid double-trigger (pointerdown -> click)
  selection.on("pointerdown", (event, d) => {
    event?.preventDefault?.();      // avoids ghost click on mobile
    event?.stopPropagation?.();
    handler(d);
  });

  // Safety: remove other handlers if previously set
  selection.on("click", null);
  selection.on("touchstart", null);
}

// ============================================================================
// Component
// ============================================================================
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Layout driver (portrait/landscape) — single source of truth
  const layout = useLayoutDriver();
  const { x, y, offsetX, offsetY, rotateDeg, L, mode } = layout;

  // Panel + text config from layoutPresets
  const infoP = getPanelStyles(layout, "info");
  const legendP = getPanelStyles(layout, "legend");
  const manifestP = getPanelStyles(layout, "manifest");
  const textCfg = getTextConfig(layout);

  // All other UI elements driven by layoutPresets
  const borderS = getBorderStyles(layout);
  const titleS = getTitleStyles(layout);
  const outline18S = getOutline18Styles(layout);
  const outline30S = getOutline30Styles(layout);
  const outline42S = getOutline42Styles(layout);
  const infoBtnS = getButtonStyles(layout, "info");
  const closeBtnS = getButtonStyles(layout, "close");
  const pumpBtnS = getButtonStyles(layout, "pump");
  const manifestBtnS = getButtonStyles(layout, "manifest");
  const statusS = getStatusBarStyles(layout);
  const videoS = getVideoStyles(layout);

  const [refreshing, setRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  // Circuit-breaker: if refresh fails / rate-limited, temporarily block new refreshes
  const [refreshBlockedLeft, setRefreshBlockedLeft] = useState(0); // seconds
  const refreshBlockUntilRef = useRef(0);
  const refreshBlockTimerRef = useRef(null);
  const REFRESH_COOLDOWN_MS = 20_000;
  const lastRefreshAtRef = useRef(0);
  const cooldownTimerRef = useRef(null);

  useEffect(
    () =>
      () => {
        cooldownTimerRef.current && clearInterval(cooldownTimerRef.current);
        refreshBlockTimerRef.current && clearInterval(refreshBlockTimerRef.current);
      },
    []
  );

  const IS_ADMIN =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("admin") === "kingnarwhal";

  const svgRef = useRef(null);
  const d3WorldRef = useRef(null);          // d3 selection for worldG
  const d3ClustersRef = useRef(new Map());  // id -> d3 selection for cluster group
  const selectedIdRef = useRef(null);       // selected cluster id for hover logic
  const renderIdRef = useRef(0);
  const [showDebug, setShowDebug] = useState(process.env.NEXT_PUBLIC_INTERNAL_DEBUG === "1");

  const [coinsAll, setCoinsAll] = useState([]);
  const [coins, setCoins] = useState([]);

  const [selectedCoin, setSelectedCoin] = useState(null);
  const [closingInfo, setClosingInfo] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);

  const [cgOk, setCgOk] = useState(false);
  const [lastUpdateUTC, setLastUpdateUTC] = useState("…");
  const [dataSource, setDataSource] = useState("Birdeye (loading)");
  const [isMobile, setIsMobile] = useState(false);

  // Hover states (image swap)
  const [infoHover, setInfoHover] = useState(false);
  const [xHover, setXHover] = useState(false);
  const [pumpHover, setPumpHover] = useState(false);
  const [manifestHover, setManifestHover] = useState(false);

  // Birdeye stats for INFO panel (1H / 24H + High/Low)
  const [panelStats, setPanelStats] = useState(null);
  const statsCacheRef = useRef(new Map()); // key: address -> {ts,data}

  // Prevent "ghost tap" on mobile: modal opens then immediately closes
  const lastPanelOpenAtRef = useRef(0);
  const markPanelOpened = () => {
    lastPanelOpenAtRef.current = Date.now();
  };

  /* ==========================
     TTR STATE (restored)
  ========================== */
  const [ttrCap, setTtrCap] = useState(() => {
    if (typeof window === "undefined") return 0;
    const v = Number(localStorage.getItem(LS_TTRCAP));
    return Number.isFinite(v) ? v : 0;
  });

  const [ttrData, setTtrData] = useState(null);
  const [ttrLoading, setTtrLoading] = useState(false);
  const [ttrError, setTtrError] = useState(null);

  const TTR_CAP_RAW = Math.max(0, ttrCap || 0);
  const TTR_CAP_SAFE = Math.max(1_000_000, TTR_CAP_RAW);
  const TTR_HAS_GLOW = TTR_CAP_RAW >= TTR_CORE_VALUE;
  const TTR_CAP_MATS = Math.max(0, TTR_CAP_RAW - TTR_CORE_VALUE);

  // ✅ FIX: FORGING when mint is none OR cap <= 0 OR cap < core
  const __mint = (TTR_CONFIG.MINT || "").trim().toLowerCase();
  const TTR_IS_FORGING =
    !__mint ||
    __mint === "none" ||
    TTR_CAP_RAW <= 0 ||
    (TTR_CAP_RAW > 0 && TTR_CAP_RAW < TTR_CORE_VALUE);

  // ✅ MOBILE UI FIX (robust)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const prev = document.querySelector('style[data-mobile-ui-fix="true"]');
    if (prev?.parentNode) prev.parentNode.removeChild(prev);

    const style = document.createElement("style");
    style.setAttribute("data-mobile-ui-fix", "true");

    // Mobile preset: font auto-scales with viewport (vmin) so it never spills outside in landscape.
    style.innerHTML = `
@media (max-width: 900px) and (max-height: 500px) {
  /* ================================
     SYSTEM 2 — SCALES & LEGEND ONLY
     (independent from INFO)
     Nothing can escape the virgin-border.
  ================================= */
  [data-legend-panel]{ overflow: hidden !important; box-sizing: border-box !important; }
  [data-legend-panel] .woc-panel-inner{ overflow: hidden !important; min-height: 0 !important; }
  /* Keep panels clipped; scrolling happens only inside text zones */
  [data-info-panel],
  [data-scale-panel],
  [data-legend-panel] {
    overflow: hidden !important;
    box-sizing: border-box !important;
  }

  /* ✅ Text safe zones (INFO / SCALE / LEGEND) */
  /* ✅ SCALE text safe-zone (independent from INFO) */
[data-scale-panel] .scale-text-zone {
  width: var(--wocTextW, 100%) !important;
  max-width: var(--wocTextW, 100%) !important;
  height: var(--wocTextH, 100%) !important;
  max-height: var(--wocTextH, 100%) !important;
  margin: 0 auto !important;

  padding: 12px 14px !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  -webkit-overflow-scrolling: touch !important;

  box-sizing: border-box !important;
  min-height: 0 !important;

  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  hyphens: auto !important;

  /* ✅ Removed !important - let layout presets control font size */
  line-height: 1.28;
  display: block !important;
}

/* Ensure inner containers don't vertically center content */
  /* ✅ Keep SCALE/LEGEND content pinned to top (independent from INFO) */
[data-scale-panel] .woc-panel-inner,
[data-legend-panel] .woc-panel-inner {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  align-items: stretch !important;
  min-height: 0 !important;
}
/* ✅ Removed !important from font-size - let layout presets + scale control it */
  [data-info-panel] .woc-title,
  [data-scale-panel] .woc-title,
  [data-legend-panel] .woc-title{
    line-height: 1.15;
  }
  [data-info-panel] .woc-text,
  [data-scale-panel] .woc-text,
  [data-legend-panel] .woc-text{
    line-height: 1.25;
  }
}

/* ✅ Landscape */
@media (max-width: 900px) and (orientation: landscape) {
  /* ✅ SCALE text safe-zone (independent from INFO) */
[data-scale-panel] .scale-text-zone {
  width: var(--wocTextW, 100%) !important;
  max-width: var(--wocTextW, 100%) !important;
  height: var(--wocTextH, 100%) !important;
  max-height: var(--wocTextH, 100%) !important;
  margin: 0 auto !important;

  padding: 12px 14px !important;

  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  -webkit-overflow-scrolling: touch !important;

  box-sizing: border-box !important;
  min-height: 0 !important;

  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  hyphens: auto !important;

  /* ✅ Removed !important - let layout presets control font size */
  line-height: 1.28;
  display: block !important;
}

/* ================================
   LEGEND — SINGLE SOURCE OF TRUTH
   Layout (position/top/transform) is handled by JSX inline styles ONLY.
   This CSS only ensures safe scrolling + wrapping.
================================ */
[data-legend-panel] .legend-text-zone{
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior: contain !important;
  box-sizing: border-box !important;
  min-height: 0 !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  hyphens: auto !important;
}

`;


    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // TTR metrics refresh
useEffect(() => {
  if (TTR_CONFIG.STATUS !== "LIVE") return;
  let cancelled = false;

  async function loadTTR() {
    try {
      setTtrLoading(true);
      setTtrError(null);

      const mint = (TTR_CONFIG.MINT || "").trim();
      const quote = (TTR_CONFIG.QUOTE_MINT || DEFAULT_USDC).trim();

      if (!mint || mint.toLowerCase() === "none") {
        if (!cancelled) {
          setTtrData(null);
          setTtrCap(0);
          setTtrLoading(false);
        }
        return;
      }

      const res = await fetch(
        `/api/ttr-metrics?mint=${encodeURIComponent(mint)}&quoteMint=${encodeURIComponent(quote)}`,
        { cache: "no-store" }
      );

      const json = await res.json();

      // ✅ Normalize: always expose USD price in `price`
      const normalized = {
        ...json,
        price: (json?.priceUsd ?? json?.price ?? null),
      };

      if (!normalized?.ok || !Number.isFinite(normalized.marketCap) || normalized.marketCap <= 0) {
        throw new Error(normalized?.error || "TTR unavailable");
      }
      if (cancelled) return;

      setTtrData(normalized);
      setTtrCap(Math.round(normalized.marketCap));
    } catch (e) {
      if (cancelled) return;
      setTtrError(e?.message || String(e));
      setTtrData(null);
      setTtrCap(0);
    } finally {
      if (!cancelled) setTtrLoading(false);
    }
  }

  loadTTR();
  const timer = setInterval(loadTTR, 20_000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}, []);


  // Persist TTR
  useEffect(() => {
    try { localStorage.setItem(LS_TTRCAP, String(ttrCap)); } catch {}
  }, [ttrCap]);

  // Keyboard + resize
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "d" && IS_ADMIN) setShowDebug((v) => !v);
      if (k === "escape") { setLegendOpen(false); setSelectedCoin(null); }
    };
    const onResize = () => setIsMobile(window.innerWidth < 800);
    onResize();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [IS_ADMIN]);

  // Fetch Birdeye stats for currently opened INFO panel (only when INFO is open and address exists)
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      if (!selectedCoin) { setPanelStats(null); return; }

      // Birdeye tokens in your window usually have `id` as token address.
      // Special-case TTR: use the configured mint so we can show 1H/24H variations for TTR too.
      const isTTR = String(selectedCoin?.id || selectedCoin?.symbol || "").toUpperCase() === "TTR";
      const ttrMint = (TTR_CONFIG.MINT || "").toString().trim();

      const addr = (isTTR ? ttrMint : (selectedCoin.id || selectedCoin.address || selectedCoin.mint || ""))
        .toString()
        .trim();

      if (!addr || addr.toLowerCase() === "ttr" || addr.toLowerCase() === "none") { setPanelStats(null); return; }

      const now = Date.now();
      const cache = statsCacheRef.current;
      const cached = cache.get(addr);
      if (cached && (now - cached.ts) < 15_000) { setPanelStats(cached.data); return; }

      try {
        const res = await fetch(`/api/birdeye-stats?address=${encodeURIComponent(addr)}`);
        const json = await res.json();
        if (cancelled) return;
        if (json && json.ok) {
          cache.set(addr, { ts: Date.now(), data: json });
          setPanelStats(json);
        } else {
          setPanelStats(null);
        }
      } catch {
        if (!cancelled) setPanelStats(null);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, [selectedCoin]);

  // Birdeye cache manager
  const birdeyeMgrRef = useRef({ ts: 0, data: null, promise: null, reqId: 0 });

  async function getWindowCoinsManaged({ force = false } = {}) {
    const mgr = birdeyeMgrRef.current;
    const now = Date.now();
    const RAM_TTL = 20_000;

    if (!force && mgr.data && mgr.ts && now - mgr.ts < RAM_TTL) return { ...mgr.data, _reqId: mgr.reqId };
    if (!force && mgr.promise) return { ...(await mgr.promise), _reqId: mgr.reqId };

    const myReq = ++mgr.reqId;
    mgr.promise = fetchWindowCoins(force);
    try {
      const data = await mgr.promise;
      if (myReq === mgr.reqId) { mgr.data = data; mgr.ts = Date.now(); }
      return { ...data, _reqId: myReq };
    } finally {
      if (myReq === mgr.reqId) mgr.promise = null;
    }
  }

  // Initial load
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = sessionStorage.getItem(SESSION_CG_DATA);
        const cachedAt = Number(sessionStorage.getItem(SESSION_CG_TIME) || 0);
        const fresh = cached && cachedAt && Date.now() - cachedAt < 15 * 60 * 1000;

        if (fresh) {
          const parsed = JSON.parse(cached);
          const deduped = dedupeBestByGroup(parsed?.coins || []);
          if (deduped.length > 0) {
            if (!cancelled) {
              setCoinsAll(deduped);
              setDataSource(parsed.source || "Birdeye (cache)");
              setCgOk(true);
              setLastUpdateUTC(new Date(cachedAt).toUTCString().slice(17, 22) + " UTC");
            }
            return;
          }
        }

        const { source, coins } = await getWindowCoinsManaged({ force: false });
        const deduped = dedupeBestByGroup(coins);
        if (!cancelled) {
          if (deduped.length > 0) {
            setCoinsAll(deduped);
            setDataSource(source);
            const now = Date.now();
            sessionStorage.setItem(SESSION_CG_DATA, JSON.stringify({ source, coins: deduped }));
            sessionStorage.setItem(SESSION_CG_TIME, String(now));
            setLastUpdateUTC(new Date(now).toUTCString().slice(17, 22) + " UTC");
            setCgOk(true);
          } else setCgOk(false);
        }
      } catch { if (!cancelled) setCgOk(false); }
    }

    // Auto-refresh (launch-safe):
    // - Refresh on first load
    // - Refresh periodically, but PAUSE when the tab is hidden (prevents "ghost" traffic)
    // - When tab becomes visible again, refresh once immediately
    // NOTE: if you want it more aggressive, change 10 * 60 * 1000 back to 5 * 60 * 1000.
    const AUTO_REFRESH_MS = 10 * 60 * 1000;

    let intervalId = null;
    const startInterval = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (!document.hidden) load();
      }, AUTO_REFRESH_MS);
    };
    const stopInterval = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const onVis = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        load();
        startInterval();
      }
    };

    load();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
      if (!document.hidden) startInterval();
    }

    return () => {
      cancelled = true;
      stopInterval();
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  function startRefreshCooldown() {
    lastRefreshAtRef.current = Date.now();
    setCooldownLeft(Math.ceil(REFRESH_COOLDOWN_MS / 1000));
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      const leftMs = REFRESH_COOLDOWN_MS - (Date.now() - lastRefreshAtRef.current);
      const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
      setCooldownLeft(leftSec);
      if (leftSec <= 0) { clearInterval(cooldownTimerRef.current); cooldownTimerRef.current = null; }
    }, 250);
  }

  function startRefreshBlock(seconds = 60) {
    const until = Date.now() + Math.max(1, seconds) * 1000;
    refreshBlockUntilRef.current = until;
    setRefreshBlockedLeft(Math.ceil((until - Date.now()) / 1000));
    if (refreshBlockTimerRef.current) clearInterval(refreshBlockTimerRef.current);
    refreshBlockTimerRef.current = setInterval(() => {
      const leftMs = refreshBlockUntilRef.current - Date.now();
      const leftSec = Math.max(0, Math.ceil(leftMs / 1000));
      setRefreshBlockedLeft(leftSec);
      if (leftSec <= 0) {
        clearInterval(refreshBlockTimerRef.current);
        refreshBlockTimerRef.current = null;
      }
    }, 250);
  }

  async function triggerFullRefresh() {
    const since = Date.now() - (lastRefreshAtRef.current || 0);
    const blocked = Date.now() < (refreshBlockUntilRef.current || 0);
    if (blocked || refreshing || since < REFRESH_COOLDOWN_MS || cooldownLeft > 0) return;

    setRefreshing(true);
    startRefreshCooldown();
    try {
      const { source, coins } = await getWindowCoinsManaged({ force: true });
      const deduped = dedupeBestByGroup(coins);
      if (deduped.length > 0) {
        setCoinsAll(deduped);
        setDataSource(source);
        const now = Date.now();
        sessionStorage.setItem(SESSION_CG_DATA, JSON.stringify({ source, coins: deduped }));
        sessionStorage.setItem(SESSION_CG_TIME, String(now));
        setLastUpdateUTC(new Date(now).toUTCString().slice(17, 22) + " UTC");
        setCgOk(true);
      } else setCgOk(false);
    } catch (e) {
      // If we hit a temporary issue (rate-limit / upstream down), block further refresh attempts briefly.
      startRefreshBlock(60);
    } finally {
      setRefreshing(false);
    }
  }

  // Window selection around TTR (normal) OR fixed pre-launch list (when TTR < threshold)
  useEffect(() => {
    if (!coinsAll || coinsAll.length === 0) { setCoins([]); return; }

    const isPrelaunch = TTR_IS_FORGING || ((TTR_CAP_RAW ?? 0) < PRELAUNCH_TTR_THRESHOLD);

    if (isPrelaunch) {
      const picked = pickPrelaunchCoins(coinsAll);

      // Prefer the fixed mint list if those mints exist in the dataset
      if (picked.length >= PRELAUNCH_TARGET_COUNT) {
        setCoins(picked);
        return;
      }

      // Fallback A (robust): bucketed pick across 1M–10M for variety (7 buckets × 2)
      const band = pickPrelaunchBuckets(coinsAll, PRELAUNCH_TARGET_COUNT);

      if (band.length >= Math.min(6, PRELAUNCH_TARGET_COUNT)) {
        setCoins(band);
        return;
      }

      // Fallback B: still populate the map (top caps) if the dataset is sparse
      const top = [...coinsAll]
        .filter((c) => c?.id !== "TTR")
        .filter((c) => Number.isFinite(Number(c?.capNum)) && Number(c.capNum) > 0)
        .sort((a, b) => Number(b.capNum) - Number(a.capNum))
        .slice(0, PRELAUNCH_TARGET_COUNT);

      setCoins(top.length ? top : coinsAll.slice(0, PRELAUNCH_TARGET_COUNT));
      return;
    }

    // =========================
    // NORMAL WINDOW (TTR-driven cap band)
    // =========================
    const ttr = (coinsAll || []).find((c) => c?.id === "TTR") || null;
    const ttrCapNum = Number(ttr?.capNum);
    const cap = Number.isFinite(ttrCapNum) && ttrCapNum > 0 ? ttrCapNum : (TTR_CAP_RAW ?? 0);

    const targetWindow = (Number.isFinite(cap) && cap >= TTR_DEDENSIFY_CAP) ? WINDOW_SIZE_DEDENSED : WINDOW_SIZE;

    // If TTR cap is unknown, fall back to your previous behavior (top WINDOW_SIZE by cap)
    if (!Number.isFinite(cap) || cap <= 0) {
      const top = [...coinsAll]
        .filter((c) => c?.id !== "TTR")
        .filter((c) => Number.isFinite(Number(c?.capNum)) && Number(c.capNum) > 0)
        .sort((a, b) => Number(b.capNum) - Number(a.capNum))
        .slice(0, Math.max(0, targetWindow - 1));

      setCoins(ttr ? [ttr, ...top].slice(0, targetWindow) : top.slice(0, targetWindow));
      return;
    }

    // Dynamic band: remove tiny coins when TTR is big
    const BASE_MIN = Math.max(1_000_000, cap * 0.10); // 10% of TTR, but never below 1M
    const BASE_MAX = cap * 2.0;                       // up to 2x TTR

    const bandAll = [...coinsAll]
      .filter((c) => c?.id !== "TTR")
      .filter((c) => Number.isFinite(Number(c?.capNum)) && Number(c.capNum) > 0)
      .filter((c) => Number(c.capNum) >= BASE_MIN && Number(c.capNum) <= BASE_MAX)
      .sort((a, b) => Number(a.capNum) - Number(b.capNum)); // ascending for even picking

    // If band is sparse, widen gently (still no microcaps)
    const widened = bandAll.length >= Math.min(8, targetWindow - 1)
      ? bandAll
      : [...coinsAll]
          .filter((c) => c?.id !== "TTR")
          .filter((c) => Number.isFinite(Number(c?.capNum)) && Number(c.capNum) > 0)
          .filter((c) => Number(c.capNum) >= Math.max(1_000_000, cap * 0.05) && Number(c.capNum) <= cap * 3.0)
          .sort((a, b) => Number(a.capNum) - Number(b.capNum));

    const src = widened;
    const need = Math.max(0, targetWindow - (ttr ? 1 : 0));

    function pickEvenly(list, n) {
      if (!list.length || n <= 0) return [];
      if (list.length <= n) return list.slice();
      const out = [];
      for (let i = 0; i < n; i++) {
        const idx = Math.floor((i * (list.length - 1)) / Math.max(1, n - 1));
        out.push(list[idx]);
      }
      return out;
    }

    const picked = pickEvenly(src, need).sort((a, b) => Number(b.capNum) - Number(a.capNum));

    setCoins(ttr ? [ttr, ...picked].slice(0, targetWindow) : picked.slice(0, targetWindow));
  }, [coinsAll, ttrCap, TTR_IS_FORGING]);

const coinsSig = useMemo(() => {
    return (coins || [])
      .map((c) => `${(c?.symbol || c?.name || c?.id || "").toString().toUpperCase()}_${Math.round(Number(c?.capNum || 0))}`)
      .sort()
      .join("|");
  }, [coins]);

  const renderKeyRef = useRef("");

  // D3 render (kept exactly like your previous build)
  useEffect(() => {
    if (!mounted) return;

    // ✅ Fix 1: Include safezone in renderKey to force rerender when safezone changes
    const sz = getSafezoneConfig(layout);
    const szSig = `${sz.scaleX}_${sz.scaleY}_${sz.scaleGlobal}_${sz.radius}_${sz.offsetX}_${sz.offsetY}`;

    // ✅ Map rotation for portrait mode
    const MAP_ROT = (mode === "port" || String(mode).includes("port")) ? 90 : 0;
    const MAP_S = MAP_ROT ? (BASE_H / BASE_W) : 1; // 1080/1920 = 0.5625 to prevent clipping
    const CX = BASE_W / 2;
    const CY = BASE_H / 2;

    const renderKey = `${coinsSig}__${Math.round(Number(ttrCap || 0))}__${showDebug ? 1 : 0}__${Number(x).toFixed(4)}__${Number(y).toFixed(4)}__SZ:${szSig}__${mode}__MR:${MAP_ROT}`;
    if (renderKeyRef.current === renderKey) return;
    renderKeyRef.current = renderKey;

    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const defsGrid = svg.append("defs");

const gridOutline = defsGrid.append("filter")
  .attr("id", "grid-outline-neo")
  .attr("x", "-60%")
  .attr("y", "-60%")
  .attr("width", "220%")
  .attr("height", "220%");

// Outer black
gridOutline.append("feDropShadow")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("stdDeviation", 1.2)
  .attr("flood-color", "rgba(0,0,0,0.6)");

// Inner black crisp
gridOutline.append("feDropShadow")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("stdDeviation", 2.2)
  .attr("flood-color", "rgba(0,0,0,0.55)");

// Grid glow (for animated layer)
const gridGlow = defsGrid.append("filter")
  .attr("id", "grid-glow-blue")
  .attr("x", "-60%")
  .attr("y", "-60%")
  .attr("width", "220%")
  .attr("height", "220%");

gridGlow.append("feDropShadow")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("stdDeviation", 3.2)
  .attr("flood-color", "rgba(120,220,255,0.35)");

gridGlow.append("feDropShadow")
  .attr("dx", 0)
  .attr("dy", 0)
  .attr("stdDeviation", 8.0)
  .attr("flood-color", "rgba(80,170,255,0.18)");

    // ✅ Create worldG group for map rotation (portrait mode only)
    const worldG = svg.append("g").attr("class", "world-map");
    
    if (MAP_ROT) {
      worldG.attr(
        "transform",
        `translate(${CX},${CY}) rotate(${MAP_ROT}) scale(${MAP_S}) translate(${-CX},${-CY})`
      );
    }

    const myRenderId = ++renderIdRef.current;
    const isStale = () => myRenderId !== renderIdRef.current;

    const width = BASE_W;
    const height = BASE_H;
    const rand = makeSeededRand(renderKey);

    const scaleMode = "LARGE";
    const hexRadius = 30;
    const hexbin = d3Hexbin().radius(hexRadius);
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexHeight = 1.5 * hexRadius;

    const cols = Math.ceil(width / hexWidth) + 6;
    const rows = Math.ceil(height / hexHeight) + 10;
    const axialMap = new Map();
    const hexList = [];

    function offsetToAxial(col, row) {
      const q = col - Math.floor((row - (row & 1)) / 2);
      const r = row;
      return [q, r];
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const xPx = col * hexWidth + ((row % 2) * hexWidth) / 2;
        const yPx = row * hexHeight;
        const [q, r] = offsetToAxial(col, row);
        axialMap.set(keyOf(q, r), { q, r, x: xPx, y: yPx });
        hexList.push({ q, r, x: xPx, y: yPx });
      }
    }

   // Grid base layer (stable, blue)
   worldG.append("g")
  .attr("class", "hex-grid-base")
  .selectAll("path")
  .data(hexList)
  .enter()
  .append("path")
  .attr("d", hexbin.hexagon())
  .attr("transform", (d) => `translate(${d.x},${d.y})`)
  .attr("fill", "rgba(255,255,255,0.015)")
  .attr("stroke", "rgba(120,220,255,0.75)")
  .attr("stroke-width", 0.9)
  .attr("filter", "url(#grid-outline-neo)")
  .style("pointer-events", "none");

// Grid glow layer (animated globally, not per-hex)
const gridGlowG = worldG.append("g")
  .attr("class", "hex-grid-glow")
  .style("opacity", 0)
  .style("pointer-events", "none");

gridGlowG.selectAll("path")
  .data(hexList)
  .enter()
  .append("path")
  .attr("d", hexbin.hexagon())
  .attr("transform", (d) => `translate(${d.x},${d.y})`)
  .attr("fill", "none")
  .attr("stroke", "rgba(120,220,255,0.95)")
  .attr("stroke-width", 1.35)
  .attr("filter", "url(#grid-glow-blue)");

// Animate grid glow globally (RAF, linear, random)
let gridGlowAnimStop = false;

let glow = 0;
let start = performance.now();
let from = 0;
let to = 0.18;
let dur = 1800;
let nextDelay = 600;

function pickNext() {
  from = glow;
  to = 0.05 + Math.random() * 0.25;       // 0.05 → 0.30
  dur = 900 + Math.random() * 2800;       // 0.9s → 3.7s
  nextDelay = 250 + Math.random() * 1200; // 0.25s → 1.45s
  start = performance.now();
}

pickNext();

function tick(now) {
  if (gridGlowAnimStop) return;

  const t = (now - start) / dur;

  if (t >= 1) {
    glow = to;
    gridGlowG.style("opacity", glow);

    // Random pause, then new segment
    setTimeout(() => {
      if (!gridGlowAnimStop) pickNext();
    }, nextDelay);
  } else {
    // Pure linear interpolation
    glow = from + (to - from) * t;
    gridGlowG.style("opacity", glow);
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

    const ttrHex = hexList.reduce((prev, curr) =>
      Math.hypot(curr.x - width / 2, curr.y - height / 2) <
      Math.hypot(prev.x - width / 2, prev.y - height / 2)
        ? curr
        : prev
    );
    const centerXGrid = ttrHex.x;
    const centerYGrid = ttrHex.y;

    // ✅ Fix 2: Use getSafezoneConfig for 100% preset control
    const SZ = getSafezoneConfig(layout);

    // ✅ Compensate for map scale in portrait so preset values remain logical
    const mapScale = MAP_ROT ? (BASE_H / BASE_W) : 1; // 0.5625 in portrait, 1 in landscape
    const baseSize = Math.min(width, height) * (SZ.scaleGlobal / mapScale);
    const rectW = baseSize * SZ.scaleX;
    const rectH = baseSize * SZ.scaleY;
    const rectX = centerXGrid - rectW / 2 + SZ.offsetX;
    const rectY = centerYGrid - rectH / 2 + SZ.offsetY;

    const marginHex = hexRadius;
    const rectSafeX = rectX + marginHex;
    const rectSafeY = rectY + marginHex;
    const rectSafeW = rectW - marginHex * 2;
    const rectSafeH = rectH - marginHex * 2;

    function pointInSafe(px, py) {
      return px >= rectSafeX && px <= rectSafeX + rectSafeW && py >= rectSafeY && py <= rectSafeY + rectSafeH;
    }

    function roundedRectPath(px, py, w, h, r) {
      return `
        M${px + r},${py}
        H${px + w - r}
        Q${px + w},${py} ${px + w},${py + r}
        V${px + h - r}
        Q${px + w},${py + h} ${px + w - r},${py + h}
        H${px + r}
        Q${px},${py + h} ${px},${py + h - r}
        V${px + r}
        Q${px},${py} ${px + r},${py}
        Z
      `;
    }

    const safeZonePath = roundedRectPath(rectX, rectY, rectW, rectH, SZ.radius);

    const defsOverlay = svg.append("defs");
    
    // ✅ Fix mask coordinate system - use userSpaceOnUse for pixel coordinates
    const mask = defsOverlay
      .append("mask")
      .attr("id", "mask-outside")
      .attr("maskUnits", "userSpaceOnUse")
      .attr("maskContentUnits", "userSpaceOnUse");

    mask.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "white");

    mask.append("path")
      .attr("d", safeZonePath)
      .attr("fill", "black");
    
    defsOverlay.append("filter").attr("id", "blur8").append("feGaussianBlur").attr("stdDeviation", 8);

    worldG.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "rgba(12,8,4,0.65)")
      .attr("filter", "url(#blur8)")
      .attr("mask", "url(#mask-outside)");

    if (showDebug) {
      worldG.append("path")
        .attr("d", safeZonePath)
        .attr("fill", "none")
        .attr("stroke", "#ff4040")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "8 5");
    }

    const axialValues = Array.from(axialMap.values());
    const innerCandidates = axialValues.filter((v) => pointInSafe(v.x, v.y));

    const palette = d3.schemeTableau10;
    const clusters = [];
    const occupied = new Set();

    function reserveWithBuffer(q, r, radius) {
      for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
          if (axialDistance(0, 0, dq, dr) <= radius) occupied.add(keyOf(q + dq, r + dr));
        }
      }
    }

    async function placeAll() {
      const list = (coins || [])
        .map((p) => ({ p, hexTarget: computeHexCountContinuous(p.capNum, scaleMode).total }))
        .sort((a, b) => b.hexTarget - a.hexTarget);

      for (const { p, hexTarget } of list) {
        if (isStale()) return;

        const centerPool = innerCandidates.length ? innerCandidates.slice() : axialValues.slice();
        for (let i = centerPool.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [centerPool[i], centerPool[j]] = [centerPool[j], centerPool[i]];
        }

        const baseSize = Math.min(hexTarget, MAX_HEX_PER_CLUSTER);
        const spiral = genSpiralAxialPositions(baseSize);

        const MAX_CENTER_TRIES = Math.min(900, centerPool.length);
        for (let ci = 0; ci < MAX_CENTER_TRIES; ci++) {
          const centerCandidate = centerPool[ci];
          if (!centerCandidate) continue;

          const cQ = centerCandidate.q;
          const cR = centerCandidate.r;

          const candidate = spiral.map(([dq, dr]) => [cQ + dq, cR + dr]);
          let valid = true;
          const hexes = [];

          for (const [q, r] of candidate) {
            const k = keyOf(q, r);
            const h = axialMap.get(k);
            if (!h || occupied.has(k)) { valid = false; break; }
            if (axialDistance(q, r, ttrHex.q, ttrHex.r) < 4) { valid = false; break; }

            const corners = hexCorners(h.x, h.y, hexRadius);
            let inside = 0;
            for (const [px, py] of corners) if (pointInSafe(px, py)) inside++;
            if (inside < 4) { valid = false; break; }

            hexes.push({ x: h.x, y: h.y, q, r });
          }

          if (!valid) continue;
          for (const hh of hexes) reserveWithBuffer(hh.q, hh.r, CLUSTER_BUFFER);

          const stableKey = groupKey(p);
          const stableId = `c${hash32(stableKey)}`;
          clusters.push({
            id: stableId,
            stableKey,
            ...p,
            color: palette[hash32(stableKey) % palette.length],
            hexes,
            centerX: centerCandidate.x,
            centerY: centerCandidate.y,
          });

          break;
        }
      }
    }

    (async () => {
      // =============================================================
      // TTR materials (step-by-step)
      // Show ONLY: unlocked hexes + the next "locked" hex (one at a time)
      // Example: [unlock, unlock, unlock] + [next lock]
      // =============================================================
      const ttrGroup = worldG.append("g").attr("class", "ttr-materials");

      // Determine ring material for a given distance (same logic as materials compute)
      function keyForRingDist(dist) {
        if (dist <= 1) return "copper";
        if (dist === 2) return "silver";
        if (dist === 3) return "gold";
        return "final";
      }

      if (TTR_HAS_GLOW) {
        const unlockedMats = computeTtrMaterialsRingsOnly(TTR_CAP_MATS);
        const unlockedCount = unlockedMats.length;
        const ttrSpiral = genSpiralAxialPositions(61).slice(1); // 60 positions around the core

        // CURRENT ring = ring of the "next" hex to unlock
        // We show:
        // - all previous rings fully unlocked
        // - current ring as LOCK, progressively unlocking within it
        // - hide future rings
        let currentRingDist = null;
        if (unlockedCount < ttrSpiral.length) {
          const [ndq, ndr] = ttrSpiral[unlockedCount];
          currentRingDist = axialDistance(0, 0, ndq, ndr);
        }

        const TTR_BREATH_DELAY_MS = { copper: 0, silver: 420, gold: 840, final: 1260 };

        for (let i = 0; i < ttrSpiral.length; i++) {
          const [dq, dr] = ttrSpiral[i];
          const dist = axialDistance(0, 0, dq, dr);

          if (currentRingDist != null && dist > currentRingDist) continue;

          const q = ttrHex.q + dq;
          const r = ttrHex.r + dr;
          const h = axialMap.get(keyOf(q, r));
          if (!h) continue;

          const ringKey = keyForRingDist(dist);

          // Previous rings are unlocked (spiral fills outward by rings)
          let isUnlocked = true;
          if (currentRingDist != null && dist === currentRingDist) {
            // In current ring: unlock only those reached by the spiral so far
            isUnlocked = i < unlockedCount;
          }
          if (currentRingDist == null) isUnlocked = true; // everything unlocked

          const matKey = isUnlocked ? (unlockedMats[i]?.key || ringKey) : ringKey;
          const href = isUnlocked
            ? (TTR_IMG_UNLOCK[matKey] || TTR_IMG_UNLOCK[ringKey])
            : (TTR_IMG_LOCK[ringKey] || TTR_IMG_LOCK[matKey]);

          const alpha = 1;

          ttrGroup.append("path")
            .attr("d", hexbin.hexagon())
            .attr("transform", `translate(${h.x},${h.y})`)
            .attr("fill", "rgba(255,255,255,0.03)")
            .attr("stroke", "rgba(255,190,90,0.18)")
            .attr("stroke-width", 0.6)
            .style("opacity", alpha)
            .style("filter", "drop-shadow(0 0 2px rgba(255,170,80,0.22))");

          const breathClass = isUnlocked ? `ttr-mat-breath ttr-mat-${matKey}` : "";
          const breathDelay = isUnlocked ? (TTR_BREATH_DELAY_MS[matKey] || 0) : 0;
          drawHexImage(ttrGroup, href, h, hexRadius, TTR_IMAGE_SCALE[matKey] || 1.0, alpha, breathClass, breathDelay);
        }
      }

      if (coins && coins.length) await placeAll();
      if (isStale()) return;


      const defs = svg.append("defs");

      // ===== GOLD GLOWS (forge warm) =====
      const glowSoft = defs.append("filter")
        .attr("id", "gold-glow-soft")
        .attr("x", "-60%").attr("y", "-60%")
        .attr("width", "220%").attr("height", "220%");

      glowSoft.append("feDropShadow")
        .attr("dx", 0).attr("dy", 0)
        .attr("stdDeviation", 3.5)
        .attr("flood-color", "rgba(255,170,80,0.35)");

      glowSoft.append("feDropShadow")
        .attr("dx", 0).attr("dy", 0)
        .attr("stdDeviation", 7.5)
        .attr("flood-color", "rgba(255,130,40,0.18)");

      const glowStrong = defs.append("filter")
        .attr("id", "gold-glow-strong")
        .attr("x", "-70%").attr("y", "-70%")
        .attr("width", "240%").attr("height", "240%");

      glowStrong.append("feDropShadow")
        .attr("dx", 0).attr("dy", 0)
        .attr("stdDeviation", 4.5)
        .attr("flood-color", "rgba(255,190,95,0.55)");

      glowStrong.append("feDropShadow")
        .attr("dx", 0).attr("dy", 0)
        .attr("stdDeviation", 12)
        .attr("flood-color", "rgba(255,120,35,0.28)");

      // ===== BEVEL (visible forged edge) =====
      const bevelHi = defs.append("filter")
        .attr("id", "bevel-hi")
        .attr("x", "-70%").attr("y", "-70%")
        .attr("width", "240%").attr("height", "240%");

      bevelHi.append("feDropShadow")
        .attr("dx", -1.6).attr("dy", -1.6)
        .attr("stdDeviation", 0.9)
        .attr("flood-color", "rgba(255,255,255,0.38)");

      bevelHi.append("feDropShadow")
        .attr("dx", -0.7).attr("dy", -0.7)
        .attr("stdDeviation", 0.55)
        .attr("flood-color", "rgba(255,230,180,0.22)");

      const bevelLo = defs.append("filter")
        .attr("id", "bevel-lo")
        .attr("x", "-70%").attr("y", "-70%")
        .attr("width", "240%").attr("height", "240%");

      bevelLo.append("feDropShadow")
        .attr("dx", 1.8).attr("dy", 1.8)
        .attr("stdDeviation", 1.05)
        .attr("flood-color", "rgba(0,0,0,0.62)");

      bevelLo.append("feDropShadow")
        .attr("dx", 0.9).attr("dy", 0.9)
        .attr("stdDeviation", 0.65)
        .attr("flood-color", "rgba(0,0,0,0.40)");

      clusters.forEach((c) => {
        // Gradient for cluster fill - forged metal (darker, less saturated)
        const grad = defs
          .append("radialGradient")
          .attr("id", `grad-${c.id}`)
          .attr("cx", "50%")
          .attr("cy", "50%")
          .attr("r", "60%");

        const base = d3.color(c.color);
        const core = base ? base.darker(0.7) : d3.color("#666");
        const edge = base ? base.darker(2.8) : d3.color("#222");

        grad.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", core.formatHex())
          .attr("stop-opacity", 0.92);

        grad.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", edge.formatHex())
          .attr("stop-opacity", 0.88);

        const g = worldG
          .append("g")
          .attr("class", `cluster-${c.id} cluster-breath`)
          .style("opacity", 1)
          .attr("data-cluster-id", c.id)
          .style("transition", "opacity 180ms ease, filter 180ms ease")
          .attr("data-order", 1); // base order, can be raised when selected

        const hexPath = hexbin.hexagon();

        // Draw each hex with a triple-stroke outline: black → blue → black

        c.hexes.forEach((h) => {
          // Ring-based opacity (OTHER coins only). Keep colors unchanged; vary opacity by distance.
          // Center (dist=0) + first ring (dist=1) are treated as "copper".
          const center = c.hexes && c.hexes.length ? c.hexes[0] : null;
          const dist = center ? axialDistance(h.q, h.r, center.q, center.r) : 0;
          let ringKey = "final";
          if (dist <= 1) ringKey = "copper";
          else if (dist === 2) ringKey = "silver";
          else if (dist === 3) ringKey = "gold";
          const ringOpacity = OTHER_RING_OPACITY[ringKey] ?? 0.85;

          const tr = `translate(${h.x},${h.y})`;

          // 1) Outer dark stroke
          g.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", "none")
            .attr("stroke", "rgba(0,0,0,0.65)")
            .attr("stroke-width", 2.6).style("opacity", ringOpacity);

          // 2) Mid neutral stroke (idle state)
          g.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", "none")
            .attr("stroke", "rgba(120,120,120,0.45)")
            .attr("stroke-width", 1.6).style("opacity", ringOpacity);

          // Bevel highlight (top-left) - forged light edge (NO FILTER for perf)
          g.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", "none")
            .attr("stroke", "rgba(255,255,255,0.32)")
            .attr("stroke-width", 1.9)
            .style("opacity", ringOpacity);

          // Bevel shadow (bottom-right) - forged depth (NO FILTER for perf)
          g.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", "none")
            .attr("stroke", "rgba(0,0,0,0.55)")
            .attr("stroke-width", 2.1)
            .style("opacity", ringOpacity);

          // Micro warm rim (adds forged metal feel, subtle but readable)
          g.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", "none")
            .attr("stroke", "rgba(255,180,90,0.16)")
            .attr("stroke-width", 0.9)
            .style("opacity", ringOpacity * 0.9);

          // Inner edge (gives forged cavity, subtle)
          g.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", "none")
            .attr("stroke", "rgba(0,0,0,0.42)")
            .attr("stroke-width", 0.75)
            .style("opacity", ringOpacity);

          // 3) Main filled hex with a thin inner dark stroke
          g.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", `url(#grad-${c.id})`)
            .attr("stroke", "rgba(0,0,0,0.55)")
            .attr("stroke-width", 0.8).style("opacity", ringOpacity);
        });

        // 4️⃣ Cluster warm outline overlay (shown on hover/selected)
        const outline = g.append("g").attr("class", "cluster-outline").style("opacity", 0);

        c.hexes.forEach((h) => {
          const tr = `translate(${h.x},${h.y})`;
          outline.append("path")
            .attr("d", hexPath)
            .attr("transform", tr)
            .attr("fill", "none")
            .attr("stroke", "rgba(255,190,90,0.85)")
            .attr("stroke-width", 2.0);
            // NO filter at build - added dynamically on hover/selected for perf
        });

        // 4B) Selected warm halo (subtle heat around cluster center)
        const halo = g.append("g")
          .attr("class", "cluster-halo")
          .style("opacity", 0)
          .style("pointer-events", "none");

        halo.append("circle")
          .attr("cx", c.centerX)
          .attr("cy", c.centerY)
          .attr("r", 58)
          .attr("fill", "rgba(255,165,70,0.10)")
          .style("filter", "url(#gold-glow-soft)");

        halo.append("circle")
          .attr("cx", c.centerX)
          .attr("cy", c.centerY)
          .attr("r", 46)
          .attr("fill", "rgba(255,140,40,0.08)")
          .style("filter", "url(#gold-glow-soft)");

        // Hitbox (captures hover/click reliably)
        const hit = g.append("circle")
          .attr("cx", c.centerX)
          .attr("cy", c.centerY)
          .attr("r", 62)
          .attr("fill", "rgba(0,0,0,0)")
          .style("pointer-events", "all")
          .style("cursor", "pointer")
          .style("touch-action", "manipulation"); // Prevent ghost clicks on iOS

        // Mobile tap security
        hit.on("touchstart", (event) => {
          if (event.preventDefault) event.preventDefault();
        });

        // Logo
        g.append("image")
          .attr("xlink:href", c.logo)
          .attr("width", 48)
          .attr("height", 48)
          .attr("x", Math.round(c.centerX - 24))
          .attr("y", Math.round(c.centerY - 24))
          .attr("transform", MAP_ROT ? `rotate(${-MAP_ROT}, ${c.centerX}, ${c.centerY})` : null)
          .style("pointer-events", "none");

        // Hover (desktop only) - disabled on mobile/touch devices
        hit.on("pointerenter", () => {
          if (window.matchMedia && window.matchMedia("(hover: none)").matches) return; // mobile: no hover
          g.classed("is-hover", true);
          outline.style("opacity", 0.9).style("filter", "url(#gold-glow-soft)");
          halo.style("opacity", 0.55);
        });

        hit.on("pointerleave", () => {
          if (window.matchMedia && window.matchMedia("(hover: none)").matches) return; // mobile: no hover
          g.classed("is-hover", false);
          outline.style("opacity", 0).style("filter", null);
          halo.style("opacity", 0);
        });

        // Tap/click to open INFO panel
        attachTapHandler(hit, () => {
          markPanelOpened();
          setClosingInfo(false);

          setSelectedCoin(c);
        });

        // 5️⃣ Store D3 selections for reactive updates (including halo)
        d3ClustersRef.current.set(c.id, { g, outline, halo });
      });

// TTR halo gradient
      const defsTTR = svg.append("defs");
      const gradTTR = defsTTR.append("radialGradient")
        .attr("id", "grad-ttr-halo")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "70%");
     gradTTR.append("stop")
  .attr("offset", "0%")
  .attr("stop-color", "#ffe2a8")
  .attr("stop-opacity", 0.9);

gradTTR.append("stop")
  .attr("offset", "40%")
  .attr("stop-color", "#ffb347")
  .attr("stop-opacity", 0.55);

gradTTR.append("stop")
  .attr("offset", "70%")
  .attr("stop-color", "#ff8c1a")
  .attr("stop-opacity", 0.25);

gradTTR.append("stop")
  .attr("offset", "100%")
  .attr("stop-color", "#5a2a00")
  .attr("stop-opacity", 0.05);

      const ttrInfo = {
        id: "TTR",
        name: "TTR – War of Coins",
        symbol: "TTR",
        capNum: ttrCap,
        price: ttrData?.price != null ? `$${Number(ttrData.price).toFixed(8)}` : "En attente",
        pct1y: "N/A",
        pct30: "N/A",
        pct7: "N/A",
        pct24: "N/A",
      };

      const ttr = worldG.append("g")
  .attr("class", "ttr-core")
  .style("cursor", "pointer");

// HALO (pulse)
const ttrHalo = ttr.append("g")
  .attr("class", "ttr-halo-pulse"); // <-- animation UNIQUEMENT ici

ttrHalo.append("circle")
  .attr("cx", centerXGrid)
  .attr("cy", centerYGrid)
  .attr("r", 55)
  .attr("fill", "none")
  .attr("stroke", "url(#grad-ttr-halo)")
  .attr("stroke-width", 4.5)
  .attr("stroke-opacity", 0.6);

ttrHalo.append("circle")
  .attr("cx", centerXGrid)
  .attr("cy", centerYGrid)
  .attr("r", 48)
  .attr("fill", "url(#grad-ttr-halo)")
  .attr("opacity", 0.28);

// IMAGE (FIXE) - with counter-rotation to stay upright in portrait
ttr.append("image")
  .attr("xlink:href", TTR_HAS_GLOW ? "/ttr-core-glow.png" : "/ttr-core.png")
  .attr("width", 70)
  .attr("height", 70)
  .attr("x", centerXGrid - 35)
  .attr("y", centerYGrid - 35)
  .attr("transform", MAP_ROT ? `rotate(${-MAP_ROT}, ${centerXGrid}, ${centerYGrid})` : null);


      ttr.on("pointerdown", (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        
        markPanelOpened();
        setClosingInfo(false);
        setSelectedCoin(ttrInfo);
      });

      // Remove double triggers
      ttr.on("click", null);
      ttr.on("touchstart", null);
})();

    // Store worldG reference for reactive updates
    d3WorldRef.current = worldG;

    // Cleanup: stop grid glow animation
    return () => {
      gridGlowAnimStop = true;
    };

  }, [mounted, coinsSig, x, y, showDebug, ttrCap, ttrData, TTR_HAS_GLOW, TTR_CAP_MATS]);

  // 6️⃣ REACTIVE HOVER & DIMMING - useEffect qui met à jour selected + dimming sans rerender
  useEffect(() => {
    const map = d3ClustersRef.current;
    if (!map || map.size === 0) return;

    const selId = selectedCoin?.id && String(selectedCoin.id).toUpperCase() !== "TTR"
      ? selectedCoin.id
      : null;

    // ✅ Dimming tuned for mobile (less aggressive on small screens)
    const dimOthers = isMobile ? 0.35 : 0.28;

    // Dim others + highlight selected
    for (const [id, obj] of map.entries()) {
      const isSel = selId && id === selId;

      // Opacity / dimming
      obj.g.style("opacity", selId ? (isSel ? 1 : dimOthers) : 1);

      // Visual states
      if (isSel) {
        // Selected: always on top with strong glow
        obj.g.raise();
        obj.outline.style("opacity", 1).style("filter", "url(#gold-glow-strong)");
        obj.halo?.style("opacity", 1);
      } else {
        // If a selection exists, others must be OFF (no hover glow)
        if (selId) obj.g.classed("is-hover", false);

        const hov = !selId && obj.g.classed("is-hover"); // hover only when nothing selected
        obj.outline.style("opacity", hov ? 0.9 : 0).style("filter", hov ? "url(#gold-glow-soft)" : null);
        obj.halo?.style("opacity", hov ? 0.55 : 0);
      }
    }
  }, [selectedCoin, mounted, isMobile]);

  // Maintain selectedIdRef for hover logic (no rerender)
  useEffect(() => {
    const id = selectedCoin?.id && String(selectedCoin.id).toUpperCase() !== "TTR"
      ? String(selectedCoin.id)
      : null;
    selectedIdRef.current = id;
  }, [selectedCoin]);


  if (!mounted) {

    return (
      <div
        style={{
          width: legendP.width,
          height: legendP.height,
          "--wocTextW": legendP.safeAreaWidth,
          "--wocTextH": legendP.safeAreaHeight,
          background: "#0c111b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffd87a",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: `calc(${legendP.fontSize} * ${(textCfg.legendScale || 1) * (textCfg.globalScale || 1)})`,
        }}
      >
        Loading Realm...
      </div>
    );
  }

  const startCloseInfo = () => {
    // ✅ instant kill glow (prevents "stuck lit" until hover recalculates)
    forceClearClusterGlow();

    setClosingInfo(true);
    setTimeout(() => { setSelectedCoin(null); setClosingInfo(false); }, 300);
  };

  const forceClearClusterGlow = () => {
    const map = d3ClustersRef.current;
    if (!map || map.size === 0) return;

    for (const [, obj] of map.entries()) {
      obj.g.classed("is-hover", false);
      obj.outline?.style("opacity", 0).style("filter", null);
      obj.halo?.style("opacity", 0);
      obj.g.style("opacity", 1);
    }
  };

  const startCloseLegend = () => {
    if (Date.now() - (lastPanelOpenAtRef.current || 0) < 250) return;
    setClosingInfo(true);
    setTimeout(() => { setLegendOpen(false); setClosingInfo(false); }, 300);
  };

  const startCloseManifest = () => {
    setClosingInfo(true);
    setTimeout(() => { setManifestOpen(false); setClosingInfo(false); }, 300);
  };

  // Panels dimensions are driven by layout presets (portrait/landscape)
  const panelW = infoP.width;
  const panelH = infoP.height;
  const legendW = legendP.width;
  const legendH = legendP.height;
  const manifestW = manifestP.width;
  const manifestH = manifestP.height;

return (
    <div
      onPointerDown={(e) => {
        // One-tap close: closes INFO or LEGEND or MANIFEST on ANY click/tap
        
        // ✅ Block "ghost taps" right after opening for ALL panels
        if (Date.now() - (lastPanelOpenAtRef.current || 0) < 250) return;
        
        if (selectedCoin) startCloseInfo();
        if (manifestOpen) startCloseManifest();
        if (legendOpen) startCloseLegend();
      }}
      style={{ width: "100vw", height: "100vh", background: "#0c111b", position: "relative", overflow: "hidden" }}>

      {/* DEBUG (auto): shows when panel state is true */}
      <video
        src="/map.mp4"
        autoPlay muted loop playsInline
        style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          objectFit: "cover",
          pointerEvents: "none",
          ...videoS,
        }}
      />

      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes borderGlow {
          0%,100% { filter: drop-shadow(0 0 15px rgba(255,200,100,.25)) drop-shadow(0 0 30px rgba(255,160,60,.15)); }
          50% { filter: drop-shadow(0 0 20px rgba(255,210,120,.4)) drop-shadow(0 0 50px rgba(255,180,80,.3)); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes clusterBreath { 0%,100% {transform:scale(1);} 50% {transform:scale(1.035);} }
        .cluster-breath { transform-origin: center center; transform-box: fill-box; will-change: transform, opacity; backface-visibility: hidden; animation: clusterBreath 4.8s ease-in-out infinite; }
        @keyframes ttrHaloPulse {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
            filter:
              drop-shadow(0 0 6px rgba(255,180,90,0.30))
              drop-shadow(0 0 14px rgba(255,120,35,0.18));
          }
          50% {
            opacity: 0.65;
            transform: scale(1.06);
            filter:
              drop-shadow(0 0 10px rgba(255,190,95,0.48))
              drop-shadow(0 0 22px rgba(255,120,35,0.28));
          }
        }
        .ttr-halo-pulse { transform-origin: center center; transform-box: fill-box; will-change: transform, opacity, filter; animation: ttrHaloPulse 4.8s ease-in-out infinite; }

        @keyframes ttrMatBreath {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.055); }
        }
        .ttr-mat-breath {
          transform-origin: center center;
          transform-box: fill-box;
          will-change: transform;
          animation: ttrMatBreath 4.6s ease-in-out infinite;
        }

        /* ✅ Button hover glow */
        .woc-icon-btn{
          filter: drop-shadow(0 0 4px rgba(255, 220, 100, 0.14)) drop-shadow(0 0 10px rgba(255, 190, 80, 0.08));
          transform: scale(1);
          transition: filter 180ms ease, transform 180ms ease;
          will-change: filter, transform;
        }
        .woc-icon-btn:hover{
          filter: drop-shadow(0 0 10px rgba(255, 220, 120, 0.42)) drop-shadow(0 0 24px rgba(255, 190, 90, 0.26));
          transform: scale(1.05);
        }
        .woc-icon-btn:active{ transform: scale(0.98); }

        /* ✅ SAFE ZONE internal (invisible) */
        .woc-safe{
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
          -webkit-overflow-scrolling: touch;
        }
        .woc-safe *{ max-width: 100%; }

        /* 7️⃣ Cluster hover/selected states (filters managed by D3 for reliability) */
        .is-hover .cluster-outline {
          opacity: 0.9 !important;
        }
        .is-selected .cluster-outline {
          opacity: 1 !important;
        }
`}</style>

      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: BASE_W, height: BASE_H,
        transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) rotate(${rotateDeg}deg) scale(${x}, ${y})`,
        transformOrigin: "center center",
        zIndex: 10,
      }}>
        <img
          src="/border-king-narwhal.png"
          alt="border"
          style={{
            position: "absolute",
            ...borderS,
            objectFit: "cover",
            pointerEvents: "none",
            // zIndex comes from layout preset (borderS)
            animation: "borderGlow 6s ease-in-out infinite",
          }}
        />

        <img
          src="/titel-borde.png"
          alt="title"
          style={{
            position: "absolute",
            ...titleS,
            transform: `${titleS.transform} scale(${(textCfg.titleScale || 1) * (textCfg.globalScale || 1)})`,
            pointerEvents: "none",
            // zIndex comes from layout preset (titleS)
          }}
        />

        {/* Outline18 - 18-sided decorative outline */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-240 -240 480 480"
          style={{
            position: "absolute",
            ...outline18S,
            pointerEvents: "none",
          }}
        >
          <defs>
            {/* Cuivre sobre */}
            <linearGradient id="copperClean" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2b97a"/>
              <stop offset="35%" stopColor="#b07a3a"/>
              <stop offset="65%" stopColor="#7a4a22"/>
              <stop offset="100%" stopColor="#e8c48a"/>
            </linearGradient>
            {/* Néon bleu */}
            <linearGradient id="neonBlue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9be7ff"/>
              <stop offset="50%" stopColor="#3db9ff"/>
              <stop offset="100%" stopColor="#9be7ff"/>
            </linearGradient>
            {/* Glow néon (ultra fin, animé) */}
            <filter id="neonGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.6">
                <animate attributeName="stdDeviation" values="1.4;2.4;1.4" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
              </feGaussianBlur>
            </filter>
          </defs>
          {/* OUTLINE UNIQUE — 18 côtés */}
          <g>
            {/* Contour cuivre */}
            <path
              d="M -138.564 -160 L -138.564 -80 L -207.846 -40 L -207.846 40 L -138.564 80 L -138.564 160 L -69.282 200 L 0 160 L 69.282 200 L 138.564 160 L 138.564 80 L 207.846 40 L 207.846 -40 L 138.564 -80 L 138.564 -160 L 69.282 -200 L 0 -160 L -69.282 -200 Z"
              fill="none"
              stroke="url(#copperClean)"
              strokeWidth="11"
              strokeLinejoin="miter"
              vectorEffect="non-scaling-stroke"
              shapeRendering="geometricPrecision"
            />
            {/* Néon bleu — glow */}
            <path
              d="M -138.564 -160 L -138.564 -80 L -207.846 -40 L -207.846 40 L -138.564 80 L -138.564 160 L -69.282 200 L 0 160 L 69.282 200 L 138.564 160 L 138.564 80 L 207.846 40 L 207.846 -40 L 138.564 -80 L 138.564 -160 L 69.282 -200 L 0 -160 L -69.282 -200 Z"
              fill="none"
              stroke="url(#neonBlue)"
              strokeWidth="2.6"
              strokeLinejoin="miter"
              vectorEffect="non-scaling-stroke"
              filter="url(#neonGlow)"
              opacity="0.65"
            >
              <animate attributeName="opacity" values="0.4;0.75;0.4" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
            </path>
            {/* Néon bleu — cœur */}
            <path
              d="M -138.564 -160 L -138.564 -80 L -207.846 -40 L -207.846 40 L -138.564 80 L -138.564 160 L -69.282 200 L 0 160 L 69.282 200 L 138.564 160 L 138.564 80 L 207.846 40 L 207.846 -40 L 138.564 -80 L 138.564 -160 L 69.282 -200 L 0 -160 L -69.282 -200 Z"
              fill="none"
              stroke="#c9f4ff"
              strokeWidth="1"
              strokeLinejoin="miter"
              vectorEffect="non-scaling-stroke"
              opacity="0.85"
            >
              <animate attributeName="opacity" values="0.55;0.95;0.55" dur="2.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
            </path>
          </g>
        </svg>

        {/* Outline30 - 30-sided SILVER decorative outline */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-420 -420 840 840"
          style={{
            ...outline30S,
            pointerEvents: "none",
          }}
        >
          <defs>
            <linearGradient id="silverClean" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f2f4f7"/>
              <stop offset="35%" stopColor="#b7bec8"/>
              <stop offset="65%" stopColor="#7f8793"/>
              <stop offset="100%" stopColor="#f7f9fb"/>
            </linearGradient>

            <linearGradient id="neonIce" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c9f6ff"/>
              <stop offset="50%" stopColor="#45d6ff"/>
              <stop offset="100%" stopColor="#c9f6ff"/>
            </linearGradient>

            <filter id="iceGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.4">
                <animate attributeName="stdDeviation"
                         values="1.1;2.1;1.1"
                         dur="2.8s"
                         repeatCount="indefinite"
                         calcMode="spline"
                         keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
              </feGaussianBlur>
            </filter>
          </defs>

          <g>
            <path d="M -138.564 -320 L -69.282 -280 L 0 -320 L 69.282 -280 L 138.564 -320 L 207.846 -280 L 207.846 -200 L 277.128 -160 L 277.128 -80 L 346.410 -40 L 346.410 40 L 277.128 80 L 277.128 160 L 207.846 200 L 207.846 280 L 138.564 320 L 69.282 280 L 0 320 L -69.282 280 L -138.564 320 L -207.846 280 L -207.846 200 L -277.128 160 L -277.128 80 L -346.410 40 L -346.410 -40 L -277.128 -80 L -277.128 -160 L -207.846 -200 L -207.846 -280 Z"
                  fill="none" stroke="url(#silverClean)" strokeWidth="10"
                  strokeLinejoin="miter" vectorEffect="non-scaling-stroke"
                  shapeRendering="geometricPrecision"/>

            <path d="M -138.564 -320 L -69.282 -280 L 0 -320 L 69.282 -280 L 138.564 -320 L 207.846 -280 L 207.846 -200 L 277.128 -160 L 277.128 -80 L 346.410 -40 L 346.410 40 L 277.128 80 L 277.128 160 L 207.846 200 L 207.846 280 L 138.564 320 L 69.282 280 L 0 320 L -69.282 280 L -138.564 320 L -207.846 280 L -207.846 200 L -277.128 160 L -277.128 80 L -346.410 40 L -346.410 -40 L -277.128 -80 L -277.128 -160 L -207.846 -200 L -207.846 -280 Z"
                  fill="none" stroke="url(#neonIce)" strokeWidth="2.2"
                  strokeLinejoin="miter" vectorEffect="non-scaling-stroke"
                  filter="url(#iceGlow)" opacity="0.55">
              <animate attributeName="opacity"
                       values="0.32;0.65;0.32"
                       dur="2.8s" repeatCount="indefinite"
                       calcMode="spline"
                       keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
            </path>

            <path d="M -138.564 -320 L -69.282 -280 L 0 -320 L 69.282 -280 L 138.564 -320 L 207.846 -280 L 207.846 -200 L 277.128 -160 L 277.128 -80 L 346.410 -40 L 346.410 40 L 277.128 80 L 277.128 160 L 207.846 200 L 207.846 280 L 138.564 320 L 69.282 280 L 0 320 L -69.282 280 L -138.564 320 L -207.846 280 L -207.846 200 L -277.128 160 L -277.128 80 L -346.410 40 L -346.410 -40 L -277.128 -80 L -277.128 -160 L -207.846 -200 L -207.846 -280 Z"
                  fill="none" stroke="#eafcff" strokeWidth="0.9"
                  strokeLinejoin="miter" vectorEffect="non-scaling-stroke"
                  opacity="0.78">
              <animate attributeName="opacity"
                       values="0.55;0.9;0.55"
                       dur="2.8s" repeatCount="indefinite"
                       calcMode="spline"
                       keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
            </path>
          </g>
        </svg>

        {/* Outline42 - 42-sided GOLD decorative outline */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-560 -560 1120 1120"
          style={{
            ...outline42S,
            pointerEvents: "none",
          }}
        >
          <defs>
            {/* Or */}
            <linearGradient id="goldClean42" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff4cc"/>
              <stop offset="35%" stopColor="#e6c97a"/>
              <stop offset="65%" stopColor="#b89b3c"/>
              <stop offset="100%" stopColor="#fff7d6"/>
            </linearGradient>
            {/* 🔵 Bleu fort mais fin */}
            <linearGradient id="neonBlueStrong" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8fdcff"/>
              <stop offset="50%" stopColor="#2aaeff"/>
              <stop offset="100%" stopColor="#8fdcff"/>
            </linearGradient>
            {/* Glow bleu */}
            <filter id="neonGlowStrong" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.2">
                <animate attributeName="stdDeviation"
                         values="1.8;3;1.8"
                         dur="2.8s"
                         repeatCount="indefinite"
                         calcMode="spline"
                         keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"/>
              </feGaussianBlur>
            </filter>
          </defs>
          <g>
            {/* Or */}
            <path
              d="M -207.846 -440 L -138.564 -400 L -69.282 -440 L 0 -400 L 69.282 -440 L 138.564 -400 L 207.846 -440 L 277.128 -400 L 277.128 -320 L 346.410 -280 L 346.410 -200 L 415.692 -160 L 415.692 -80 L 484.974 -40 L 484.974 40 L 415.692 80 L 415.692 160 L 346.410 200 L 346.410 280 L 277.128 320 L 277.128 400 L 207.846 440 L 138.564 400 L 69.282 440 L 0 400 L -69.282 440 L -138.564 400 L -207.846 440 L -277.128 400 L -277.128 320 L -346.410 280 L -346.410 200 L -415.692 160 L -415.692 80 L -484.974 40 L -484.974 -40 L -415.692 -80 L -415.692 -160 L -346.410 -200 L -346.410 -280 L -277.128 -320 L -277.128 -400 Z"
              fill="none"
              stroke="url(#goldClean42)"
              strokeWidth="9"
              vectorEffect="non-scaling-stroke"/>
            {/* 🔵 Bleu ajusté */}
            <path
              d="M -207.846 -440 L -138.564 -400 L -69.282 -440 L 0 -400 L 69.282 -440 L 138.564 -400 L 207.846 -440 L 277.128 -400 L 277.128 -320 L 346.410 -280 L 346.410 -200 L 415.692 -160 L 415.692 -80 L 484.974 -40 L 484.974 40 L 415.692 80 L 415.692 160 L 346.410 200 L 346.410 280 L 277.128 320 L 277.128 400 L 207.846 440 L 138.564 400 L 69.282 440 L 0 400 L -69.282 440 L -138.564 400 L -207.846 440 L -277.128 400 L -277.128 320 L -346.410 280 L -346.410 200 L -415.692 160 L -415.692 80 L -484.974 40 L -484.974 -40 L -415.692 -80 L -415.692 -160 L -346.410 -200 L -346.410 -280 L -277.128 -320 L -277.128 -400 Z"
              fill="none"
              stroke="url(#neonBlueStrong)"
              strokeWidth="2.4"
              vectorEffect="non-scaling-stroke"
              filter="url(#neonGlowStrong)"
              opacity="0.85">
              <animate attributeName="opacity"
                       values="0.65;0.95;0.65"
                       dur="2.8s"
                       repeatCount="indefinite"/>
            </path>
          </g>
        </svg>

        <svg ref={svgRef} width={BASE_W} height={BASE_H} style={{ position: "absolute", inset: 0, zIndex: 10, touchAction: "manipulation" }} />

        <div style={{
          position: "absolute",
          ...statusS,
          transform: `scale(${(layout.statusBar?.fontScale || 1) * (textCfg.statusScale || 1) * (textCfg.globalScale || 1)})`,
          transformOrigin: "left bottom",
          fontFamily: "'Press Start 2P', monospace",
          color: cgOk ? "#33ff66" : "#ff4444",
          textShadow: cgOk ? "0 0 6px rgba(50,255,120,0.35)" : "0 0 6px rgba(255,70,70,0.35)",
          lineHeight: "18px",
          userSelect: "none",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          <div>Live • <a href="https://birdeye.so/" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>BD</a></div>
          <div>Source: {dataSource}</div>
          <div>Last update: {lastUpdateUTC}</div>
          <div>
            TTR: {TTR_IS_FORGING ? <span style={{ color: "#ffaa55" }}>FORGING</span> : `${(TTR_CAP_RAW / 1e6).toFixed(2)}M`}
            {!TTR_IS_FORGING && ttrLoading ? " • Raydium…" : ""}
          </div>
          {!TTR_IS_FORGING && ttrData?.price != null && <div style={{ opacity: 0.9 }}>Price: ${fmtPrice(ttrData.price, 8)}</div>}
          {!TTR_IS_FORGING && ttrError && <div style={{ color: "#ff8888" }}>TTR: {ttrError}</div>}

          <button
            onClick={triggerFullRefresh}
            disabled={refreshing || cooldownLeft > 0 || refreshBlockedLeft > 0}
            style={{
              marginTop: 4,
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: refreshing || cooldownLeft > 0 || refreshBlockedLeft > 0 ? "not-allowed" : "pointer",
              opacity: refreshing || cooldownLeft > 0 || refreshBlockedLeft > 0 ? 0.55 : 1,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
            }}
          >
            {refreshing
              ? "Refreshing…"
              : refreshBlockedLeft > 0
                ? `Hold ${refreshBlockedLeft}s`
                : cooldownLeft > 0
                  ? `Cooldown ${cooldownLeft}s`
                  : "Refresh Data"}
          </button>
        </div>

       {/* INFO button */}
<div
  onClick={(e) => {
    e.stopPropagation();
    markPanelOpened();
    setSelectedCoin(null);
    setClosingInfo(false);
    setLegendOpen(true);
  }}
  onMouseEnter={() => setInfoHover(true)}
  onMouseLeave={() => setInfoHover(false)}
  onTouchStart={() => setInfoHover(true)}
  onTouchEnd={() => setInfoHover(false)}
  style={{
    position: "absolute",
    ...infoBtnS,
    transform: `scale(${(layout.buttons?.info?.scale || 1) * (textCfg.globalScale || 1)})`,
    cursor: "pointer",
    touchAction: "manipulation",
  }}
  title="Legend / Scales"
>
  <img
    src={infoHover ? "/btn-info-hover.png" : "/btn-info.png"}
    alt="Info"
    className="woc-icon-btn"
    style={{ width: "100%", height: "100%" }}
    draggable={false}
  />
</div>

{/* PUMP button */}
<a
  href="https://pump.fun/coin/JAqbCrfSgN6rjXqJZ1KLC8Se3DU1BP1JoK2eAiDMpump"
  target="_blank"
  rel="noreferrer"
  onMouseEnter={() => setPumpHover(true)}
  onMouseLeave={() => setPumpHover(false)}
  onTouchStart={() => setPumpHover(true)}
  onTouchEnd={() => setPumpHover(false)}
  style={{
    position: "absolute",
    ...pumpBtnS,
    transform: `scale(${(layout.buttons?.pump?.scale || 1) * (textCfg.globalScale || 1)})`,
    cursor: "pointer",
    touchAction: "manipulation",
  }}
  title="Pump.fun"
>
  <img
    src={pumpHover ? "/btn-pump-hover.png" : "/btn-pump.png"}
    alt="Pump"
    className="woc-icon-btn"
    style={{ width: "100%", height: "100%" }}
    draggable={false}
  />
</a>

{/* X button */}
<a
  href="https://x.com/Kingnarval10307"
  target="_blank"
  rel="noreferrer"
  onMouseEnter={() => setXHover(true)}
  onMouseLeave={() => setXHover(false)}
  onTouchStart={() => setXHover(true)}
  onTouchEnd={() => setXHover(false)}
  style={{
    position: "absolute",
    ...closeBtnS,
    transform: `scale(${(layout.buttons?.close?.scale || 1) * (textCfg.globalScale || 1)})`,
    cursor: "pointer",
    touchAction: "manipulation",
  }}
  title="King Narwhal on X"
>
  <img
    src={xHover ? "/btn-x-hover.png" : "/btn-x.png"}
    alt="X"
    className="woc-icon-btn"
    style={{ width: "100%", height: "100%" }}
    draggable={false}
  />
</a>

{/* MANIFEST button */}
<div
  onClick={(e) => {
    e.stopPropagation();
    markPanelOpened();
    setSelectedCoin(null);
    setLegendOpen(false);
    setClosingInfo(false);
    setManifestOpen(true);
  }}
  onPointerDown={(e) => {
    const target = e.currentTarget;
    const baseScale = (layout.buttons?.manifest?.scale || 1) * (textCfg.globalScale || 1);
    target.style.transform = `scale(${baseScale * 1.06})`;
    setTimeout(() => {
      if (target) target.style.transform = `scale(${baseScale})`;
    }, 140);
  }}
  style={{
    position: "absolute",
    ...manifestBtnS,
    transform: `scale(${(layout.buttons?.manifest?.scale || 1) * (textCfg.globalScale || 1)})`,
    cursor: "pointer",
    touchAction: "manipulation",
    transition: "transform 140ms ease",
  }}
  title="Manifest"
>
  <img
    src="/btn-manif.png"
    alt="Manifest"
    className="woc-icon-btn"
    style={{ width: "100%", height: "100%" }}
    draggable={false}
  />
</div>

{/* INFO PANEL - Now inside wrapper */}
{selectedCoin && (() => {
  // ✅ No uiScale needed - wrapper already applies scale(x,y)
  const panelScale = (textCfg.panelScale || 1) * (textCfg.globalScale || 1);
  
  return (
  <div
    data-info-panel
    onPointerDown={(e) => e.stopPropagation()}
    style={{
      position: "absolute",
      left: "50%",
      top: infoP.top,
      transform: `translate(-50%, -50%) scale(${panelScale})`,
      transformOrigin: "center center",
      width: panelW,
      height: panelH,
      zIndex: 1000001,
      fontFamily: '"Press Start 2P", monospace',
      color: "#dfd87a",
      textShadow: "0 0 6px rgba(255,215,100,0.6)",
      pointerEvents: "auto",
      animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
      overflow: "hidden",
      boxSizing: "border-box",
    }}
  >
    <div
      className="woc-panel-inner"
      style={{
        animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
        width: "100%",
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <img
        src="/virgin-border.png"
        alt="frame"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* ✅ Text safe-zone + scroll container */}
      <div className="info-text-zone">
        <div
          className="woc-text woc-safe"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: infoP.safeAreaWidth,
            maxHeight: infoP.safeAreaHeight,
            transform: "translate(-50%, -50%)",
            overflowY: "auto",
            overflowX: "hidden",
            padding: `${infoP.paddingTop} ${infoP.paddingX} ${infoP.paddingBottom}`,
            boxSizing: "border-box",
            zIndex: 2,
            textAlign: infoP.textAlign,
            fontSize: infoP.fontSize,
            lineHeight: textCfg.lineHeight || 1.25,
          }}
        >
          <div style={{ marginBottom: 18 }}>
            <div className="woc-title" style={{ marginBottom: 10 }}>
              INFO
            </div>

            <div>Name: {selectedCoin.name}</div>

            <div>
              Mkt Cap:{" "}
              {selectedCoin.capNum > 0 ? `${(selectedCoin.capNum / 1e6).toFixed(2)}M` : "N/A"}
            </div>

            <div>
              Price:{" "}
              {(() => { const p = normalizePrice(selectedCoin?.price); return p != null && p !== 0 ? `$${fmtPrice(p, 8)}` : "N/A"; })()}
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 10, fontWeight: 800 }}>
            Price variation:
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>1H:</div>
              <div>
                %:{" "}
                {panelStats?.h1?.changePct != null
                  ? `${Number(panelStats.h1.changePct).toFixed(2)}%`
                  : "N/A"}
              </div>
              <div>High: ${fmtPrice(panelStats?.h1?.high, 8)}</div>
              <div>Low: ${fmtPrice(panelStats?.h1?.low, 8)}</div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 6 }}>24H:</div>
              <div>
                %:{" "}
                {panelStats?.h24?.changePct != null
                  ? `${Number(panelStats.h24.changePct).toFixed(2)}%`
                  : "N/A"}
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
})()}


{/* LEGEND PANEL - Now inside wrapper */}
{legendOpen && (() => {
  // ✅ No uiScale needed - wrapper already applies scale(x,y)
  const panelScale = (textCfg.legendScale || 1) * (textCfg.globalScale || 1);
  
  return (
  <div
    data-legend-panel
    onPointerDown={(e) => e.stopPropagation()}
    style={{
      position: "absolute",
      left: "50%",
      top: legendP.top,
      transform: `translate(-50%, -50%) scale(${panelScale})`,
      transformOrigin: "center center",
      width: legendW,
      height: legendH,
      "--wocTextW": legendP.safeAreaWidth,
      "--wocTextH": legendP.safeAreaHeight,
      zIndex: 1000001,
      fontFamily: "'Press Start 2P', monospace",
      color: "#ffd87a",
      textShadow: "0 0 6px rgba(255,215,100,0.6)",
      textAlign: "center",
      pointerEvents: "auto",
      animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
      overflow: "hidden",
      boxSizing: "border-box",
    }}
  >
    <div
      className="woc-panel-inner"
      style={{
        animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
        width: "100%",
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <img
        src="/virgin-border.png"
        alt="frame"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Text is confined to this zone (scroll inside) */}
      <div className="legend-text-zone"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        width: legendP.safeAreaWidth,
        maxHeight: legendP.safeAreaHeight,
        margin: "0 auto",

        paddingTop: legendP.paddingTop,
        paddingLeft: legendP.paddingX,
        paddingRight: legendP.paddingX,
        paddingBottom: legendP.paddingBottom,

        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        boxSizing: "border-box",

        overflowWrap: "anywhere",
        wordBreak: "break-word",
        hyphens: "auto",

        fontSize: legendP.fontSize,
        lineHeight: textCfg.lineHeight || 1.22,
        textAlign: legendP.textAlign,

        pointerEvents: "auto",
        zIndex: 2,
      }}>
        <div className="woc-text woc-safe" style={{ position: "relative", width: "100%", height: "100%" }}>
          <div style={{ marginBottom: 14 }}>
            <div className="woc-title">SCALES &amp; LEGEND</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 6, textDecoration: "underline" }}>CRYPTO CLUSTERS</div>
            <div>Organic sizing (continuous)</div>
            <div>Size reflects relative market cap</div>
            <div>Scales are relative to the active market window</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ marginBottom: 6, textDecoration: "underline" }}>TTR MATERIALS</div>
            <div>Core starts at 100k market cap</div>
            <div>Rings evolve with growth milestones</div>
            <div>Copper → Silver → Gold → Final</div>
          </div>

          <div>
</div>
        </div>
      </div>
    </div>
  </div>
  );
})()}

{/* MANIFEST PANEL - Image panel */}
{manifestOpen && (() => {
  const panelScale = (textCfg.panelScale || 1) * (textCfg.globalScale || 1);
  
  return (
  <div
    data-manifest-panel
    onPointerDown={(e) => e.stopPropagation()}
    style={{
      position: "absolute",
      left: "50%",
      top: manifestP.top,
      transform: `translate(-50%, -50%) scale(${panelScale})`,
      transformOrigin: "center center",
      width: manifestW,
      height: manifestH,
      zIndex: 1000001,
      pointerEvents: "auto",
      animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
      overflow: "hidden",
      boxSizing: "border-box",
    }}
  >
    <div
      className="woc-panel-inner"
      style={{
        animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
        width: "100%",
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <img
        src="/virgin-border.png"
        alt="frame"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Image safe-zone container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: manifestP.safeAreaWidth,
          height: manifestP.safeAreaHeight,
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${manifestP.paddingTop} ${manifestP.paddingX} ${manifestP.paddingBottom}`,
          boxSizing: "border-box",
          zIndex: 2,
        }}
      >
        <img
          src="/manif.png"
          alt="Manifest"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  </div>
  );
})()}

</div>

{/* GLOBAL CLICK-CLOSE OVERLAY (closes on ANY click/tap) */}

</div>
);
}