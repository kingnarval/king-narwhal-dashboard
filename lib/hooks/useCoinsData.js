// lib/hooks/useCoinsData.js
import { useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import { CACHE } from '../utils/constants';

export function useCoinsData() {
  const birdeyeMgrRef = useRef({ ts: 0, data: null, promise: null, reqId: 0 });
  
  const setCoinsAll = useAppStore((s) => s.setCoinsAll);
  const setDataSource = useAppStore((s) => s.setDataSource);
  const setLastUpdateUTC = useAppStore((s) => s.setLastUpdateUTC);
  const setCgOk = useAppStore((s) => s.setCgOk);
  
  async function fetchWindowCoins(force = false) {
    try {
      const url = force ? '/api/birdeye-window?force=1' : '/api/birdeye-window';
      const res = await fetch(url, force ? { cache: 'no-store' } : undefined);
      if (!res.ok) return { source: 'Birdeye (error)', coins: [] };
      const json = await res.json();
      return { source: json.source || 'Birdeye', coins: json.coins || [] };
    } catch {
      return { source: 'Birdeye (failed)', coins: [] };
    }
  }
  
  async function getWindowCoinsManaged({ force = false } = {}) {
    const mgr = birdeyeMgrRef.current;
    const now = Date.now();
    const RAM_TTL = 20_000;
    
    if (!force && mgr.data && mgr.ts && now - mgr.ts < RAM_TTL) {
      return { ...mgr.data, _reqId: mgr.reqId };
    }
    if (!force && mgr.promise) {
      return { ...(await mgr.promise), _reqId: mgr.reqId };
    }
    
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
  
  useEffect(() => {
    let cancelled = false;
    
    async function load() {
      try {
        const cached = sessionStorage.getItem(CACHE.SESSION_DATA);
        const cachedAt = Number(sessionStorage.getItem(CACHE.SESSION_TIME) || 0);
        const fresh = cached && cachedAt && Date.now() - cachedAt < 15 * 60 * 1000;
        
        if (fresh) {
          const parsed = JSON.parse(cached);
          if (parsed?.coins?.length > 0 && !cancelled) {
            setCoinsAll(parsed.coins);
            setDataSource(parsed.source || 'Birdeye (cache)');
            setCgOk(true);
            setLastUpdateUTC(new Date(cachedAt).toUTCString().slice(17, 22) + ' UTC');
            return;
          }
        }
        
        const { source, coins } = await getWindowCoinsManaged({ force: false });
        if (!cancelled && coins.length > 0) {
          setCoinsAll(coins);
          setDataSource(source);
          const now = Date.now();
          sessionStorage.setItem(CACHE.SESSION_DATA, JSON.stringify({ source, coins }));
          sessionStorage.setItem(CACHE.SESSION_TIME, String(now));
          setLastUpdateUTC(new Date(now).toUTCString().slice(17, 22) + ' UTC');
          setCgOk(true);
        }
      } catch {
        if (!cancelled) setCgOk(false);
      }
    }
    
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 10 * 60 * 1000);
    
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);
  
  return { getWindowCoinsManaged };
}
