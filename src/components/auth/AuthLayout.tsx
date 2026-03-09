"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { ReactNode, useEffect, useRef, useState } from "react";

/* ─── Slides del panel de marca ─── */
const slides = [
  { id: "nombre",    tag: "El origen del nombre",      content: "nombre"    },
  { id: "mision",   tag: "Nuestra misión",             content: "mision"    },
  { id: "rewards",  tag: "Newayzi Rewards",            content: "rewards"   },
  { id: "niveles",  tag: "Cómo subir de nivel",        content: "niveles"   },
  { id: "ecosistema", tag: "Un ecosistema completo",   content: "ecosistema"},
  { id: "tecnologia", tag: "Tecnología que impulsa",   content: "tecnologia"},
];

const SLIDE_DURATION = 5500; // ms

/* ── Util: contenedor de icono con fondo coloreado ── */
function IconBubble({
  icon,
  bgColor,
  iconColor,
  size = "md",
}: {
  icon: string;
  bgColor: string;
  iconColor: string;
  size?: "sm" | "md" | "lg";
}) {
  const sz = size === "sm" ? "w-7 h-7 text-base" : size === "lg" ? "w-11 h-11 text-2xl" : "w-9 h-9 text-xl";
  return (
    <div className={`${sz} ${bgColor} rounded-xl flex items-center justify-center shrink-0`}>
      <Icon icon={icon} className={iconColor} />
    </div>
  );
}

/* ── Util: card base ── */
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.12] bg-white/[0.07] backdrop-blur-sm px-4 py-3.5 ${className}`}>
      {children}
    </div>
  );
}

/* ─── Slide: origen del nombre ─── */
function SlideNombre() {
  const parts = [
    { word: "New",     meaning: "Nuevo\nen inglés"   },
    { word: "+",       meaning: ""                    },
    { word: "Way",     meaning: "Lugar\nen inglés"    },
    { word: "+",       meaning: ""                    },
    { word: "Spazi",   meaning: "Espacio\nen italiano"},
    { word: "=",       meaning: ""                    },
    { word: "Newayzi", meaning: "Resultado", highlight: true },
  ];
  return (
    <div className="flex flex-col gap-7">
      <p className="font-sora font-light text-white leading-tight" style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.5rem)" }}>
        Nuevas formas<br /><span className="font-black">de espacios.</span>
      </p>

      {/* Fórmula del nombre */}
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.07] px-5 py-4 flex items-start gap-3 flex-wrap">
        {parts.map((item, i) =>
          item.meaning ? (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className="font-sora font-bold text-white leading-none"
                style={{
                  fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)",
                  textDecoration: item.highlight ? "underline" : "none",
                  textDecorationColor: "rgba(255,255,255,0.4)",
                  textUnderlineOffset: "4px",
                }}
              >
                {item.word}
              </span>
              <span className="font-sora text-white/50 text-[0.6rem] leading-tight whitespace-pre-line text-center">
                {item.meaning}
              </span>
            </div>
          ) : (
            <span key={i} className="font-sora font-light text-white/30 self-start pt-0.5" style={{ fontSize: "clamp(0.95rem, 1.6vw, 1.25rem)" }}>
              {item.word}
            </span>
          )
        )}
      </div>

      <p className="font-sora text-white/60 text-[0.85rem] leading-relaxed">
        Una marca construida desde el lenguaje: nuevo + lugar + espacio.<br />Así nació Newayzi.
      </p>
    </div>
  );
}

/* ─── Slide: misión ─── */
function SlideMision() {
  return (
    <div className="flex flex-col gap-6">
      <blockquote
        className="font-sora font-light text-white leading-snug border-l-[3px] border-white/30 pl-5"
        style={{ fontSize: "clamp(1.2rem, 2vw, 1.625rem)" }}
      >
        "Conectar personas con los{" "}
        <span className="font-bold">espacios que transforman</span>{" "}
        su forma de vivir, trabajar y crear."
      </blockquote>
      <p className="font-sora text-white/60 text-sm leading-relaxed">
        Desde Colombia, construimos puentes entre operadores, agentes y usuarios
        que buscan experiencias inmobiliarias distintas.
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { value: "3+", label: "Ciudades",    icon: "solar:map-point-bold-duotone",  bg: "bg-blue-500/20",   ic: "text-blue-300"   },
          { value: "∞",  label: "Propiedades", icon: "solar:buildings-2-bold-duotone", bg: "bg-violet-500/20", ic: "text-violet-300" },
          { value: "1",  label: "Plataforma",  icon: "solar:global-bold-duotone",      bg: "bg-indigo-500/20", ic: "text-indigo-300" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/[0.12] bg-white/[0.07] px-3 py-3.5 flex flex-col items-center gap-2">
            <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center`}>
              <Icon icon={stat.icon} className={`${stat.ic} text-lg`} />
            </div>
            <p className="font-sora font-black text-white text-xl leading-none">{stat.value}</p>
            <p className="font-sora text-white/50 text-[0.65rem] uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Slide: Newayzi Rewards overview ─── */
