"use client";

/**
 * Marca de agua N-patron para modales/cards. Sigue la línea de diseño del frontend.
 */
export function ModalPatternBg({ size = "default" }: { size?: "default" | "small" }) {
  const sizeClass = size === "small" ? "w-[28%] h-[35%]" : "w-[55%] h-[70%]";
  return (
    <div
      className={`absolute bottom-0 right-0 ${sizeClass} opacity-[0.045] select-none pointer-events-none z-[1]`}
      aria-hidden
    >
      <img
        src="/brand/n-patron-black.svg"
        alt=""
        className="w-full h-full object-contain object-right-bottom"
      />
    </div>
  );
}
