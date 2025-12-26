// pages/index.js
// War of Coins – v9.7.8 (Tahlia FINAL PATCH on your stable base)
// Goals:
// ✅ Keep ALL original UI (border, title, info panel, HUD, refresh button)
// ✅ Keep hex grid EXACTLY like v9.6 and centered
// ✅ Keep SafeZone + Debug toggle (D)
// ✅ FIX: T/G no longer refetch (no duplication glitch)
// ✅ ADD: TTR hex materials (copper/silver/gold/final) that appear when T/G changes
// ✅ CHANGE: Other-coin clusters use continuous (organic) sizing OPTION A (slow growth)
// ✅ Keep: 14-coin window around TTR by market cap (Birdeye via /api/birdeye-window)

"use client";
/* eslint-disable react-hooks/rules-of-hooks */

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { hexbin as d3Hexbin } from "d3-hexbin";
import { useGlobalScale } from "../useGlobalScale";

// ============================================================================
// Constantes
// ============================================================================
const BASE_W = 1920;
const BASE_H = 1080;

// Auto-switch scale at 10M TTR
const SCALE_SWITCH_CAP = 10_000_000;

// =======================
// TTR HEX IMAGE SCALE (VISUAL ONLY)
// =======================
const TTR_IMAGE_SCALE = {
  copper: 0.92,
  silver: 0.96,
  gold: 1.0,
  final: 1.08,
};

const WINDOW_SIZE = 14;

const MAX_TRIES_PER_CLUSTER = 1200;
const MAX_HEX_PER_CLUSTER = 19; // dense mode: keeps clusters placeable (max ~2 crowns)

// Sécurité autour des clusters (empêche qu'ils se touchent)
// 1 = laisse 1 hex de marge, 2 = marge plus grande (peut réduire la place)
const CLUSTER_BUFFER = 1;
// TTR stocké
const LS_TTRCAP = "woc_v978_ttr_cap";

// Cache fenêtre coins (Birdeye)
const SESSION_CG_DATA = "woc_v978_window_data";
const SESSION_CG_TIME = "woc_v978_window_time";

// SafeZone
const SAFEZONE_BASE = { scaleX: 2.0, scaleY: 1.13, scaleGlobal: 0.72, radius: 80 };
const SAFEZONE_OFFSET = { x: 20.5, y: 0 }; // +x = droite, +y = bas

// ============================================================================
// Helpers
// ============================================================================
const keyOf = (q, r) => `${q},${r}`;
const sleep0 = () => new Promise((r) => setTimeout(r, 0));

function drawHexImage(g, href, h, hexRadius, scale) {
  const size = hexRadius * 2 * scale;
  g.append("image")
    .attr("href", href)
    .attr("width", size)
    .attr("height", size)
    .attr("x", h.x - size / 2)
    .attr("y", h.y - size / 2)
    .style("pointer-events", "none")
    .style("image-rendering", "auto")
    .style("filter", "drop-shadow(0 0 4px rgba(0,0,0,0.35))");
}

// Dé-doublonnage robuste (Birdeye peut renvoyer des doublons : même symbol, même logo, etc.)
// Règle: on dédoublonne d'abord par SYMBOL (si dispo), sinon par (name).
// Si plusieurs entrées ont le même groupe, on garde celle avec le + gros market cap.
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
  const ax = aQ, az = aR, ay = -ax - az;
  const bx = bQ, bz = bR, by = -bx - bz;
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
// Other coins: Calcul continu (organique) – Option A (croissance lente)
// ============================================================================
function computeHexCountContinuousPrecise(capUSD) {
  // Scale PRECISE (< 10M): plus de précision (plus d'hexes pour une même cap)
  const cap = Math.max(0, Number(capUSD) || 0);
  if (cap <= 0) return { total: 3 };

  // 0.5M -> ~10-12 ; 2M -> ~16 ; 10M -> ~24-28 ; 50M -> cap max
  const x = cap / 250_000;                 // base plus fine
  const growth = Math.log10(1 + x) * 12;   // un peu plus réactif
  const raw = 3 + growth;

  const total = Math.max(3, Math.min(MAX_HEX_PER_CLUSTER, Math.round(raw)));
  return { total };
}

function computeHexCountContinuousLarge(capUSD) {
  // Scale LARGE (>= 10M): l'ancienne échelle, plus stable pour grosses caps
  const cap = Math.max(0, Number(capUSD) || 0);
  if (cap <= 0) return { total: 3 };

  // 0.5M -> ~6-7 ; 2M -> ~10 ; 10M -> ~16 ; 50M -> ~23-26
  const x = cap / 500_000;
  const growth = Math.log10(1 + x) * 10;
  const raw = 3 + growth;

  const total = Math.max(3, Math.min(MAX_HEX_PER_CLUSTER, Math.round(raw)));
  return { total };
}

function computeHexCountContinuous(capUSD, scaleMode) {
  return scaleMode === "LARGE"
    ? computeHexCountContinuousLarge(capUSD)
    : computeHexCountContinuousPrecise(capUSD);
}

// ============================================================================
// TTR: paliers fixes (hexa cuivre/silver/gold/final)
// ============================================================================
const TTR_MATS_LARGE = [
  { key: "copper", value: 100_000, fill: "#b87333", stroke: "rgba(255,170,90,0.95)" },
  { key: "silver", value: 250_000, fill: "#cfd6df", stroke: "rgba(255,255,255,0.95)" },
  { key: "gold", value: 300_000, fill: "#f2c14e", stroke: "rgba(255,230,140,0.95)" },
  { key: "final", value: 500_000, fill: "#8d7aff", stroke: "rgba(210,190,255,0.95)" },
];

