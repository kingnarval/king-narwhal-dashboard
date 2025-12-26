import { useEffect, useState } from "react";

/**
 * Hook global – gère l’échelle de toute la scène War of Coins
 * Basé sur une résolution de référence 1920x1080
 * Ajuste automatiquement au redimensionnement de la fenêtre
 */

export function useGlobalScale() {
  const [scale, setScale] = useState({ x: 1, y: 1 });

  useEffect(() => {
    function updateScale() {
      const baseW = 1920;
      const baseH = 1080;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Calcule l’échelle relative à la taille de l’écran
      const scaleX = w / baseW;
      const scaleY = h / baseH;

      // 🔧 Zoom global : ajuste ici pour réduire ou agrandir toute la scène
      const globalZoom = 1; // <— tu peux changer cette valeur (ex: 0.95, 0.8…)

      setScale({ x: scaleX * globalZoom, y: scaleY * globalZoom });
    }

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return scale;

}