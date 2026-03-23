import { useState, useEffect, useRef } from 'react';
export default function BottomSheet({ open, onClose, title, children, snapPoints = [0.4, 0.85], onSwipeLeft, onSwipeRight }) {
  const [snapIdx, setSnapIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const startY = useRef(null);
  const sheetRef = useRef(null);
  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);

  const currentSnap = snapPoints[snapIdx];
  const targetHeight = `${currentSnap * 100}vh`;

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
    setDragDelta(0);
  };

  const handleTouchMove = (e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    setDragDelta(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragDelta > 80) {
      if (snapIdx === 0) onClose();
      else setSnapIdx(i => i - 1);
    } else if (dragDelta < -60) {
      if (snapIdx < snapPoints.length - 1) setSnapIdx(i => i + 1);
    }
    setDragDelta(0);
    startY.current = null;
  };

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setSnapIdx(1);
    wasOpen.current = open;
  }, [open, title]);

  const sheetHeight = isDragging
    ? `calc(${targetHeight} - ${dragDelta}px)`
    : targetHeight;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          height: open ? sheetHeight : '0px',
          minHeight: open ? '120px' : '0px',
          transform: open ? 'none' : 'translateY(100%)',
          transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.32,0.72,0,1), transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.1), 0 -1px 0 rgba(220,38,38,0.2)',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle area */}
        <div
          className="flex-shrink-0 flex flex-col items-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none', flexShrink: 0 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div style={{
            width: 40, height: 4,
            background: 'rgba(220,38,38,0.5)',
            borderRadius: 2,
            marginBottom: 8
          }} />
          <div className="flex items-center justify-between w-full px-4 pb-2"
            style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ color: '#1e293b', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em' }}>
              {title}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '12px 16px 80px',
        }}
          onTouchStart={(e) => {
            swipeStartX.current = e.touches[0].clientX;
            swipeStartY.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (swipeStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - swipeStartX.current;
            const dy = e.changedTouches[0].clientY - swipeStartY.current;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              if (dx < 0 && onSwipeLeft) onSwipeLeft();
              else if (dx > 0 && onSwipeRight) onSwipeRight();
            }
            swipeStartX.current = null;
            swipeStartY.current = null;
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
