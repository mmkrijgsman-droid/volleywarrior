import { useState, useEffect, useRef } from 'react';
import { ChevronIcon, XIcon } from './Icons';

export default function BottomSheet({ open, onClose, title, children, snapPoints = [0.4, 0.85] }) {
  const [snapIdx, setSnapIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const startY = useRef(null);
  const sheetRef = useRef(null);

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

  const cycleSnap = () => {
    if (snapIdx < snapPoints.length - 1) setSnapIdx(i => i + 1);
    else setSnapIdx(0);
  };

  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) setSnapIdx(1);
    wasOpen.current = open;
  }, [open, title]);

  const translateY = isDragging ? `calc(${dragDelta}px)` : '0px';
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
          transform: open ? `translateY(${translateY})` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.32,0.72,0,1), transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          background: 'linear-gradient(180deg, #1a1a1a 0%, #111 100%)',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 40px rgba(220,38,38,0.25), 0 -1px 0 rgba(220,38,38,0.4)',
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
            background: 'rgba(220,38,38,0.6)',
            borderRadius: 2,
            marginBottom: 8
          }} />
          <div className="flex items-center justify-between w-full px-4 pb-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ color: '#e5e7eb', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em' }}>
              {title}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleSnap}
                style={{ color: '#9ca3af', padding: '4px', borderRadius: 8 }}
              >
                <ChevronIcon up={snapIdx < snapPoints.length - 1} />
              </button>
              <button
                onClick={onClose}
                style={{ color: '#9ca3af', padding: '4px', borderRadius: 8 }}
              >
                <XIcon size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '12px 16px 24px',
        }}>
          {children}
        </div>
      </div>
    </>
  );
}
