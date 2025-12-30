// pages/index.js
// War of Coins – v9.7.9 (Tahlia Raydium MC Patch — FULL UI + FORGING + FAIL-SAFE)

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

const SCALE_SWITCH_CAP = 10_000_000;

const TTR_IMAGE_SCALE = {
  copper: 0.92,
  silver: 0.96,
  gold: 1.0,
  final: 1.08,
};

const WINDOW_SIZE = 14;
const MAX_TRIES_PER_CLUSTER = 1200;
const MAX_HEX_PER_CLUSTER = 19;
const CLUSTER_BUFFER = 1;

const LS_TTRCAP = "woc_v978_ttr_cap";
const SESSION_CG_DATA = "woc_v978_window_data";
const SESSION_CG_TIME = "woc_v978_window_time";

const SAFEZONE_BASE = { scaleX: 2.0, scaleY: 1.13, scaleGlobal: 0.72, radius: 80 };
const SAFEZONE_OFFSET = { x: 20.5, y: 0 };

const DEFAULT_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// ============================================================================
// TTR CONFIG (Raydium → MC)
// ============================================================================
const TTR_CONFIG = {
  STATUS: "LIVE", // LIVE | OFF
  SOURCE: "RAYDIUM",
  MINT: "none",
  QUOTE_MINT: DEFAULT_USDC,
};

// ============================================================================
// Helpers
// ============================================================================
const keyOf = (q, r) => `${q},${r}`;

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
function jitterSigned(seedStr) {
  return makeSeededRand(seedStr)() - 0.5;
}

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

function normSym(c) {
  const s = (c?.symbol ?? "").toString().trim();
  return s ? s.toUpperCase() : "";
}
function normName(c) {
  const s = (c?.name ?? "").toString().trim();
  return s ? s.toUpperCase() : "";
}
function groupKey(c) {
  return (
    normSym(c) ||
    normName(c) ||
    String(c?.id ?? c?.address ?? c?.mint ?? c?.tokenAddress ?? "").trim()
  );
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
  const cap = Math.max(0, Number(capUSD) || 0);
  if (cap <= 0) return { total: 3 };
  const x = cap / 500_000;
  const growth = Math.log10(1 + x) * 10;
  const raw = 3 + growth;
  const total = Math.max(3, Math.min(MAX_HEX_PER_CLUSTER, Math.round(raw)));
  return { total };
}
function computeHexCountContinuous(capUSD, scaleMode) {
  return computeHexCountContinuousLarge(capUSD);
}

// ============================================================================
// TTR materials (rings-only)
// ============================================================================
const TTR_MATS_LARGE = [
  { key: "copper", value: 100_000, stroke: "rgba(255,170,90,0.95)" },
  { key: "silver", value: 250_000, stroke: "rgba(255,255,255,0.95)" },
  { key: "gold", value: 300_000, stroke: "rgba(255,230,140,0.95)" },
  { key: "final", value: 500_000, stroke: "rgba(210,190,255,0.95)" },
];
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