function SlideRewards() {
  const levels = [
    {
      name: "Member",
      badge: "Nivel base",
      icon: "solar:medal-ribbon-bold-duotone",
      iconBg: "bg-slate-400/20",
      iconColor: "text-slate-200",
      accentBar: "bg-slate-400",
      nameColor: "text-slate-100",
      desc: "Cashback desde tu primera reserva confirmada.",
    },
    {
      name: "Plus",
      badge: "Nivel medio",
      icon: "solar:medal-ribbon-bold-duotone",
      iconBg: "bg-violet-400/25",
      iconColor: "text-violet-200",
      accentBar: "bg-violet-400",
      nameColor: "text-violet-200",
      desc: "Mayor cashback y beneficios exclusivos por volumen.",
    },
    {
      name: "Premium",
      badge: "Nivel máximo",
      icon: "solar:crown-bold-duotone",
      iconBg: "bg-amber-400/25",
      iconColor: "text-amber-200",
      accentBar: "bg-amber-400",
      nameColor: "text-amber-200",
      desc: "Máximo cashback, prioridad total y acceso especial.",
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-sora font-light text-white leading-snug" style={{ fontSize: "clamp(1.2rem, 2vw, 1.625rem)" }}>
          Cada reserva te{" "}<span className="font-bold">acerca a más beneficios.</span>
        </p>
        <p className="font-sora text-white/60 text-[0.82rem] leading-relaxed mt-1.5">
          Newayzi Rewards premia tu actividad. Cuanto más reservas, más ganas.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {levels.map((lvl) => (
          <div key={lvl.name} className="flex items-center gap-3.5 rounded-2xl border border-white/[0.12] bg-white/[0.07] px-4 py-3 overflow-hidden relative">
            {/* Barra de acento lateral */}
            <div className={`absolute left-0 top-3 bottom-3 w-[3px] ${lvl.accentBar} rounded-r-full`} />
            <div className="pl-1">
              <IconBubble icon={lvl.icon} bgColor={lvl.iconBg} iconColor={lvl.iconColor} size="sm" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-sora font-bold text-sm leading-none ${lvl.nameColor}`}>{lvl.name}</p>
                <span className="font-sora text-white/30 text-[0.6rem] uppercase tracking-wide">{lvl.badge}</span>
              </div>
              <p className="font-sora text-white/60 text-[0.73rem] leading-relaxed mt-1">{lvl.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.07] px-4 py-2.5">
        <IconBubble icon="solar:stars-bold-duotone" bgColor="bg-yellow-400/20" iconColor="text-yellow-300" size="sm" />
        <p className="font-sora text-white/70 text-[0.78rem] leading-snug">
          Tus puntos se pueden{" "}
          <span className="text-white font-semibold">canjear como descuento directo</span>{" "}
          en tu próxima reserva.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide: cómo subir de nivel ─── */
function SlideNiveles() {
  const steps = [
    {
      num: "01",
      icon: "solar:calendar-bold-duotone",
      iconBg: "bg-blue-500/25",
      iconColor: "text-blue-300",
      title: "Realiza reservas",
      desc: "Cada booking confirmado y completado suma a tu contador.",
    },
    {
      num: "02",
      icon: "solar:arrow-up-bold-duotone",
      iconBg: "bg-violet-500/25",
      iconColor: "text-violet-300",
      title: "Sube de nivel automáticamente",
      desc: "El sistema evalúa reservas totales, gasto acumulado y actividad mensual.",
    },
    {
      num: "03",
      icon: "solar:wallet-money-bold-duotone",
      iconBg: "bg-green-500/25",
      iconColor: "text-green-300",
      title: "Acumula cashback en puntos",
      desc: "Un porcentaje de cada reserva se acredita como puntos Rewards.",
    },
    {
      num: "04",
      icon: "solar:tag-price-bold-duotone",
      iconBg: "bg-amber-500/25",
      iconColor: "text-amber-300",
      title: "Canjea en tu próxima reserva",
      desc: "Aplica tus puntos como descuento directo al momento de pagar.",
    },
  ];
  return (
    <div className="flex flex-col gap-5">
      <p className="font-sora font-light text-white leading-snug" style={{ fontSize: "clamp(1.2rem, 2vw, 1.625rem)" }}>
        Así funciona{" "}<span className="font-bold">Newayzi Rewards.</span>
      </p>
      <div className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center shrink-0">
              <IconBubble icon={step.icon} bgColor={step.iconBg} iconColor={step.iconColor} size="sm" />
              {i < steps.length - 1 && <div className="w-px flex-1 min-h-[10px] bg-white/10 mt-1.5 mb-0.5" />}
            </div>
            <div className="pt-0.5 pb-2">
              <p className="font-sora font-semibold text-white text-[0.85rem] leading-snug">{step.title}</p>
              <p className="font-sora text-white/55 text-[0.72rem] leading-relaxed mt-0.5">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.07] px-4 py-2.5">
        <IconBubble icon="solar:info-circle-bold-duotone" bgColor="bg-violet-500/25" iconColor="text-violet-300" size="sm" />
        <p className="font-sora text-white/60 text-[0.73rem] leading-snug">
          Tu nivel y puntos se actualizan automáticamente al completar cada reserva.
        </p>
      </div>
    </div>
  );
}

/* ─── Slide: ecosistema ─── */
function SlideEcosistema() {
  const roles = [
    {
      icon: "solar:buildings-2-bold-duotone",
      iconBg: "bg-violet-500/25", iconColor: "text-violet-200",
      name: "Operadores",
      desc: "Publican, configuran y gestionan propiedades en la plataforma.",
    },
    {
      icon: "solar:handshake-bold-duotone",
      iconBg: "bg-blue-500/25", iconColor: "text-blue-200",
      name: "Agentes",
      desc: "Conectan propiedades con los clientes y gestionan relaciones.",
    },
    {
      icon: "solar:home-2-bold-duotone",
      iconBg: "bg-indigo-500/25", iconColor: "text-indigo-200",
      name: "Usuarios",
      desc: "Encuentran, reservan y viven experiencias en espacios únicos.",
    },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-sora font-light text-white leading-snug" style={{ fontSize: "clamp(1.2rem, 2vw, 1.625rem)" }}>
          Un ecosistema donde{" "}<span className="font-bold">todos ganan.</span>
        </p>
        <p className="font-sora text-white/60 text-[0.82rem] leading-relaxed mt-1.5">
          Tres roles, una sola plataforma. Cada uno con herramientas diseñadas para sus necesidades.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        {roles.map((role, i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-2xl border border-white/[0.12] bg-white/[0.07] px-4 py-3.5">
            <IconBubble icon={role.icon} bgColor={role.iconBg} iconColor={role.iconColor} />
            <div>
              <p className="font-sora font-semibold text-white text-sm leading-snug">{role.name}</p>
              <p className="font-sora text-white/55 text-[0.75rem] leading-relaxed mt-0.5">{role.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Slide: tecnología ─── */
function SlideTecnologia() {
  const features = [
    { icon: "solar:bolt-bold-duotone",            label: "Disponibilidad en tiempo real",      bg: "bg-yellow-500/20", ic: "text-yellow-200" },
    { icon: "solar:card-bold-duotone",             label: "Pagos integrados y seguros",         bg: "bg-green-500/20",  ic: "text-green-200"  },
    { icon: "solar:chat-round-dots-bold-duotone",  label: "Comunicación directa con Chatiico",  bg: "bg-blue-500/20",   ic: "text-blue-200"   },
    { icon: "solar:gift-bold-duotone",             label: "Programa de lealtad y beneficios",   bg: "bg-pink-500/20",   ic: "text-pink-200"   },
    { icon: "solar:chart-square-bold-duotone",     label: "Panel de métricas y reportes",       bg: "bg-purple-500/20", ic: "text-purple-200" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-sora font-light text-white leading-snug" style={{ fontSize: "clamp(1.2rem, 2vw, 1.625rem)" }}>
          Tecnología pensada{" "}<span className="font-bold">para el sector.</span>
        </p>
        <p className="font-sora text-white/60 text-[0.82rem] leading-relaxed mt-1.5">
          Todo en una sola plataforma. Sin fricciones, sin silos.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-xl border border-white/[0.10] bg-white/[0.05] px-3.5 py-2.5">
            <IconBubble icon={f.icon} bgColor={f.bg} iconColor={f.ic} size="sm" />
            <p className="font-sora text-white/80 text-[0.82rem] leading-snug font-medium">{f.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const slideComponents: Record<string, ReactNode> = {
  nombre:     <SlideNombre />,
  mision:     <SlideMision />,
  rewards:    <SlideRewards />,
  niveles:    <SlideNiveles />,
  ecosistema: <SlideEcosistema />,
  tecnologia: <SlideTecnologia />,
};

/* ─── Panel derecho con carousel ─── */
function BrandPanel() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (idx: number) => {
    setVisible(false);
    setTimeout(() => {
      setCurrent(idx);
      setProgress(0);
      setVisible(true);
    }, 260);
  };

  const next = () => goTo((current + 1) % slides.length);

  // Progreso de la barra
  useEffect(() => {
    if (paused) {
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }
    setProgress(0);
    const tick = 50;
    const steps = SLIDE_DURATION / tick;
    let step = 0;
    progressRef.current = setInterval(() => {
      step++;
      setProgress((step / steps) * 100);
      if (step >= steps) clearInterval(progressRef.current!);
    }, tick);
    return () => clearInterval(progressRef.current!);
  }, [current, paused]);

  // Auto-avance
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(next, SLIDE_DURATION);
    return () => clearInterval(intervalRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused]);

  const slide = slides[current];

  return (
    <div
      className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-[#080c3a] select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Fondos */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 90% at 60% 60%, #422DF6 0%, #2318B8 40%, #0e1260 75%, #080c3a 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 75% 15%, rgba(94,44,236,0.45) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 25% 88%, rgba(66,45,246,0.22) 0%, transparent 70%)",
        }}
      />

      {/* Patrón N */}
      <div
        className="absolute bottom-[-5%] right-[-8%] w-[72%] h-[72%] pointer-events-none"
        aria-hidden
      >
        <img
          src="/brand/n-patron-black.svg"
          alt=""
          className="w-full h-full object-contain object-right-bottom"
          style={{ filter: "invert(1)", opacity: 0.055 }}
        />
      </div>

      {/* Barra de progreso */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 z-20">
        <div
          className="h-full bg-white/50 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Contenido */}
      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 w-full h-full">
        {/* Tag del slide */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40" />
          <p className="font-sora text-white/40 text-[0.7rem] uppercase tracking-[0.18em] font-medium">
            {slide.tag}
          </p>
        </div>

        {/* Slide animado */}
        <div
          className="my-auto"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.26s ease, transform 0.26s ease",
          }}
        >
          {slideComponents[slide.content]}
        </div>

        {/* Dots de navegación + indicador pausa */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                className="group relative flex items-center justify-center"
                aria-label={`Ir a slide ${i + 1}`}
              >
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? "22px" : "6px",
                    height: "6px",
                    background: i === current ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
                  }}
                />
              </button>
            ))}
          </div>

          {paused && (
            <span className="font-sora text-white/30 text-[0.65rem] uppercase tracking-wider">
              En pausa
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Layout principal ─── */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex font-sora">
      {/* Panel izquierdo */}
      <div className="w-full lg:w-[48%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 bg-white">
        <div className="mb-10">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/n-patron-black.svg"
              width={36}
              height={36}
              alt="Newayzi"
              className="object-contain shrink-0"
            />
            <span className="font-black font-sora tracking-[-0.03em] text-newayzi-jet text-xl">
              Newayzi
            </span>
          </div>
        </div>
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>

      {/* Panel derecho interactivo */}
      <BrandPanel />
    </div>
  );
}
