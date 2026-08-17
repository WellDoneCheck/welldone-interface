'use client';

import { useState, useEffect, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [position, setPosition] = useState({ x: 15, y: 600});
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    movedRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      movedRef.current = true;
    }

    setPosition({
      x: dragRef.current.startPosX + dx,
      y: dragRef.current.startPosY + dy,
    });
  }

  function handlePointerUp() {
    setDragging(false);
    if (!movedRef.current) {
      setDark(!dark);
    }
  }

  return (
    <button
      className={`fixed z-[9999] w-12 h-12 rounded-full border-0 flex items-center justify-center touch-none select-none shadow-[0_4px_16px_rgba(0,0,0,0.2)] bg-white dark:bg-slate-800 ${
        dragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-[background-color] duration-200'
      }`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {dark
        ? <Sun size={22} className="text-amber-400" />
        : <Moon size={22} className="text-slate-500" />
      }
    </button>
  );
}