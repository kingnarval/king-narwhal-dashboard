// useDynamicStageFull.js
// -----------------------------------------------------------------------------
// War of Coins â€“ Dynamic Stage Manager (stable Tahlia version)
// - Support Live Pump.fun + simulation fallback
// - minStage lock (empÃªche de redescendre sous le Stage 3)
// - 100 % sans boucle infinie (interval propre)
// -----------------------------------------------------------------------------

import React from "react";

// ======================= CONFIG =======================
export const TTR_NAME = "TTR";
export const TTR_ADDRESS = "GEMffGLWEMRqsfQqy2htNvvDEnXMrRTikiXDn5E4pump";
const PUMP_COIN_URL = `https://frontend-api.pump.fun/coins/${TTR_ADDRESS}`;

// ======================= STAGES =======================
export const STAGES = {
  3: {
    id: 3,
    label: "Stage 3 â€“ Early Realm",
    ttrBase: 400_000,
    opponents: [150_000, 250_000, 350_000],
    capMin: 100_000,
    capMax: 500_000,
    ringHex: [1, 6, 12, 18, 24],
    ringTotal: [400_000, 1_000_000, 2_000_000, 3_000_000, 4_000_000],
  },
  2: {
    id: 2,
    label: "Stage 2 â€“ Mid Realm",
    ttrBase: 1_000_000,
    opponents: [2_000_000, 6_000_000, 12_000_000],
    capMin: 500_000,
    capMax: 15_000_000,
    ringHex: [1, 6, 12, 18, 24],
    ringTotal: [1_000_000, 5_000_000, 20_000_000, 60_000_000, 120_000_000],
  },
  1: {
    id: 1,
    label: "Stage 1 â€“ Prime Realm",
    ttrBase: 1_000_000,
    opponents: [12_000_000, 26_000_000, 62_000_000],
    capMin: 1_000_000,
    capMax: 70_000_000,
    ringHex: [1, 6, 12, 18, 24],
    ringTotal: [1_000_000, 30_000_000, 120_000_000, 360_000_000, 720_000_000],
  },
};

// =================== CORE LOGIC ===================
function prng(seed) {
  return function () {
    seed = (seed * 1664525 + 1013904223) % 0xffffffff;
    return seed / 0xffffffff;
  };
}
function makeOpponent(id, cap, name) {
  return { id, name: name || id, cap: Math.max(0, Math.round(cap)) };
}
function sortByCap(arr) {
  return arr.slice().sort((a, b) => a.cap - b.cap);
}
function pickInitialOpponents(cfg, r) {
  return cfg.opponents
    .slice()
    .sort((a, b) => a - b)
    .map((cap, i) =>
      makeOpponent(`OP${cfg.id}-${i + 1}`, cap + Math.round(r() * cap * 0.05))
    );
}
function nextOpponentAbove(currentMax, cfg, r) {
  const base = Math.min(
    cfg.capMax,
    Math.max(currentMax * (1 + 0.25 + r() * 0.15), currentMax + 1)
  );
  return makeOpponent(`OP${cfg.id}-N${Math.floor(r() * 1e6)}`, base);
}

// =================== ACTIONS & REDUCER ===================
export const ACTIONS = {
  INIT_FROM_STAGE: "INIT_FROM_STAGE",
  UPDATE_MARKET_CAPS: "UPDATE_MARKET_CAPS",
  PROMOTE: "PROMOTE",
  DEMOTE: "DEMOTE",
};

