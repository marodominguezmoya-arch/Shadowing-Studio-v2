import Reveal from "./Reveal";
import { transformation } from "../data/content";

export default function Transformation() {
  return (
    <section className="py-24 md:py-32 bg-surface/40 border-y border-line">
      <div className="container-content">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">{transformation.eyebrow}</span>
          <h2 className="h2 mt-6">{transformation.title}</h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-10 mt-16">
          {transformation.timeline.map((t, i) => (
            <Reveal key={t.when} delay={0.08 * i} className="relative">
              <div className="font-mono text-xs text-brass uppercase tracking-widest">{t.when}</div>
              <div className="h-px w-full bg-line my-4" />
              <h3 className="text-base font-medium text-ivory">{t.title}</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">{t.desc}</p>
            </Reveal>
          ))}
        </div>

        {transformation.closing && (
          <Reveal delay={0.15} className="mt-10">
            <p className="body-lg !text-ivory/80 max-w-2xl">{transformation.closing}</p>
          </Reveal>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line mt-16 rounded-2xl overflow-hidden border border-line">
          <Reveal className="bg-void p-8">
            <span className="font-mono text-xs text-muted uppercase tracking-widest">Avant</span>
            <p className="text-ivory/80 mt-3 leading-relaxed">{transformation.before}</p>
          </Reveal>
          <Reveal delay={0.1} className="bg-void p-8">
            <span className="font-mono text-xs text-brass uppercase tracking-widest">Après</span>
            <p className="text-ivory mt-3 leading-relaxed">{transformation.after}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
