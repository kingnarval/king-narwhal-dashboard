// lib/store/useAppStore.js
// ============================================================================
// ZUSTAND STORE COMPLET - État global de l'application
// Remplace tous les useState éparpillés dans index.js
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useAppStore = create(
  devtools(
    (set, get) => ({
      // ============================================================================
      // UI STATE
      // ============================================================================
      mounted: false,
      showDebug: typeof process !== 'undefined' && process.env.NEXT_PUBLIC_INTERNAL_DEBUG === '1',
      isMobile: false,
      
      // Panels
      selectedCoin: null,
      closingInfo: false,
      legendOpen: false,
      
      // Hover states (pour les boutons)
      infoHover: false,
      xHover: false,
      
      // ============================================================================
      // DATA STATE
      // ============================================================================
      coinsAll: [],
      coins: [],
      cgOk: false,
      lastUpdateUTC: '…',
      dataSource: 'Birdeye (loading)',
      
      // ============================================================================
      // TTR STATE
      // ============================================================================
      ttrCap: 0,
      ttrData: null,
      ttrLoading: false,
      ttrError: null,
      
      // ============================================================================
      // REFRESH STATE
      // ============================================================================
      refreshing: false,
      cooldownLeft: 0,
      refreshBlockedLeft: 0,
      
      // ============================================================================
      // PANEL STATS (Birdeye 1H/24H pour le panel Info)
      // ============================================================================
      panelStats: null,
      
      // ============================================================================
      // ACTIONS SIMPLES - UI
      // ============================================================================
      setMounted: (value) => set({ mounted: value }, false, 'setMounted'),
      
      setShowDebug: (value) => set({ showDebug: value }, false, 'setShowDebug'),
      
      toggleDebug: () => set(
        (state) => ({ showDebug: !state.showDebug }), 
        false, 
        'toggleDebug'
      ),
      
      setIsMobile: (value) => set({ isMobile: value }, false, 'setIsMobile'),
      
      setSelectedCoin: (coin) => set({ selectedCoin: coin }, false, 'setSelectedCoin'),
      
      setClosingInfo: (value) => set({ closingInfo: value }, false, 'setClosingInfo'),
      
      setLegendOpen: (value) => set({ legendOpen: value }, false, 'setLegendOpen'),
      
      setInfoHover: (value) => set({ infoHover: value }, false, 'setInfoHover'),
      
      setXHover: (value) => set({ xHover: value }, false, 'setXHover'),
      
      // ============================================================================
      // ACTIONS SIMPLES - DATA
      // ============================================================================
      setCoinsAll: (coins) => set({ coinsAll: coins }, false, 'setCoinsAll'),
      
      setCoins: (coins) => set({ coins: coins }, false, 'setCoins'),
      
      setCgOk: (value) => set({ cgOk: value }, false, 'setCgOk'),
      
      setLastUpdateUTC: (value) => set({ lastUpdateUTC: value }, false, 'setLastUpdateUTC'),
      
      setDataSource: (value) => set({ dataSource: value }, false, 'setDataSource'),
      
      // ============================================================================
      // ACTIONS SIMPLES - TTR
      // ============================================================================
      setTtrCap: (value) => set({ ttrCap: value }, false, 'setTtrCap'),
      
      setTtrData: (data) => set({ ttrData: data }, false, 'setTtrData'),
      
      setTtrLoading: (value) => set({ ttrLoading: value }, false, 'setTtrLoading'),
      
      setTtrError: (error) => set({ ttrError: error }, false, 'setTtrError'),
      
      // ============================================================================
      // ACTIONS SIMPLES - REFRESH
      // ============================================================================
      setRefreshing: (value) => set({ refreshing: value }, false, 'setRefreshing'),
      
      setCooldownLeft: (value) => set({ cooldownLeft: value }, false, 'setCooldownLeft'),
      
      setRefreshBlockedLeft: (value) => set({ refreshBlockedLeft: value }, false, 'setRefreshBlockedLeft'),
      
      // ============================================================================
      // ACTIONS SIMPLES - PANEL STATS
      // ============================================================================
      setPanelStats: (stats) => set({ panelStats: stats }, false, 'setPanelStats'),
      
      // ============================================================================
      // ACTIONS COMPLEXES (avec logique métier)
      // ============================================================================
      
      /**
       * Fermer le panel Info avec animation de fadeOut
       * Empêche les "ghost taps" sur mobile
       */
      startCloseInfo: () => {
        const state = get();
        
        // Guard: ne pas fermer si le panel vient d'être ouvert (< 250ms)
        // Cette logique sera gérée dans le composant via lastPanelOpenAtRef
        
        set({ closingInfo: true }, false, 'startCloseInfo');
        
        // Animation fadeOut (300ms) puis reset
        setTimeout(() => {
          set({ 
            selectedCoin: null, 
            closingInfo: false 
          }, false, 'closeInfoComplete');
        }, 300);
      },
      
      /**
       * Fermer le panel Legend avec animation de fadeOut
       */
      startCloseLegend: () => {
        set({ closingInfo: true }, false, 'startCloseLegend');
        
        setTimeout(() => {
          set({ 
            legendOpen: false, 
            closingInfo: false 
          }, false, 'closeLegendComplete');
        }, 300);
      },
      
      /**
       * Ouvrir la légende (ferme le panel Info si ouvert)
       */
      openLegend: () => {
        set({
          selectedCoin: null,
          closingInfo: false,
          legendOpen: true,
        }, false, 'openLegend');
      },
      
      /**
       * Ouvrir le panel Info pour une coin
       * @param {Object} coin - La crypto à afficher
       */
      openCoinInfo: (coin) => {
        set({
          selectedCoin: coin,
          closingInfo: false,
          legendOpen: false, // Ferme la légende si ouverte
        }, false, 'openCoinInfo');
      },
      
      /**
       * Fermer tous les panels
       */
      closeAllPanels: () => {
        set({
          selectedCoin: null,
          legendOpen: false,
          closingInfo: false,
        }, false, 'closeAllPanels');
      },
      
      /**
       * Reset complet de l'état UI (utile pour debug ou logout)
       */
      resetUI: () => {
        set({
          selectedCoin: null,
          closingInfo: false,
          legendOpen: false,
          infoHover: false,
          xHover: false,
          panelStats: null,
        }, false, 'resetUI');
      },
      
      /**
       * Reset complet de toutes les données (garde uniquement l'UI)
       */
      resetData: () => {
        set({
          coinsAll: [],
          coins: [],
          cgOk: false,
          lastUpdateUTC: '…',
          dataSource: 'Birdeye (loading)',
          ttrCap: 0,
          ttrData: null,
          ttrLoading: false,
          ttrError: null,
          refreshing: false,
          cooldownLeft: 0,
          refreshBlockedLeft: 0,
          panelStats: null,
        }, false, 'resetData');
      },
      
      /**
       * Reset TOTAL (UI + Data)
       */
      resetAll: () => {
        get().resetUI();
        get().resetData();
      },
      
      // ============================================================================
      // GETTERS (computed values)
      // ============================================================================
      
      /**
       * Vérifie si un panel est ouvert
       */
      hasOpenPanel: () => {
        const state = get();
        return state.selectedCoin !== null || state.legendOpen;
      },
      
      /**
       * Récupère le nombre total de coins chargés
       */
      getTotalCoinsCount: () => {
        return get().coinsAll.length;
      },
      
      /**
       * Récupère le nombre de coins affichés
       */
      getDisplayedCoinsCount: () => {
        return get().coins.length;
      },
      
      /**
       * Vérifie si TTR est en mode "forging"
       */
      isTTRForging: () => {
        const state = get();
        return state.ttrCap === 0 || state.ttrCap < 100000; // TTR.CORE_VALUE
      },
      
      /**
       * Vérifie si le refresh est disponible
       */
      canRefresh: () => {
        const state = get();
        return !state.refreshing && 
               state.cooldownLeft === 0 && 
               state.refreshBlockedLeft === 0;
      },
    }),
    {
      name: 'woc-store', // Nom dans Redux DevTools
      enabled: typeof window !== 'undefined' && process.env.NODE_ENV === 'development',
    }
  )
);

export default useAppStore;
