import { useState, useRef, useCallback } from 'react';

export default function PinchZoomCourt({ children }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const lastTapRef = useRef(0);
  const containerRef = useRef(null);

  // Keep refs in sync with state
  const updateScale = (s) => { scaleRef.current = s; setScale(s); };
  const updateTranslate = (t) => { translateRef.current = t; setTranslate(t); };

  const getDistance = (t1, t2) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const getMidpoint = (t1, t2) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const clampTranslate = useCallback((tx, ty, s) => {
    if (s <= 1) return { x: 0, y: 0 };
    const el = containerRef.current;
    if (!el) return { x: tx, y: ty };
    const maxX = (el.offsetWidth * (s - 1)) / 2;
    const maxY = (el.offsetHeight * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    };
  }, []);

  const resetZoom = useCallback(() => {
    updateScale(1);
    updateTranslate({ x: 0, y: 0 });
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const mid = getMidpoint(e.touches[0], e.touches[1]);
      pinchRef.current = { initialDist: dist, initialScale: scaleRef.current };
      panRef.current = { startX: mid.x, startY: mid.y, initialTx: translateRef.current.x, initialTy: translateRef.current.y };
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        resetZoom();
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      if (scaleRef.current > 1) {
        panRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, initialTx: translateRef.current.x, initialTy: translateRef.current.y, singleFinger: true };
      }
    }
  }, [resetZoom]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const mid = getMidpoint(e.touches[0], e.touches[1]);
      const newScale = Math.min(3, Math.max(1, pinchRef.current.initialScale * (dist / pinchRef.current.initialDist)));
      const dx = mid.x - panRef.current.startX;
      const dy = mid.y - panRef.current.startY;
      const newT = clampTranslate(panRef.current.initialTx + dx, panRef.current.initialTy + dy, newScale);
      updateScale(newScale);
      updateTranslate(newT);
    } else if (e.touches.length === 1 && panRef.current?.singleFinger && scaleRef.current > 1) {
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      const newT = clampTranslate(panRef.current.initialTx + dx, panRef.current.initialTy + dy, scaleRef.current);
      updateTranslate(newT);
    }
  }, [clampTranslate]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) {
      if (panRef.current?.singleFinger) panRef.current = null;
      if (scaleRef.current <= 1) { updateScale(1); updateTranslate({ x: 0, y: 0 }); }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 4px', position: 'relative', overflow: 'hidden', touchAction: 'manipulation' }}
    >
      <div style={{
        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        transformOrigin: 'center center',
        willChange: scale > 1 ? 'transform' : 'auto',
        transition: pinchRef.current ? 'none' : 'transform 0.2s ease-out',
      }}>
        {children}
      </div>

      {scale > 1 && (
        <button
          onClick={resetZoom}
          style={{
            position: 'absolute', top: 6, left: 6, zIndex: 60,
            background: 'rgba(220,38,38,0.85)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 800,
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          {scale.toFixed(1)}x ✕
        </button>
      )}
    </div>
  );
}