// ============================================================================
// Component
// ============================================================================
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { x, y } = useGlobalScale();

  const [refreshing, setRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const REFRESH_COOLDOWN_MS = 20_000;
  const lastRefreshAtRef = useRef(0);
  const cooldownTimerRef = useRef(null);

  useEffect(() => () => cooldownTimerRef.current && clearInterval(cooldownTimerRef.current), []);

  const IS_ADMIN =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("admin") === "kingnarwhal24568";

  const svgRef = useRef(null);
  const renderIdRef = useRef(0);
  const [showDebug, setShowDebug] = useState(process.env.NEXT_PUBLIC_INTERNAL_DEBUG === "1");

  const [coinsAll, setCoinsAll] = useState([]);
  const [coins, setCoins] = useState([]);

  const [selectedCoin, setSelectedCoin] = useState(null);
  const [closingInfo, setClosingInfo] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  const [cgOk, setCgOk] = useState(false);
  const [lastUpdateUTC, setLastUpdateUTC] = useState("…");
  const [dataSource, setDataSource] = useState("Birdeye (loading)");
  const [isMobile, setIsMobile] = useState(false);

  const [ttrCap, setTtrCap] = useState(() => {
    if (typeof window === "undefined") return 0;
    try {
      const v = Number(localStorage.getItem(LS_TTRCAP));
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  });

  const [ttrData, setTtrData] = useState(null);
  const [ttrLoading, setTtrLoading] = useState(false);
  const [ttrError, setTtrError] = useState(null);

  const TTR_CORE_VALUE = 100_000;
  const TTR_CAP_RAW = Math.max(0, Number(ttrCap || 0));
  const mintStr = (TTR_CONFIG.MINT || "").toString().trim();
  const mintMissing = !mintStr || mintStr.toLowerCase() === "none";
  const TTR_IS_FORGING = TTR_CAP_RAW <= 0 || !!ttrError || mintMissing;
  const TTR_HAS_GLOW = !TTR_IS_FORGING && TTR_CAP_RAW >= TTR_CORE_VALUE;
  const TTR_CAP_SAFE = Math.max(1_000_000, TTR_CAP_RAW || 0);
  const TTR_CAP_MATS = Math.max(0, TTR_CAP_RAW - (TTR_HAS_GLOW ? TTR_CORE_VALUE : 0));

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
        if (!json?.ok || !Number.isFinite(json.marketCap) || json.marketCap <= 0) {
          throw new Error(json?.error || "TTR unavailable");
        }
        if (cancelled) return;
        setTtrData(json);
        setTtrCap(Math.round(json.marketCap));
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
    try {
      localStorage.setItem(LS_TTRCAP, String(ttrCap));
    } catch {}
  }, [ttrCap]);

  // Keyboard + resize
  useEffect(() => {
    const onKey = (e) => {
      const k = (e.key || "").toLowerCase();
      if (k === "d" && IS_ADMIN) setShowDebug((v) => !v);
      if (k === "escape") {
        setLegendOpen(false);
        setSelectedCoin(null);
      }
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
      if (myReq === mgr.reqId) {
        mgr.data = data;
        mgr.ts = Date.now();
      }
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
          } else {
            setCgOk(false);
          }
        }
      } catch {
        if (!cancelled) setCgOk(false);
      }
    }

    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
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
      if (leftSec <= 0) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    }, 250);
  }

  async function triggerFullRefresh() {
    const since = Date.now() - (lastRefreshAtRef.current || 0);
    if (refreshing || since < REFRESH_COOLDOWN_MS || cooldownLeft > 0) return;

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
      } else {
        setCgOk(false);
      }
    } finally {
      setRefreshing(false);
    }
  }

  // Window selection around TTR
  useEffect(() => {
    if (!coinsAll || coinsAll.length === 0) {
      setCoins([]);
      return;
    }
    const ABS_MIN_CAP = 500_000;
    const ABS_MAX_CAP = 50_000_000;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const safeTTR = TTR_CAP_SAFE;

    const FLOOR_RATIO = safeTTR >= 2_000_000 ? 0.5 : 0.0;
    const minCapDyn = Math.max(ABS_MIN_CAP, FLOOR_RATIO > 0 ? safeTTR * FLOOR_RATIO : ABS_MIN_CAP);

    const MAX_ABOVE_RATIO = 2.1;
    const maxCapDyn = clamp(Math.max(safeTTR * MAX_ABOVE_RATIO, 2_000_000), ABS_MIN_CAP, ABS_MAX_CAP);

    const uniqueAll = dedupeBestByGroup(coinsAll).filter((c) => {
      const cap = Number(c?.capNum ?? 0) || 0;
      return cap > 0 && cap >= minCapDyn && cap <= maxCapDyn;
    });

    const byCap = [...uniqueAll].sort((a, b) => (Number(a.capNum) || 0) - (Number(b.capNum) || 0));

    const selected = [];
    const seen = new Set();
    function tryAdd(c) {
      const k = groupKey(c);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      selected.push(c);
      return true;
    }

    // simple quantile selection
    const n = Math.min(WINDOW_SIZE, byCap.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(((i + 0.5) * byCap.length) / n);
      tryAdd(byCap[Math.min(byCap.length - 1, Math.max(0, idx))]);
    }

    // backfill
    for (const c of byCap) {
      if (selected.length >= WINDOW_SIZE) break;
      tryAdd(c);
    }

    setCoins(selected.slice(0, WINDOW_SIZE));
  }, [coinsAll, ttrCap]);

  const coinsSig = React.useMemo(() => {
    return (coins || [])
      .map((c) => `${(c?.symbol || c?.name || c?.id || "").toString().toUpperCase()}_${Math.round(Number(c?.capNum || 0))}`)
      .sort()
      .join("|");
  }, [coins]);

  const renderKeyRef = useRef("");

  // D3 render
  useEffect(() => {
    if (!mounted) return;

    const renderKey = `${coinsSig}__${Math.round(Number(ttrCap || 0))}__${showDebug ? 1 : 0}__${Number(x).toFixed(4)}__${Number(y).toFixed(4)}`;
    if (renderKeyRef.current === renderKey) return;
    renderKeyRef.current = renderKey;

    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

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

    svg.append("g")
      .selectAll("path")
      .data(hexList)
      .enter()
      .append("path")
      .attr("d", hexbin.hexagon())
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("fill", "rgba(255,255,255,0.03)")
      .attr("stroke", "rgba(255,255,255,0.07)")
      .attr("stroke-width", 0.6);

    const ttrHex = hexList.reduce((prev, curr) =>
      Math.hypot(curr.x - width / 2, curr.y - height / 2) <
      Math.hypot(prev.x - width / 2, prev.y - height / 2)
        ? curr
        : prev
    );
    const centerXGrid = ttrHex.x;
    const centerYGrid = ttrHex.y;

    const baseSize = Math.min(width, height) * SAFEZONE_BASE.scaleGlobal;
    const rectW = baseSize * SAFEZONE_BASE.scaleX;
    const rectH = baseSize * SAFEZONE_BASE.scaleY;
    const rectX = centerXGrid - rectW / 2 + SAFEZONE_OFFSET.x;
    const rectY = centerYGrid - rectH / 2 + SAFEZONE_OFFSET.y;

    const marginHex = hexRadius;
    const rectSafeX = rectX + marginHex;
    const rectSafeY = rectY + marginHex;
    const rectSafeW = rectW - marginHex * 2;
    const rectSafeH = rectH - marginHex * 2;

    function pointInSafe(px, py) {
      return px >= rectSafeX && px <= rectSafeX + rectSafeW && py >= rectSafeY && py <= rectSafeY + rectSafeH;
    }

    // blur outside safezone (mask)
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

    const safeZonePath = roundedRectPath(rectX, rectY, rectW, rectH, SAFEZONE_BASE.radius);

    const defsOverlay = svg.append("defs");
    defsOverlay.append("mask").attr("id", "mask-outside").html(`
      <rect width="${width}" height="${height}" fill="white" />
      <path d="${safeZonePath}" fill="black" />
    `);
    defsOverlay.append("filter").attr("id", "blur8").append("feGaussianBlur").attr("stdDeviation", 8);

    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "rgba(8,10,18,0.6)")
      .attr("filter", "url(#blur8)")
      .attr("mask", "url(#mask-outside)");

    if (showDebug) {
      svg.append("path")
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
        let placed = false;

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
            if (!h || occupied.has(k)) {
              valid = false;
              break;
            }
            if (axialDistance(q, r, ttrHex.q, ttrHex.r) < 4) {
              valid = false;
              break;
            }
            const corners = hexCorners(h.x, h.y, hexRadius);
            let inside = 0;
            for (const [px, py] of corners) if (pointInSafe(px, py)) inside++;
            if (inside < 4) {
              valid = false;
              break;
            }
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

          placed = true;
          break;
        }

        if (!placed) {
          // fail silently
        }
      }
    }

    (async () => {
      // TTR materials (rings) under clusters
      const ttrGroup = svg.append("g").attr("class", "ttr-materials");
      if (TTR_HAS_GLOW && TTR_CAP_MATS > 0) {
        const ttrMats = computeTtrMaterialsRingsOnly(TTR_CAP_MATS);
        const ttrSpiral = genSpiralAxialPositions(61).slice(1);
        ttrSpiral.forEach(([dq, dr], i) => {
          const mat = ttrMats[i];
          if (!mat) return;
          const q = ttrHex.q + dq;
          const r = ttrHex.r + dr;
          const h = axialMap.get(keyOf(q, r));
          if (!h) return;

          ttrGroup.append("path")
            .attr("d", hexbin.hexagon())
            .attr("transform", `translate(${h.x},${h.y})`)
            .attr("fill", "rgba(0,0,0,0)")
            .attr("stroke", mat.stroke)
            .attr("stroke-width", 1.25)
            .attr("opacity", 0.95);

          const href =
            mat.key === "copper" ? "/hexacuivre.png" :
            mat.key === "silver" ? "/hexasilver.png" :
            mat.key === "gold" ? "/hexagold.png" :
            "/hexafinal.png";

          drawHexImage(ttrGroup, href, h, hexRadius, TTR_IMAGE_SCALE[mat.key] || 1.0);
        });
      }

      if (coins && coins.length) await placeAll();
      if (isStale()) return;

      const defs = svg.append("defs");
      clusters.forEach((c) => {
        const grad = defs.append("radialGradient")
          .attr("id", `grad-${c.id}`)
          .attr("cx", "50%")
          .attr("cy", "50%")
          .attr("r", "60%");
        grad.append("stop").attr("offset", "0%").attr("stop-color", c.color).attr("stop-opacity", 1);
        grad.append("stop").attr("offset", "100%").attr("stop-color", d3.color(c.color).darker(2)).attr("stop-opacity", 0.85);

        const g = svg.append("g").attr("class", `cluster-${c.id} cluster-breath`).style("opacity", 0.65);

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
          .attr("x", Math.round(c.centerX - 24))
          .attr("y", Math.round(c.centerY - 24))
          .style("cursor", "pointer")
          .on("click", () => {
            setClosingInfo(false);
            setSelectedCoin(c);
          });
      });

      // TTR halo gradient
      const defsTTR = svg.append("defs");
      const gradTTR = defsTTR.append("radialGradient")
        .attr("id", "grad-ttr-halo")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "70%");
      gradTTR.append("stop").attr("offset", "0%").attr("stop-color", "#e8f7ff").attr("stop-opacity", 0.85);
      gradTTR.append("stop").attr("offset", "60%").attr("stop-color", "#3bbcff").attr("stop-opacity", 0.5);
      gradTTR.append("stop").attr("offset", "100%").attr("stop-color", "#1b4fff").attr("stop-opacity", 0.18);

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

      // Halo then core image LAST so glow is above halo
      const ttr = svg.append("g")
        .attr("class", TTR_HAS_GLOW ? "ttr-core ttr-halo-pulse" : "ttr-core")
        .style("cursor", "pointer");

      ttr.append("circle")
        .attr("cx", centerXGrid)
        .attr("cy", centerYGrid)
        .attr("r", 55)
        .attr("fill", "none")
        .attr("stroke", "url(#grad-ttr-halo)")
        .attr("stroke-width", 4.5)
        .attr("stroke-opacity", 0.6);

      ttr.append("circle")
        .attr("cx", centerXGrid)
        .attr("cy", centerYGrid)
        .attr("r", 48)
        .attr("fill", "url(#grad-ttr-halo)")
        .attr("opacity", 0.28);

      ttr.append("image")
        .attr("xlink:href", TTR_HAS_GLOW ? "/ttr-core-glow.png" : "/ttr-core.png")
        .attr("width", 70)
        .attr("height", 70)
        .attr("x", centerXGrid - 35)
        .attr("y", centerYGrid - 35);

      ttr.on("click", () => {
        setClosingInfo(false);
        setSelectedCoin(ttrInfo);
      });
    })();
  }, [mounted, coinsSig, x, y, showDebug, ttrCap, ttrData, TTR_HAS_GLOW, TTR_CAP_MATS]);

  if (!mounted) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        background: "#0c111b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffd87a",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 12,
      }}>
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
    <div style={{ width: "100vw", height: "100vh", background: "#0c111b", position: "relative", overflow: "hidden" }}>
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
          transform: "scale(0.81)",
          pointerEvents: "none",
        }}
      />

      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes borderGlow {
          0%,100% { filter: drop-shadow(0 0 15px rgba(255,200,100,.25)) drop-shadow(0 0 30px rgba(255,160,60,.15)); }
          50% { filter: drop-shadow(0 0 20px rgba(255,210,120,.4)) drop-shadow(0 0 50px rgba(255,180,80,.3)); }
        }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.96);} to {opacity:1; transform:scale(1);} }
        @keyframes fadeOut { from { opacity: 1; transform: scale(1);} to {opacity:0; transform:scale(0.96);} }
        @keyframes clusterBreath { 0%,100% {transform:scale(1);} 50% {transform:scale(1.035);} }
        .cluster-breath { transform-origin: center center; transform-box: fill-box; will-change: transform, opacity; backface-visibility: hidden; animation: clusterBreath 4.8s ease-in-out infinite; }
        @keyframes ttrHaloPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); filter: drop-shadow(0 0 6px rgba(80, 190, 255, 0.35)) drop-shadow(0 0 14px rgba(40, 140, 255, 0.22)); }
          50% { opacity: 0.65; transform: scale(1.06); filter: drop-shadow(0 0 10px rgba(80, 190, 255, 0.55)) drop-shadow(0 0 22px rgba(40, 140, 255, 0.35)); }
        }
        .ttr-halo-pulse { transform-origin: center center; transform-box: fill-box; will-change: transform, opacity, filter; animation: ttrHaloPulse 4.8s ease-in-out infinite; }
        @keyframes xGlowPulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 220, 100, 0.14)) drop-shadow(0 0 10px rgba(255, 190, 80, 0.08)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 7px rgba(255, 220, 100, 0.28)) drop-shadow(0 0 16px rgba(255, 190, 80, 0.16)); transform: scale(1.04); }
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

        <svg ref={svgRef} width={BASE_W} height={BASE_H} style={{ position: "absolute", inset: 0, zIndex: 10 }} />

        {/* INFO PANEL */}
        {selectedCoin && (
          <>
            <div onClick={startCloseInfo} style={{ position: "absolute", inset: 0, zIndex: 44, background: "transparent" }} />
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
              <img src="/virgin-border.png" alt="frame" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2, width: isMobile ? "86%" : "80%", fontSize: isMobile ? "12px" : "14px", lineHeight: isMobile ? "22px" : "24px" }}>
                <div style={{ marginBottom: 20 }}>
                  <div>Name: {selectedCoin.name}</div>
                  <div>Mkt Cap: {selectedCoin.capNum > 0 ? `${(selectedCoin.capNum / 1e6).toFixed(2)}M` : "N/A"}</div>
                  <div>Price: {!selectedCoin.price || selectedCoin.price === "$0" ? "N/A" : selectedCoin.price}</div>
                </div>
                <div style={{ marginBottom: 8 }}>Price variation:</div>
                <div style={{ marginBottom: 6 }}>
                  1Y: {selectedCoin.pct1y || "N/A"} &nbsp;/&nbsp; 1M: {selectedCoin.pct30 || "N/A"}
                </div>
                <div>7D: {selectedCoin.pct7 || "N/A"} &nbsp;/&nbsp; 24H: {selectedCoin.pct24 || "N/A"}</div>
              </div>
            </div>
          </>
        )}

        {/* LEGEND PANEL */}
        {legendOpen && (
          <>
            <div onClick={startCloseLegend} style={{ position: "absolute", inset: 0, zIndex: 44, background: "transparent" }} />
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
              <img src="/virgin-border.png" alt="frame" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2, width: isMobile ? "86%" : "82%", textAlign: "center", fontSize: isMobile ? 5 : 10, lineHeight: isMobile ? "10px" : "18px", transform: "translateY(-10px)" }}>
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                  <div style={{ fontSize: isMobile ? 12 : 14 }}>SCALES & LEGEND</div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 6, textDecoration: "underline" }}>CRYPTO CLUSTERS</div>
                  <div>Organic sizing (continuous) based on market cap.</div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 6, textDecoration: "underline" }}>TTR MATERIALS</div>
                  <div>Core: 100k — rings: Copper → Silver → Gold → Final</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* HUD bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 30,
            zIndex: 60,
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11,
            color: cgOk ? "#33ff66" : "#ff4444",
            textShadow: cgOk ? "0 0 6px rgba(50,255,120,0.35)" : "0 0 6px rgba(255,70,70,0.35)",
            lineHeight: "18px",
            userSelect: "none",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div>Live • <a href="https://birdeye.so/" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>BD</a></div>
          <div>Source: {dataSource}</div>
          <div>Last update: {lastUpdateUTC}</div>
          <div>
            TTR: {TTR_IS_FORGING ? <span style={{ color: "#ffaa55" }}>FORGING</span> : `${(TTR_CAP_RAW / 1e6).toFixed(2)}M`}
            {!TTR_IS_FORGING && ttrLoading ? " • Raydium…" : ""}
          </div>
          {!TTR_IS_FORGING && ttrData?.price != null && <div style={{ opacity: 0.9 }}>Price: ${Number(ttrData.price).toFixed(8)}</div>}

          <button
            onClick={triggerFullRefresh}
            disabled={refreshing || cooldownLeft > 0}
            style={{
              marginTop: 4,
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: refreshing || cooldownLeft > 0 ? "not-allowed" : "pointer",
              opacity: refreshing || cooldownLeft > 0 ? 0.55 : 1,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
            }}
          >
            {refreshing ? "Refreshing…" : cooldownLeft > 0 ? `Cooldown ${cooldownLeft}s` : "Refresh Data"}
          </button>
        </div>

        {/* INFO button */}
        <div
          onClick={() => {
            setSelectedCoin(null);
            setClosingInfo(false);
            setLegendOpen(true);
          }}
          style={{ position: "absolute", bottom: "30px", right: "180px", zIndex: 65, width: "70px", height: "70px", cursor: "pointer" }}
          title="Legend / Scales"
        >
          <img src="/btn-info.png" alt="Info" style={{ width: "100%", height: "100%" }} draggable={false} />
        </div>

        {/* X button */}
        <a
          href="https://x.com/Kingnarval10307"
          target="_blank"
          rel="noreferrer"
          style={{ position: "absolute", bottom: "30px", right: "115px", zIndex: 65, width: "70px", height: "70px", cursor: "pointer" }}
          title="King Narwhal on X"
        >
          <img src="/btn-x.png" alt="X" style={{ width: "100%", height: "100%" }} draggable={false} />
        </a>
      </div>
    </div>
  );
}