const TTR_MATS_PRECISE = [
  { key: "copper", value: 50_000, fill: "#b87333", stroke: "rgba(255,170,90,0.95)" },
  { key: "silver", value: 125_000, fill: "#cfd6df", stroke: "rgba(255,255,255,0.95)" },
  { key: "gold", value: 150_000, fill: "#f2c14e", stroke: "rgba(255,230,140,0.95)" },
  { key: "final", value: 250_000, fill: "#8d7aff", stroke: "rgba(210,190,255,0.95)" },
];

function getTtrMats(scaleMode) {
  return scaleMode === "LARGE" ? TTR_MATS_LARGE : TTR_MATS_PRECISE;
}

function computeTtrMaterials(capUSD, scaleMode) {
  const cap = Math.max(0, Number(capUSD) || 0);
  const matsTable = getTtrMats(scaleMode);
  const byKey = Object.fromEntries(matsTable.map((m) => [m.key, m]));

  // Ring material rule:
  // - Center + first crown: copper
  // - Second crown: silver
  // - Third crown: gold
  // - Fourth crown and beyond: final
  function keyForRingDist(dist) {
    if (dist <= 1) return "copper";
    if (dist === 2) return "silver";
    if (dist === 3) return "gold";
    return "final";
  }

  // Build in spiral order, filling until we reach the cap (visual approximation),
  // while keeping the crown material rule above.
  const spiral = genSpiralAxialPositions(61);
  const mats = [];

  let acc = 0;
  for (let i = 0; i < spiral.length; i++) {
    const [dq, dr] = spiral[i];
    const dist = axialDistance(0, 0, dq, dr);
    const key = keyForRingDist(dist);
    const mat = byKey[key] || byKey.copper;

    // Always render at least 1 hex (center)
    if (i === 0) {
      mats.push(mat);
      acc += mat.value;
      continue;
    }

    if (acc >= cap) break;
    mats.push(mat);
    acc += mat.value;
  }

  return mats.slice(0, 61);
}

// ============================================================================
// Fetch cryptos depuis Birdeye (via API interne /api/birdeye-window)
// ============================================================================
async function fetchWindowCoins() {
  try {
    const res = await fetch("/api/birdeye-window");
    if (!res.ok) {
      console.error("Birdeye window HTTP error:", res.status);
      return {
        source: "Birdeye (no data)",
        coins: [],
      };
    }

    const json = await res.json();
    if (!json || !Array.isArray(json.coins)) {
      console.error("Birdeye window bad json:", json);
      return {
        source: "Birdeye (bad json)",
        coins: [],
      };
    }

    return {
      source: json.source || "Birdeye Token List (BDS)",
      coins: json.coins,
    };
  } catch (e) {
    console.error("Birdeye window fetch failed:", e);
    return {
      source: "Birdeye (fetch failed)",
      coins: [],
    };
  }
}

