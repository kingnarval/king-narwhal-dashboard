// lib/hooks/useTTRMetrics.js
import { useEffect } from 'react';
import useAppStore from '../store/useAppStore';
import { TTR, CACHE } from '../utils/constants';

const DEFAULT_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const DEFAULT_WSOL = 'So11111111111111111111111111111111111111112';

const TTR_CONFIG = {
  STATUS: 'LIVE',
  SOURCE: 'RAYDIUM',
  MINT: 'none',
  QUOTE_MINT: DEFAULT_WSOL,
};

export function useTTRMetrics() {
  const setTtrCap = useAppStore((s) => s.setTtrCap);
  const setTtrData = useAppStore((s) => s.setTtrData);
  const setTtrLoading = useAppStore((s) => s.setTtrLoading);
  const setTtrError = useAppStore((s) => s.setTtrError);
  
  useEffect(() => {
    if (TTR_CONFIG.STATUS !== 'LIVE') return;
    let cancelled = false;
    
    async function loadTTR() {
      try {
        setTtrLoading(true);
        setTtrError(null);
        
        const mint = (TTR_CONFIG.MINT || '').trim();
        const quote = (TTR_CONFIG.QUOTE_MINT || DEFAULT_USDC).trim();
        
        if (!mint || mint.toLowerCase() === 'none') {
          if (!cancelled) {
            setTtrData(null);
            setTtrCap(0);
            setTtrLoading(false);
          }
          return;
        }
        
        const res = await fetch(
          `/api/ttr-metrics?mint=${encodeURIComponent(mint)}&quoteMint=${encodeURIComponent(quote)}`,
          { cache: 'no-store' }
        );
        
        const json = await res.json();
        const normalized = { ...json, price: (json?.priceUsd ?? json?.price ?? null) };
        
        if (!normalized?.ok || !Number.isFinite(normalized.marketCap) || normalized.marketCap <= 0) {
          throw new Error(normalized?.error || 'TTR unavailable');
        }
        
        if (cancelled) return;
        
        setTtrData(normalized);
        setTtrCap(Math.round(normalized.marketCap));
        localStorage.setItem(CACHE.LS_TTR_CAP, String(Math.round(normalized.marketCap)));
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
}