export function stageReducer(state, action) {
  switch (action.type) {
    case ACTIONS.INIT_FROM_STAGE: {
      const cfg = STAGES[action.stageId];
      const r = prng(action.seed ?? 42);
      return {
        stageId: cfg.id,
        ttr: { id: "TTR", name: "TTR", cap: Math.round(action.ttrCap) },
        opponents: pickInitialOpponents(cfg, r),
        history: [],
      };
    }
    case ACTIONS.UPDATE_MARKET_CAPS: {
      const cfg = STAGES[state.stageId];
      const ttrCap = Math.round(action.ttrCap);
      const updates = action.updates || {};

      let opps = state.opponents.map((o) => ({
        ...o,
        cap: updates[o.id] ?? o.cap,
      }));

      const extras = Object.keys(updates).filter(
        (id) => !opps.some((o) => o.id === id)
      );
      for (const id of extras) opps.push(makeOpponent(id, updates[id]));
      opps = sortByCap(opps).slice(-3);

      const beaten = opps
        .filter((o) => ttrCap > o.cap)
        .sort((a, b) => a.cap - b.cap);
      if (beaten.length > 0) {
        const beatenOne = beaten[0];
        const remaining = opps.filter((o) => o.id !== beatenOne.id);
        const r = prng(Date.now() % 100000);
        const currentMax = Math.max(...opps.map((o) => o.cap));
        const newOpp = nextOpponentAbove(currentMax, cfg, r);
        return {
          ...state,
          ttr: { ...state.ttr, cap: ttrCap },
          opponents: sortByCap([...remaining, newOpp]),
          history: [...state.history, beatenOne.id],
          lastBeatAt: Date.now(),
        };
      }

      return {
        ...state,
        ttr: { ...state.ttr, cap: ttrCap },
        opponents: sortByCap(opps),
      };
    }
    case ACTIONS.PROMOTE: {
      const nextCfg = STAGES[action.nextStage];
      const r = prng(Date.now() % 100000);
      return {
        stageId: nextCfg.id,
        ttr: state.ttr,
        opponents: pickInitialOpponents(nextCfg, r),
        history: state.history,
      };
    }
    case ACTIONS.DEMOTE: {
      const prevCfg = STAGES[action.prevStage];
      const r = prng(Date.now() % 100000);
      return {
        stageId: prevCfg.id,
        ttr: state.ttr,
        opponents: pickInitialOpponents(prevCfg, r),
        history: state.history,
      };
    }
    default:
      return state;
  }
}

// =================== PROMOTE / DEMOTE ===================
export function shouldPromote(state) {
  const cfg = STAGES[state.stageId];
  const ttr = state.ttr.cap;
  const maxOpp = Math.max(...state.opponents.map((o) => o.cap));
  const nearTop = ttr > maxOpp && ttr > cfg.capMax * 0.9;
  if (state.stageId === 3 && nearTop) return 2;
  if (state.stageId === 2 && nearTop) return 1;
  return null;
}
export function shouldDemote(state) {
  const cfg = STAGES[state.stageId];
  const ttr = state.ttr.cap;
  if (state.stageId === 2 && ttr < cfg.capMin * 0.8) return 3;
  if (state.stageId === 1 && ttr < cfg.capMin * 0.8) return 2;
  return null;
}

// ================== HEX COUNT CALCULATOR ===================
export function computeHexCountFromCap(capUSD, cfg) {
  const { ringHex, ringTotal } = cfg;
  let remaining = Math.max(0, capUSD || 0);
  let taken = 0;
  const detail = [];

  for (let k = 0; k < ringHex.length; k++) {
    const ringH = ringHex[k];
    const ringVal = ringTotal[k];
    const perHex = ringVal / ringH;

    if (remaining >= ringVal) {
      taken += ringH;
      remaining -= ringVal;
      detail.push({ ring: k, full: true, hex: ringH, perHex, remaining });
    } else {
      const partial = Math.floor(remaining / perHex);
      taken += partial;
      remaining -= partial * perHex;
      detail.push({ ring: k, full: false, hex: partial, perHex, remaining });
      break;
    }
  }

  const scaled = Math.floor(taken * 0.9);
  const total = Math.max(3, Math.min(61, scaled));
  return { total, detail };
}

// ================== LIVE FETCH ===================
async function fetchPumpFunCoinCapAndRank() {
  try {
    const res = await fetch(PUMP_COIN_URL);
    if (!res.ok) throw new Error("pump.fun coin not found");
    const data = await res.json();
    const cap = Number(data?.usd_market_cap ?? 0);
    const rank = data?.rank ?? null;
    const price = Number(data?.usd_price ?? 0);
    return { cap: Math.max(0, Math.round(cap)), rank, price, ok: true };
  } catch {
    return { cap: null, rank: null, price: null, ok: false };
  }
}