// ============================================================================
// Composant principal
// ============================================================================
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { x, y } = useGlobalScale();

  const svgRef = useRef(null);
  const renderIdRef = useRef(0); // anti-superposition (annule les rendus async précédents)
  const [showDebug, setShowDebug] = useState(false);

  const [coinsAll, setCoinsAll] = useState([]);
  const [coins, setCoins] = useState([]);

  const [ttrCap, setTtrCap] = useState(() => {
    if (typeof window === "undefined") return 1_000_000;
    try {
      return Number(localStorage.getItem(LS_TTRCAP)) || 1_000_000;
    } catch {
      return 1_000_000;
    }
  });

  const [selectedCoin, setSelectedCoin] = useState(null);
  const [closingInfo, setClosingInfo] = useState(false);

  const [legendOpen, setLegendOpen] = useState(false);
  const [cgOk, setCgOk] = useState(false);
  const [lastUpdateUTC, setLastUpdateUTC] = useState("…");
  const [dataSource, setDataSource] = useState("Birdeye (loading)");
  const [isMobile, setIsMobile] = useState(false);

  // Pour éviter double-init de StrictMode sur le fetch initial
  const didInitFetch = useRef(false);

  // --- helper : refresh complet (bouton Refresh + timer) ---
  async function triggerFullRefresh() {
    try {
      const { source, coins } = await fetchWindowCoins();
      setCoinsAll(dedupeBestByGroup(coins));
      setDataSource(source);
      const now = Date.now();
      if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_CG_DATA, JSON.stringify({ source, coins }));
        sessionStorage.setItem(SESSION_CG_TIME, String(now));
      }
      setLastUpdateUTC(new Date(now).toUTCString().slice(17, 22) + " UTC");
      setCgOk(true);
    } catch (e) {
      console.error(e);
      setCgOk(false);
    }
  }

  // Listeners clavier + resize
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "d") setShowDebug((v) => !v);
      if (k === "escape") { setLegendOpen(false); setSelectedCoin(null); }

      // ✅ FIX: T/G change ONLY ttrCap (NO REFRESH) -> no duplication glitch
      if (k === "t") setTtrCap((v) => Math.round(v * 1.2));
      if (k === "g") setTtrCap((v) => Math.max(1, Math.round(v / 1.2)));
    };

    const onResize = () => setIsMobile(window.innerWidth < 800);
    if (typeof window !== "undefined") {
      onResize();
      window.addEventListener("keydown", onKey);
      window.addEventListener("resize", onResize);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("resize", onResize);
      }
    };
  }, []);

  // Persist TTR
  useEffect(() => {
    try {
      localStorage.setItem(LS_TTRCAP, String(ttrCap));
    } catch {}
  }, [ttrCap]);

  // Fetch initial (cache 15 min) + auto-refresh 5 min
  useEffect(() => {
    if (didInitFetch.current) return;
    didInitFetch.current = true;

    let cancelled = false;

    async function load(fromTimer = false) {
      try {
        const cached =
          typeof window !== "undefined" ? sessionStorage.getItem(SESSION_CG_DATA) : null;
        const cachedAt =
          typeof window !== "undefined" ? Number(sessionStorage.getItem(SESSION_CG_TIME) || 0) : 0;
        const fresh = cached && cachedAt && Date.now() - cachedAt < 15 * 60 * 1000;

        if (!fromTimer && fresh) {
          const parsed = JSON.parse(cached);
          const list = parsed.coins || parsed;
          if (!cancelled) {
            setCoinsAll(dedupeBestByGroup(list));
            setDataSource(parsed.source || "Birdeye Token List (cache)");
            setCgOk(true);
            setLastUpdateUTC(new Date(cachedAt).toUTCString().slice(17, 22) + " UTC");
          }
          return;
        }

        const { source, coins } = await fetchWindowCoins();
        if (!cancelled) {
          setCoinsAll(dedupeBestByGroup(coins));
          setDataSource(source);
          const now = Date.now();
          if (typeof window !== "undefined") {
            sessionStorage.setItem(SESSION_CG_DATA, JSON.stringify({ source, coins }));
            sessionStorage.setItem(SESSION_CG_TIME, String(now));
          }
          setLastUpdateUTC(new Date(now).toUTCString().slice(17, 22) + " UTC");
          setCgOk(true);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setCgOk(false);
      }
    }

    load(false);
    const id = setInterval(() => load(true), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Fenêtre de 14 cryptos — QUOTAS FIXES autour du TTR (carte lisible, tailles variées)
  // Répartition demandée:
  // - 2 coins en dessous du TTR
  // - 3 coins au même niveau (proches) du TTR
  // - 6 coins au-dessus du TTR
  // - 3 coins bien au-dessus (empires rares)
  //
  // + Anti micro-caps quand le TTR est haut: floor dynamique
  // + Fenêtre haute large pour trouver des empires
  useEffect(() => {
    if (!coinsAll || coinsAll.length === 0) {
      setCoins([]);
      return;
    }

    const ABS_MIN_CAP = 500_000;
    const ABS_MAX_CAP = 50_000_000;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const safeTTR = Math.max(1, Number(ttrCap || 1));

    // Floor dynamique: coupe les très petits coins quand le TTR est déjà "gros"
    const FLOOR_RATIO = safeTTR >= 2_000_000 ? 0.5 : 0.0;
    const minCapDyn = Math.max(ABS_MIN_CAP, FLOOR_RATIO > 0 ? safeTTR * FLOOR_RATIO : ABS_MIN_CAP);

    // Fenêtre haute: on autorise des coins bien au-dessus du TTR, clamp 50M (Birdeye)
    const MAX_ABOVE_RATIO = 2.1; // plafond dur (ex: TTR 3M -> max ~6.3M)
    const maxCapDyn = clamp(Math.max(safeTTR * MAX_ABOVE_RATIO, 2_000_000), ABS_MIN_CAP, ABS_MAX_CAP);

    // 1) Dédoublonnage + cap valide + fenêtre dynamique
    const uniqueAll = dedupeBestByGroup(coinsAll).filter((c) => {
      const cap = Number(c?.capNum ?? 0) || 0;
      return cap > 0 && cap >= minCapDyn && cap <= maxCapDyn;
    });

    // 2) Tri stable par cap croissante
    const byCap = [...uniqueAll].sort((a, b) => {
      const ca = Number(a.capNum ?? 0) || 0;
      const cb = Number(b.capNum ?? 0) || 0;
      if (ca !== cb) return ca - cb;
      const sa = normSym(a) || normName(a);
      const sb = normSym(b) || normName(b);
      return sa.localeCompare(sb);
    });

    const selected = [];
    const seen = new Set();

    function tryAdd(c) {
      if (!c) return false;
      const k = groupKey(c);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      selected.push(c);
      return true;
    }

    function takeQuantiles(list, n) {
      if (!list.length || n <= 0) return;
      if (list.length <= n) {
        for (const c of list) {
          if (selected.length >= WINDOW_SIZE) return;
          tryAdd(c);
        }
        return;
      }
      for (let i = 0; i < n; i++) {
        if (selected.length >= WINDOW_SIZE) return;
        const idx = Math.floor(((i + 0.5) * list.length) / n);
        tryAdd(list[Math.min(list.length - 1, Math.max(0, idx))]);
      }
      for (const c of list) {
        if (selected.length >= WINDOW_SIZE) return;
        tryAdd(c);
      }
    }

    // 3) Buckets en ratio cap/TTR + quotas fixes (14)
    // Ajustables facilement sans toucher au visuel.
    const buckets = [
      // Below TTR (2)
      { lo: 0.55, hi: 0.95, take: 2, name: "below" },

      // Near TTR (3)
      { lo: 0.95, hi: 1.15, take: 3, name: "near" },

      // Above TTR (6)
      { lo: 1.15, hi: 1.65, take: 6, name: "above" },

      // Far Above / Empires (3) — rares
      { lo: 1.65, hi: 2.10, take: 3, name: "empire" },
    ];

    for (const b of buckets) {
      if (selected.length >= WINDOW_SIZE) break;

      const minCap = clamp(b.lo * safeTTR, minCapDyn, ABS_MAX_CAP);
      const maxCap = clamp(b.hi * safeTTR, minCapDyn, ABS_MAX_CAP);

      const lo = Math.min(minCap, maxCap);
      const hi = Math.max(minCap, maxCap) + 1;

      const bucket = byCap.filter((c) => {
        const cap = Number(c?.capNum ?? 0) || 0;
        // Respect strict des côtés
        if (b.name === "below" && cap >= safeTTR) return false;
        if ((b.name === "near" || b.name === "above" || b.name === "empire") && cap < safeTTR && b.name !== "near") return false;
        return cap >= lo && cap < hi;
      });

      takeQuantiles(bucket, b.take);
    }

    // 4) Fallback: si une bande manque de candidats, on complète en priorité dans l'ordre:
    // empire -> above -> near -> below (pour garder la carte "tirée vers le haut")
    if (selected.length < WINDOW_SIZE) {
      const remaining = byCap.filter((c) => {
        const k = groupKey(c);
        return k && !seen.has(k);
      });

      const empire = remaining.filter((c) => (Number(c.capNum) || 0) >= safeTTR * 2.5);
      const above = remaining.filter((c) => (Number(c.capNum) || 0) >= safeTTR && (Number(c.capNum) || 0) < safeTTR * 2.5);
      const near = remaining.filter((c) => {
        const cap = Number(c.capNum) || 0;
        return cap >= safeTTR * 0.95 && cap < safeTTR * 1.15;
      });
      const below = remaining.filter((c) => (Number(c.capNum) || 0) < safeTTR * 0.95);

      const need = WINDOW_SIZE - selected.length;
      // on ajoute en quantiles pour garder de la variété
      takeQuantiles(empire, Math.min(need, 6));
      if (selected.length < WINDOW_SIZE) takeQuantiles(above, Math.min(WINDOW_SIZE - selected.length, 8));
      if (selected.length < WINDOW_SIZE) takeQuantiles(near, Math.min(WINDOW_SIZE - selected.length, 6));
      if (selected.length < WINDOW_SIZE) takeQuantiles(below, Math.min(WINDOW_SIZE - selected.length, 6));
    }

    // dernier filet
    if (selected.length < WINDOW_SIZE) {
      const remaining = byCap.filter((c) => {
        const k = groupKey(c);
        return k && !seen.has(k);
      });
      for (const c of remaining) {
        if (selected.length >= WINDOW_SIZE) break;
        tryAdd(c);
      }
    }

    // 5) Enforcement: majorité AU-DESSUS du TTR
    // Cible: 9/14 >= TTR (6 au-dessus + 3 empires)
    const TARGET_ABOVE = 9;
    const capOf = (c) => Number(c?.capNum ?? 0) || 0;

    const aboveCount = selected.filter((c) => capOf(c) >= safeTTR && capOf(c) <= safeTTR * MAX_ABOVE_RATIO).length;
    if (aboveCount < TARGET_ABOVE) {
      const poolAbove = byCap
        .filter((c) => capOf(c) >= safeTTR)
        .filter((c) => {
          const k = groupKey(c);
          return k && !seen.has(k);
        })
        .sort((a, b) => capOf(b) - capOf(a));

      const victims = selected
        .map((c, i) => ({ i, cap: capOf(c) }))
        .sort((a, b) => a.cap - b.cap); // plus petits d'abord

      let need = TARGET_ABOVE - aboveCount;
      for (const pick of poolAbove) {
        if (need <= 0) break;
        const victim = victims.find((v) => capOf(selected[v.i]) < safeTTR);
        if (!victim) break;
        selected[victim.i] = pick;
        seen.add(groupKey(pick));
        need--;
      }
    }

    // 6) Diversité: si tout est trop proche, injecte un gros empire
    const caps = selected.map(capOf).filter((v) => v > 0).sort((a, b) => a - b);
    const minC = caps[0] || 0;
    const maxC = caps[caps.length - 1] || 0;
    const spread = minC > 0 ? maxC / minC : 0;

    if (spread < 3.0) {
      const candidateBig = byCap
        .filter((c) => capOf(c) >= safeTTR * 1.65 && capOf(c) <= safeTTR * MAX_ABOVE_RATIO)
        .sort((a, b) => capOf(b) - capOf(a))
        .find((c) => {
          const k = groupKey(c);
          return k && !seen.has(k);
        });

      if (candidateBig) {
        let minIdx = 0;
        for (let i = 1; i < selected.length; i++) {
          if (capOf(selected[i]) < capOf(selected[minIdx])) minIdx = i;
        }
        selected[minIdx] = candidateBig;
        seen.add(groupKey(candidateBig));
      }
    }

    setCoins(selected.slice(0, WINDOW_SIZE));
  }, [coinsAll, ttrCap]);

  // ========================================================================
  // Rendu D3
  // ========================================================================
  useEffect(() => {
    if (!mounted) return;
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const myRenderId = ++renderIdRef.current;
    const isStale = () => myRenderId !== renderIdRef.current;

    const width = BASE_W;
    const height = BASE_H;

    const scaleMode = "LARGE"; // forced (TTR always LARGE)
    const hexRadius = 30; // keep exactly like v9.6
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

    // Grille hexagonale (fond)
    svg
      .append("g")
      .selectAll("path")
      .data(hexList)
      .enter()
      .append("path")
      .attr("d", hexbin.hexagon())
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("fill", "rgba(255,255,255,0.03)")
      .attr("stroke", "rgba(255,255,255,0.07)")
      .attr("stroke-width", 0.6);

    // Hex le plus au centre (pour TTR-Core ET safezone)
    const ttrHex = hexList.reduce((prev, curr) =>
      Math.hypot(curr.x - width / 2, curr.y - height / 2) <
      Math.hypot(prev.x - width / 2, prev.y - height / 2)
        ? curr
        : prev
    );
    const centerXGrid = ttrHex.x;
    const centerYGrid = ttrHex.y;

    // SafeZone
    const baseSize = Math.min(width, height) * SAFEZONE_BASE.scaleGlobal;
    const rectW = baseSize * SAFEZONE_BASE.scaleX;
    const rectH = baseSize * SAFEZONE_BASE.scaleY;
    const rectX = centerXGrid - rectW / 2 + SAFEZONE_OFFSET.x;
    const rectY = centerYGrid - rectH / 2 + SAFEZONE_OFFSET.y;
    const radius = SAFEZONE_BASE.radius;

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

    const safeZonePath = roundedRectPath(rectX, rectY, rectW, rectH, radius);

    const marginHex = hexRadius;
    const rectSafeX = rectX + marginHex;
    const rectSafeY = rectY + marginHex;
    const rectSafeW = rectW - marginHex * 2;
    const rectSafeH = rectH - marginHex * 2;

    // Debug assert (console) si un hex touche/sort la zone violette
    const DEBUG_SAFE_ASSERT = false;

    function pointInSafe(px, py) {
      return (
        px >= rectSafeX &&
        px <= rectSafeX + rectSafeW &&
        py >= rectSafeY &&
        py <= rectSafeY + rectSafeH
      );
    }

    const defsOverlay = svg.append("defs");
    defsOverlay
      .append("mask")
      .attr("id", "mask-outside")
      .html(`
      <rect width="${width}" height="${height}" fill="white" />
      <path d="${safeZonePath}" fill="black" />
    `);
    const blurFilter = defsOverlay.append("filter").attr("id", "blur8");
    blurFilter.append("feGaussianBlur").attr("stdDeviation", 8);

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "rgba(8,10,18,0.6)")
      .attr("filter", "url(#blur8)")
      .attr("mask", "url(#mask-outside)");

    if (showDebug) {
      svg
        .append("path")
        .attr("d", safeZonePath)
        .attr("fill", "none")
        .attr("stroke", "#ff4040")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "8 5");
      svg
        .append("rect")
        .attr("x", rectSafeX)
        .attr("y", rectSafeY)
        .attr("width", rectSafeW)
        .attr("height", rectSafeH)
        .attr("fill", "none")
        .attr("stroke", "violet")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4 6");
    }

    const axialValues = Array.from(axialMap.values());
    const innerCandidates = axialValues.filter((v) => pointInSafe(v.x, v.y));

    const palette = d3.schemeTableau10;
    const clusters = [];
    const occupied = new Set(); // réserve (hex + marge) pour empêcher les clusters de se toucher

    function reserveWithBuffer(q, r, radius) {
      for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
          if (axialDistance(0, 0, dq, dr) <= radius) {
            occupied.add(keyOf(q + dq, r + dr));
          }
        }
      }
    }

    async function placeAll() {
      const list = (coins || [])
        .map((p, idx) => {
          const { total: hexTarget } = computeHexCountContinuous(p.capNum, scaleMode);
          return { p, idx, hexTarget };
        })
        .sort((a, b) => b.hexTarget - a.hexTarget);

      for (const { p, idx, hexTarget } of list) {
        if (isStale()) return;

        let placed = false;

        // --- Placement robuste: centres répartis dans toute la SafeZone (pas seulement proche du centre)
        // + Stratégie de shrink: si le cluster est trop grand pour rentrer, on réduit progressivement.
        const centerPool = innerCandidates.length ? innerCandidates.slice() : axialValues.slice();

        // Shuffle
        for (let i = centerPool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = centerPool[i];
          centerPool[i] = centerPool[j];
          centerPool[j] = tmp;
        }

        // Mix "loin/proche" pour éviter l'alignement et mieux remplir la zone
        centerPool.sort((a, b) => {
          const da = Math.hypot(a.x - centerXGrid, a.y - centerYGrid);
          const db = Math.hypot(b.x - centerXGrid, b.y - centerYGrid);
          return (Math.random() - 0.5) + (da - db) * 0.00015;
        });

        const baseSize = Math.min(hexTarget, MAX_HEX_PER_CLUSTER);
        const sizes = [
          baseSize,
          Math.max(3, Math.floor(baseSize * 0.82)),
          Math.max(3, Math.floor(baseSize * 0.65)),
          7,
          3,
        ];
        const uniqSizes = Array.from(new Set(sizes.filter((n) => Number.isFinite(n) && n >= 1)));

        for (const size of uniqSizes) {
          if (placed || isStale()) break;

          const spiral = genSpiralAxialPositions(size);

          // On essaie beaucoup de centres pour atteindre 14 clusters dans la SafeZone
          const MAX_CENTER_TRIES = Math.min(900, centerPool.length);

          for (let ci = 0; ci < MAX_CENTER_TRIES; ci++) {
            if (isStale()) return;

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
              if (!h) {
                valid = false;
                break;
              }
              if (occupied.has(k)) {
                valid = false;
                break;
              }
              // Safe ring autour du TTR
              if (axialDistance(q, r, ttrHex.q, ttrHex.r) < 4) {
                valid = false;
                break;
              }
              // Hard lock safezone
              const corners = hexCorners(h.x, h.y, hexRadius);
              let inside = 0;
              for (const [px, py] of corners) {
                if (pointInSafe(px, py)) inside++;
              }
              if (inside < 4) {
                valid = false;
                break;
              }
              hexes.push({ x: h.x, y: h.y, q, r });
            }

            if (!valid) continue;

            // Reserve occupancy WITH buffer (ring around cluster) — une fois validé
            for (const h of hexes) reserveWithBuffer(h.q, h.r, CLUSTER_BUFFER);

            clusters.push({
              id: idx,
              ...p,
              color: palette[idx % palette.length],
              hexes,
              centerX: centerCandidate.x,
              centerY: centerCandidate.y,
            });

            placed = true;
            break;
          }
        }

        if (!placed) {
          // Hard lock SafeZone : si on ne peut pas placer le cluster proprement,
          // on le SKIP (plutôt que de le poser hors zone).
          // console.warn("CLUSTER SKIPPED (no safe space):", p?.symbol || p?.name);
          continue;
        }
      }
    }

    (async () => {

      // --------------------------------------------------------------------
// 3) TTR core (halo premium)
// --------------------------------------------------------------------
const defsTTR = svg.append("defs");

// --- Glow filter (blur) ---
const glow = defsTTR.append("filter").attr("id", "ttr-glow");
glow.append("feGaussianBlur").attr("stdDeviation", 6).attr("result", "blur");
const merge = glow.append("feMerge");
merge.append("feMergeNode").attr("in", "blur");
merge.append("feMergeNode").attr("in", "SourceGraphic");

// --- Gradient halo (gold -> orange -> violet edge) ---
const gradTTR = defsTTR
  .append("radialGradient")
  .attr("id", "grad-ttr-halo-premium")
  .attr("cx", "50%")
  .attr("cy", "50%")
  .attr("r", "70%");

gradTTR.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff").attr("stop-opacity", 0.85);
gradTTR.append("stop").attr("offset", "35%").attr("stop-color", "#ffd36a").attr("stop-opacity", 0.55);
gradTTR.append("stop").attr("offset", "70%").attr("stop-color", "#ff8a2a").attr("stop-opacity", 0.28);
gradTTR.append("stop").attr("offset", "100%").attr("stop-color", "#8d7aff").attr("stop-opacity", 0.18);

// --- TTR info (for info panel) ---
const ttrInfo = {
  id: "TTR",
  name: "TTR – War of Coins",
  symbol: "TTR",
  capNum: ttrCap,
  price: "En attente",
  pct1y: "N/A",
  pct30: "N/A",
  pct7: "N/A",
  pct24: "N/A",
};

// --- TTR group ---
const ttr = svg.append("g").attr("class", "ttr-core").style("cursor", "pointer");

// BIG soft glow (behind)
ttr.append("circle")
  .attr("cx", centerXGrid)
  .attr("cy", centerYGrid)
  .attr("r", 74)
  .attr("fill", "url(#grad-ttr-halo-premium)")
  .attr("opacity", 0.22)
  .attr("filter", "url(#ttr-glow)");

// Secondary glow (tighter)
ttr.append("circle")
  .attr("cx", centerXGrid)
  .attr("cy", centerYGrid)
  .attr("r", 60)
  .attr("fill", "url(#grad-ttr-halo-premium)")
  .attr("opacity", 0.22)
  .attr("filter", "url(#ttr-glow)");

// Thin premium ring
const ring = ttr.append("circle")
  .attr("cx", centerXGrid)
  .attr("cy", centerYGrid)
  .attr("r", 56)
  .attr("fill", "none")
  .attr("stroke", "url(#grad-ttr-halo-premium)")
  .attr("stroke-width", 3.2)
  .attr("opacity", 0.78)
  .attr("filter", "url(#ttr-glow)");

// Inner glass disc
ttr.append("circle")
  .attr("cx", centerXGrid)
  .attr("cy", centerYGrid)
  .attr("r", 46)
  .attr("fill", "url(#grad-ttr-halo-premium)")
  .attr("opacity", 0.18);

// Core image
ttr.append("image")
  .attr("xlink:href", "/ttr-core.png")
  .attr("width", 70)
  .attr("height", 70)
  .attr("x", centerXGrid - 35)
  .attr("y", centerYGrid - 35);
      // --------------------------------------------------------------------
      // 1) TTR hex materials (draw AFTER grid & blur, BEFORE clusters)
      // --------------------------------------------------------------------
      const ttrMats = computeTtrMaterials(ttrCap, scaleMode);
      const ttrSpiral = genSpiralAxialPositions(Math.min(ttrMats.length, 61));
      const ttrGroup = svg.append("g").attr("class", "ttr-materials");

      ttrSpiral.forEach(([dq, dr], i) => {
  if (i === 0) return; // ✅ skip center hex (no copper on core)

  const mat = ttrMats[i];
  const q = ttrHex.q + dq;
  const r = ttrHex.r + dr;
  const h = axialMap.get(keyOf(q, r));
  if (!h) return;

  



        ttrGroup
          .append("path")
          .attr("d", hexbin.hexagon())
          .attr("transform", `translate(${h.x},${h.y})`)
          .attr("fill", "rgba(0,0,0,0)")
          .attr("stroke", mat.stroke)
          .attr("stroke-width", 1.25)
          .attr("opacity", 0.95);

        // Overlay the textured hex image (visual scale controlled by TTR_IMAGE_SCALE)
        const ttrHref = mat.key === "copper"
          ? "/hexacuivre.png"
          : mat.key === "silver"
          ? "/hexasilver.png"
          : mat.key === "gold"
          ? "/hexagold.png"
          : "/hexafinal.png";

        drawHexImage(ttrGroup, ttrHref, h, hexRadius, TTR_IMAGE_SCALE[mat.key] || 1.0);
      });

      // --------------------------------------------------------------------
      // 2) Place & draw coin clusters (unchanged logic, just new sizing)
      // --------------------------------------------------------------------
      if (coins && coins.length > 0) {
        await placeAll();
      }
      if (isStale()) return;

      // Dégradés clusters + respiration + transparence
      const defs = svg.append("defs");

      clusters.forEach((c) => {
        if (isStale()) return;
        const grad = defs
          .append("radialGradient")
          .attr("id", `grad-${c.id}`)
          .attr("cx", "50%")
          .attr("cy", "50%")
          .attr("r", "60%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", c.color).attr("stop-opacity", 1);
        grad
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", d3.color(c.color).darker(2))
          .attr("stop-opacity", 0.85);

        const g = svg
          .append("g")
          .attr("class", `cluster-${c.id} cluster-breath`)
          .style("opacity", 0.80);

        c.hexes.forEach((h) => {
          g.append("path")
            .attr("d", hexbin.hexagon())
            .attr("transform", `translate(${h.x},${h.y})`)
            .attr("fill", `url(#grad-${c.id})`)
            .attr("stroke", d3.color(c.color).darker(1))
            .attr("stroke-width", 1.3);
        });

        g.append("image")
          .attr("xlink:href", c.logo)
          .attr("width", 48)
          .attr("height", 48)
          .attr("x", c.centerX - 24)
          .attr("y", c.centerY - 24)
          .style("cursor", "pointer")
          .on("click", () => {
            setClosingInfo(false);
            setSelectedCoin(c);
          });
      });

      

// --- Halo breathing animation (smooth, no CSS needed) ---
(function pulse() {
  if (isStale()) return;
  ring
    .transition()
    .duration(1400)
    .ease(d3.easeSinInOut)
    .attr("opacity", 0.95)
    .attr("stroke-width", 3.9)
    .transition()
    .duration(1400)
    .ease(d3.easeSinInOut)
    .attr("opacity", 0.72)
    .attr("stroke-width", 3.1)
    .on("end", pulse);
})();

// Click -> info panel
ttr.on("click", () => {
  setClosingInfo(false);
  setSelectedCoin(ttrInfo);
});
// --- Tiny orbiting sparks (very subtle) ---
const sparks = ttr.append("g").attr("class", "ttr-sparks").attr("opacity", 0.55);

const sparkData = d3.range(10).map((i) => ({
  a: (i / 10) * Math.PI * 2,
  r: 62 + (i % 3) * 3,
}));

const sparkNodes = sparks.selectAll("circle")
  .data(sparkData)
  .enter()
  .append("circle")
  .attr("r", 1.6)
  .attr("fill", "#ffd36a")
  .attr("filter", "url(#ttr-glow)");

(function orbit() {
  if (isStale()) return;
  sparkData.forEach((s) => (s.a += 0.035));
  sparkNodes
    .attr("cx", (d) => centerXGrid + Math.cos(d.a) * d.r)
    .attr("cy", (d) => centerYGrid + Math.sin(d.a) * d.r);

  d3.timeout(orbit, 40);
})();
    })();
  }, [mounted, coins, x, y, showDebug, ttrCap]);

  if (!mounted) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "#0c111b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffd87a",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 12,
        }}
      >
        Loading Realm...
      </div>
    );
  }

  const startCloseInfo = () => {
    setClosingInfo(true);
    setTimeout(() => {
      setSelectedCoin(null);
      setClosingInfo(false);
    }, 300);
  };

  const startCloseLegend = () => {
    setClosingInfo(true);
    setTimeout(() => {
      setLegendOpen(false);
      setClosingInfo(false);
    }, 300);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0c111b",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* MAP de fond, sous tout le reste */}
      <video
        src="/map.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: 0,
          opacity: 0.45,
          filter: "none",
          transform: "scale(0.81)",
          pointerEvents: "none",
        }}
      />

      <link
        href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
        rel="stylesheet"
      />
      <style>{`
        @keyframes borderGlow {
          0%,100% {
            filter: drop-shadow(0 0 15px rgba(255,200,100,.25))
                    drop-shadow(0 0 30px rgba(255,160,60,.15));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(255,210,120,.4))
                    drop-shadow(0 0 50px rgba(255,180,80,.3));
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.96); }
        }
        @keyframes clusterBreath {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }
        .cluster-breath {
          transform-origin: center center;
          animation: clusterBreath 4.8s ease-in-out infinite;
        }

        /* ✅ NEW: X button gentle animated glow (same spirit as INFO) */
        @keyframes xGlowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 4px rgba(255, 220, 100, 0.14))
                    drop-shadow(0 0 10px rgba(255, 190, 80, 0.08));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 7px rgba(255, 220, 100, 0.28))
                    drop-shadow(0 0 16px rgba(255, 190, 80, 0.16));
            transform: scale(1.04);
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: BASE_W,
          height: BASE_H,
          transform: `translate(-50%, -50%) scale(${x}, ${y})`,
          transformOrigin: "center center",
          zIndex: 10,
        }}
      >
        <img
          src="/border-king-narwhal.png"
          alt="border"
          style={{
            position: "absolute",
            top: "-22px",
            left: "50%",
            transform: "translateX(calc(-50% + 9px))",
            width: "calc(100% + 150px)",
            height: "105%",
            objectFit: "cover",
            pointerEvents: "none",
            zIndex: 15,
            animation: "borderGlow 6s ease-in-out infinite",
          }}
        />
        <img
          src="/titel-borde.png"
          alt="title"
          style={{
            position: "absolute",
            top: "-3.3%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "15%",
            pointerEvents: "none",
            zIndex: 20,
          }}
        />

        <svg
          ref={svgRef}
          width={BASE_W}
          height={BASE_H}
          style={{ position: "absolute", inset: 0, zIndex: 10 }}
        />

        {selectedCoin && (
          <>
            <div
              onClick={startCloseInfo}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 44,
                background: "transparent",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "-20px",
                left: "35%",
                transform: "translateX(-50%)",
                width: isMobile ? "90%" : "762px",
                height: isMobile ? "80%" : "528px",
                zIndex: 45,
                fontFamily: "'Press Start 2P', monospace",
                color: "#ffd87a",
                textShadow: "0 0 6px rgba(255,215,100,0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                pointerEvents: "auto",
                animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
              }}
              onClick={(e) => e.stopPropagation()}
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
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: isMobile ? "86%" : "80%",
                  fontSize: isMobile ? "12px" : "14px",
                  lineHeight: isMobile ? "22px" : "24px",
                }}
              >
                <div style={{ marginBottom: 20 }}>
                  <div>Name: {selectedCoin.name}</div>
                  <div>
                    Mkt Cap:{" "}
                    {selectedCoin.capNum > 0
                      ? `${(selectedCoin.capNum / 1e6).toFixed(2)}M`
                      : "N/A"}
                  </div>
                  <div>Price: {(!selectedCoin.price || selectedCoin.price === "$0" || selectedCoin.price === "0" || selectedCoin.price === 0) ? "N/A" : selectedCoin.price}</div>
                </div>
                <div style={{ marginBottom: 8 }}>Price variation:</div>
                <div style={{ marginBottom: 6 }}>
                  1Y: {(selectedCoin.pct1y === undefined || selectedCoin.pct1y === null || selectedCoin.pct1y === "" ? "N/A" : selectedCoin.pct1y)} &nbsp;/&nbsp; 1M:{" "}
                  {(selectedCoin.pct30 === undefined || selectedCoin.pct30 === null || selectedCoin.pct30 === "" ? "N/A" : selectedCoin.pct30)}
                </div>
                <div>
                  7D: {(selectedCoin.pct7 === undefined || selectedCoin.pct7 === null || selectedCoin.pct7 === "" ? "N/A" : selectedCoin.pct7)} &nbsp;/&nbsp; 24H:{" "}
                  {(selectedCoin.pct24 === undefined || selectedCoin.pct24 === null || selectedCoin.pct24 === "" ? "N/A" : selectedCoin.pct24)}
                </div>
              </div>
            </div>
          </>
        )}

        {legendOpen && (
          <>
            <div
              onClick={startCloseLegend}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 44,
                background: "transparent",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "16%",
                left: "27%",
                transform: "translate(-50%, -50%)",
                width: isMobile ? "94%" : "900px",
                height: isMobile ? "88%" : "680px",
                zIndex: 45,
                fontFamily: "'Press Start 2P', monospace",
                color: "#ffd87a",
                textShadow: "0 0 6px rgba(255,215,100,0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "left",
                pointerEvents: "auto",
                animation: `${closingInfo ? "fadeOut" : "fadeIn"} 0.3s ease forwards`,
              }}
              onClick={(e) => e.stopPropagation()}
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
              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: isMobile ? "86%" : "82%",
                  textAlign: "center",
                  fontSize: isMobile ? 5 : 10,
                  lineHeight: isMobile ? "10px" : "18px",
                  transform: "translateY(-10px)",
                }}
              >
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                  <div style={{ fontSize: isMobile ? 12 : 14 }}>SCALES & LEGEND</div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 6, textDecoration: "underline" }}>CRYPTO CLUSTERS</div>
                  <div>Center (logo hex): ≤ 100 000$</div>
                  <div>Ring 1 (6 hex): +600 000$ (100k / hex)</div>
                  <div>Ring 2 (12 hex): +1 500 000$ (250k / hex)</div>
                  <div>Ring 3 (18 hex): +4 500 000$ (300k / hex)</div>
                  <div>Ring 4 (24 hex): +9 000 000$ (500k / hex)</div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    Note: cluster sizing is organic (continuous), so it may slightly over/under-match the exact cap.
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 6, textDecoration: "underline" }}>TTR CORE</div>
                  <div>Copper hex: 100 000$</div>
                  <div>Silver hex: 250 000$</div>
                  <div>Gold hex: 300 000$</div>
                  <div>Final hex: 500 000$</div>
                  <div style={{ marginTop: 6 }}>
                    Materials by ring: Copper → Silver → Gold → Final
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Bas gauche : Live + Source + Last update + Refresh */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 30,
            zIndex: 60,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11,
            color: cgOk ? "#33ff66" : "#ff4444",
            textShadow: cgOk
              ? "0 0 6px rgba(50,255,120,0.35)"
              : "0 0 6px rgba(255,70,70,0.35)",
            lineHeight: "18px",
            userSelect: "none",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div>
            Live •{" "}
            <a
              href="https://birdeye.so/"
              target="_blank"
              rel="noreferrer"
              style={{
                color: "inherit",
                textDecoration: "underline",
              }}
              title="Open Birdeye"
            >
              BD
            </a>
          </div>
          <div>Source: {dataSource}</div>
          <div>Last update: {lastUpdateUTC}</div>
          <div>TTR: {(ttrCap/1e6).toFixed(2)}M</div>
          <button
            onClick={triggerFullRefresh}
            style={{
              marginTop: 4,
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
            }}
          >
            Refresh Data
          </button>
        </div>

        {/* Bouton INFO (Legend) */}
        <div
          onClick={() => {
            setSelectedCoin(null);
            setClosingInfo(false);
            setLegendOpen(true);
          }}
          style={{
            position: "absolute",
            bottom: "30px",
            right: "180px",
            zIndex: 65,
            display: "inline-block",
            width: "70px",
            height: "70px",
            cursor: "pointer",
          }}
          title="Legend / Scales"
        >
          <style>{`
            @keyframes infoGlowPulse {
              0%, 100% {
                filter: drop-shadow(0 0 4px rgba(255, 220, 100, 0.18))
                        drop-shadow(0 0 10px rgba(255, 190, 80, 0.10));
                transform: scale(1);
              }
              50% {
                filter: drop-shadow(0 0 7px rgba(255, 220, 100, 0.32))
                        drop-shadow(0 0 16px rgba(255, 190, 80, 0.18));
                transform: scale(1.04);
              }
            }
          `}</style>

          <img
            src="/btn-info.png"
            alt="Info"
            style={{
              width: "100%",
              height: "100%",
              transition: "transform 0.25s ease",
              willChange: "transform, filter",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.src = "/btn-info-hover.png";
              e.currentTarget.style.animation = "infoGlowPulse 1.2s ease-in-out infinite";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.src = "/btn-info.png";
              e.currentTarget.style.animation = "none";
              e.currentTarget.style.filter = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
            draggable={false}
          />
        </div>

        {/* ✅ UPDATED: Bouton X (Twitter) – same hover + animated glow pulse */}
        <a
          href="https://x.com/Kingnarval10307"
          target="_blank"
          rel="noreferrer"
          style={{
            position: "absolute",
            bottom: "30px",
            right: "115px",
            zIndex: 65,
            display: "inline-block",
            width: "70px",
            height: "70px",
            cursor: "pointer",
          }}
          title="King Narwhal on X"
        >
          <img
            src="/btn-x.png"
            alt="King Narwhal X"
            style={{
              width: "100%",
              height: "100%",
              transition: "transform 0.25s ease",
              willChange: "transform, filter",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.src = "/btn-x-hover.png";
              e.currentTarget.style.animation = "xGlowPulse 1.25s ease-in-out infinite";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.src = "/btn-x.png";
              e.currentTarget.style.animation = "none";
              e.currentTarget.style.filter = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
            draggable={false}
          />
        </a>
      </div>
    </div>
  );
}
