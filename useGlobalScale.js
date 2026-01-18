// useGlobalScale.js
import { useState, useEffect } from "react";
import { LAYOUT } from "./lib/utils/layoutPresets";

export function useGlobalScale() {
  const [state, setState] = useState({
    x: 1,
    y: 1,
    mode: "pc_land",
    offsetX: 0,
    offsetY: 0,
    baseW: 1920,
    baseH: 1080,
  });

  useEffect(() => {
    function update() {
      if (typeof window === "undefined") return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const mode = vw >= vh ? "pc_land" : "pc_port";
      const L = LAYOUT?.[mode] || LAYOUT?.pc_land;

      const baseW = Number(L?.base?.width || 1920);
      const baseH = Number(L?.base?.height || 1080);

      // v1 behavior: STAGE scale is the single source of truth
      const x = vw / baseW;
      const y = vh / baseH;

      setState({
        x,
        y,
        mode,
        offsetX: Number(L?.world?.offsetX || 0),
        offsetY: Number(L?.world?.offsetY || 0),
        baseW,
        baseH,
      });
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return state;
}
