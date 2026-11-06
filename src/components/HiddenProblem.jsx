import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PlayCircle, MonitorPlay, Smartphone, Bot } from "lucide-react";
import { hiddenProblem } from "../data/content";

// --- Petites illustrations, une par vignette ---

function IntroVisual() {
  return (
    <motion.div
      className="w-16 h-16 rounded-full border-2 border-brass mx-auto"
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ReasonVisual() {
  return (
    <div className="text-center">
      <div className="font-display text-5xl font-extrabold text-ivory">0</div>
      <div className="font-mono text-[11px] text-muted uppercase tracking-widest mt-2">
        minute d'entraînement à la parole
      </div>
    </div>
  );
}

function BricolageVisual() {
  const chips = [
    { label: "YouTube", Icon: PlayCircle },
    { label: "Netflix VO", Icon: MonitorPlay },
    { label: "Une appli", Icon: Smartphone },
    { label: "L'IA", Icon: Bot },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
      {chips.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-xs text-ivory/80 font-mono"
        >
          <c.Icon size={13} className="text-brass shrink-0" />
          {c.label}
        </div>
      ))}
    </div>
  );
}

function VocabVisual() {
  const passive = [92, 88, 95, 82, 90];
  const active = [30, 45, 20, 38, 15];
  return (
    <div className="max-w-xs mx-auto">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2 text-center">Passif</div>
          <div className="flex items-end justify-center gap-1.5 h-16">
            {passive.map((v, i) => (
              <div key={i} className="w-3 bg-void rounded-sm overflow-hidden h-full flex items-end">
                <div className="w-full bg-ivory/60" style={{ height: `${v}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2 text-center">Actif</div>
          <div className="flex items-end justify-center gap-1.5 h-16">
            {active.map((v, i) => (
              <div key={i} className="w-3 bg-void rounded-sm overflow-hidden h-full flex items-end">
                <div className="w-full bg-brass" style={{ height: `${v}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrainVisual() {
  return (
    <div className="max-w-xs mx-auto space-y-5">
      <div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1.5">Langue maternelle</div>
        <div className="relative h-1.5 bg-ivory/70 rounded-full overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full w-3 bg-brass rounded-full"
            animate={{ left: ["0%", "94%"] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
          />
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1.5">Langue cible</div>
        <div className="relative h-1.5 rounded-full overflow-hidden border border-dashed border-line">
          <motion.div
            className="absolute top-0 left-0 h-full w-3 bg-muted/60 rounded-full"
            animate={{ left: ["0%", "20%", "0%"] }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

const visuals = [IntroVisual, ReasonVisual, BricolageVisual, VocabVisual, BrainVisual, null];

// Un mot dont l'opacité, la position et la rotation sont pilotées par le scroll,
// avec un décalage (stagger) selon sa position dans la phrase.
function KineticWord({ word, highlight, progress, start, end }) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [34, 0]);
  const rotate = useTransform(progress, [start, end], [6, 0]);
  const blur = useTransform(progress, [start, end], [8, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);

  return (
    <motion.span
      style={{ opacity, y, rotate, filter, display: "inline-block" }}
      className={highlight ? "text-brass" : undefined}
    >
      {word}
    </motion.span>
  );
}

// Découpe le texte en mots (en préservant les marqueurs **mot-clé**) et anime
// chacun avec un stagger basé sur la progression de scroll de la vignette.
function KineticText({ text, progress, className }) {
  const rawTokens = text.split(/(\*\*[^*]+\*\*)/g).flatMap((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return [{ word: part.slice(2, -2), highlight: true, isWord: true }];
    }
    return part.split(/(\s+)/).map((w) =>
      w.trim() === "" ? { word: w, isWord: false } : { word: w, highlight: false, isWord: true }
    );
  });

  const words = rawTokens.filter((t) => t.isWord);
  const total = words.length;
  let wordCursor = 0;

  return (
    <p className={className}>
      {rawTokens.map((t, i) => {
        if (!t.isWord) return <span key={i}>{t.word}</span>;
        const idx = wordCursor++;
        // Les mots apparaissent en cascade sur les 45 premiers % de la traversée de la vignette.
        const windowStart = 0.45 * (idx / total);
        const windowEnd = windowStart + 0.12;
        return (
          <KineticWord
            key={i}
            word={t.word + " "}
            highlight={t.highlight}
            progress={progress}
            start={windowStart}
            end={windowEnd}
          />
        );
      })}
    </p>
  );
}

// Une vignette dont l'échelle, la rotation 3D et le texte (mot par mot) sont
// directement pilotés par la position de scroll.
function Vignette({ beat, index, Visual }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start 0.4", "end 0.6", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.7, 1.03, 1.03, 0.7]);
  const rotateX = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [18, 0, 0, -18]);
  const containerOpacity = useTransform(scrollYProgress, [0, 0.22, 0.78, 1], [0, 1, 1, 0]);
  const visualOpacity = useTransform(scrollYProgress, [0.3, 0.45], [0, 1]);
  const visualY = useTransform(scrollYProgress, [0.3, 0.45], [24, 0]);

  return (
    <div ref={ref} className="min-h-[90vh] flex items-center justify-center" style={{ perspective: 800 }}>
      <motion.div
        style={{ scale, rotateX, opacity: containerOpacity }}
        className="flex flex-col items-center justify-center text-center px-6"
      >
        {index === 0 && <span className="eyebrow mb-8">{hiddenProblem.eyebrow}</span>}
        <KineticText
          text={beat.text}
          progress={scrollYProgress}
          className={
            index === 0
              ? "font-display text-4xl md:text-6xl font-extrabold text-ivory leading-tight max-w-3xl"
              : "text-3xl md:text-5xl font-extrabold text-ivory leading-snug max-w-3xl"
          }
        />
        {Visual && (
          <motion.div style={{ opacity: visualOpacity, y: visualY }} className="mt-12">
            <Visual />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function HiddenProblem() {
  return (
    <section className="relative py-8 md:py-12">
      {hiddenProblem.beats.map((beat, i) => (
        <Vignette key={i} beat={beat} index={i} Visual={visuals[i]} />
      ))}
    </section>
  );
}
