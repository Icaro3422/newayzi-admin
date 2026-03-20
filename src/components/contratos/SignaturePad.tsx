"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";

type Props = {
  /** data URL PNG o null si se borró */
  onDataUrlChange: (dataUrl: string | null) => void;
  className?: string;
};

/** Lienzo para firma manuscrita (ratón / touch). Fondo blanco para detectar trazos vs vacío. */
export function SignaturePad({ onDataUrlChange, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [stroked, setStroked] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = Math.min(200, Math.max(160, Math.round(w * 0.28)));
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setStroked(false);
  }, []);

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.nativeEvent.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.nativeEvent.clientY;
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const emitPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !stroked) {
      onDataUrlChange(null);
      return;
    }
    onDataUrlChange(canvas.toDataURL("image/png"));
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setStroked(true);
  };

  const end = () => {
    if (drawing.current) {
      drawing.current = false;
      last.current = null;
      emitPng();
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setStroked(false);
    onDataUrlChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-white/40 text-[0.62rem] uppercase tracking-[0.12em] font-semibold">Firma manuscrita</p>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-amber-300/90 hover:text-amber-200 font-medium flex items-center gap-1 transition"
        >
          <Icon icon="solar:eraser-bold-duotone" className="text-sm" />
          Limpiar
        </button>
      </div>
      <div className="rounded-xl border border-white/[0.14] overflow-hidden bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
      <p className="text-white/35 text-[0.65rem] leading-relaxed">
        Firma dentro del recuadro con el dedo o el ratón. También puedes subir una imagen PNG/JPEG abajo.
      </p>
    </div>
  );
}