// ================== HOOK PRINCIPAL ===================
const LS_STAGE = "woc_stage_state_v8";
const LS_SIMCAP = "woc_ttr_sim_cap_v2";

export function useDynamicStageFull(initialStage = 3, initialSimCap = 400_000, options = {}) {
  const minStage = options.minStage ?? 3; // verrou minimal (Stage 3 par dÃ©faut)

  const [state, dispatch] = React.useReducer(stageReducer, null, () => {
    try {
      const raw = localStorage.getItem(LS_STAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.stageId < minStage) parsed.stageId = minStage;
        return parsed;
      }
    } catch {}
    return null;
  });

  const [isLive, setIsLive] = React.useState(false);
  const [ttrCap, setTtrCap] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LS_SIMCAP);
      if (raw) return Number(raw) || initialSimCap;
    } catch {}
    return initialSimCap;
  });
  const [ttrRank, setTtrRank] = React.useState(null);
  const [ttrPrice, setTtrPrice] = React.useState(null);

  // INIT
  React.useEffect(() => {
    if (!state || !state.stageId) {
      dispatch({ type: ACTIONS.INIT_FROM_STAGE, stageId: minStage, ttrCap });
    }
  }, [state, minStage, ttrCap]);

  // Sauvegardes
  React.useEffect(() => {
    try {
      localStorage.setItem(LS_STAGE, JSON.stringify(state));
    } catch {}
  }, [state]);
  React.useEffect(() => {
    try {
      localStorage.setItem(LS_SIMCAP, String(ttrCap));
    } catch {}
  }, [ttrCap]);

  const tick = React.useCallback((nextTtrCap, updates) => {
    dispatch({ type: ACTIONS.UPDATE_MARKET_CAPS, ttrCap: nextTtrCap, updates });
  }, []);

  const autoAdvance = React.useCallback(() => {
    if (!state) return;
    let next = shouldPromote(state);
    let prev = shouldDemote(state);

    // ðŸ”’ clamp vers le minStage
    if (minStage) {
      if (next && next < minStage) next = null;
      if (prev && prev < minStage) prev = null;
    }

    if (next) dispatch({ type: ACTIONS.PROMOTE, nextStage: next });
    else if (prev) dispatch({ type: ACTIONS.DEMOTE, prevStage: prev });
  }, [state, minStage]);

  // ContrÃ´les manuels (T/G)
  React.useEffect(() => {
    const onKey = (e) => {
      const k = e.key?.toLowerCase?.();
      if (k === "t") setTtrCap((v) => Math.round(v * 1.2));
      else if (k === "g") setTtrCap((v) => Math.max(1, Math.round(v / 1.2)));
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, []);

  // ðŸ” Live update stable (setInterval)
  React.useEffect(() => {
    const fetchAndUpdate = async () => {
      try {
        const live = await fetchPumpFunCoinCapAndRank();

        if (live && live.cap != null && live.ok) {
          setIsLive(true);
          setTtrCap(live.cap);
          setTtrRank(live.rank);
          setTtrPrice(live.price);
          tick(live.cap, {});
          autoAdvance();
        } else {
          setIsLive(false);
          tick(ttrCap, {});
          autoAdvance();
        }
      } catch (err) {
        console.warn("Live fetch error:", err);
      }
    };

    fetchAndUpdate();
    const interval = setInterval(fetchAndUpdate, 30000); // 30s pour Ã©viter toute charge excessive
    return () => clearInterval(interval);
  }, [tick, autoAdvance, ttrCap]);

  const cfg = state ? STAGES[state.stageId] : STAGES[minStage];

  return {
    state,
    cfg,
    tick,
    autoAdvance,
    isLive,
    ttrCap,
    ttrRank,
    ttrPrice,
    computeHexCountFromCap,
  };
}