import Reveal from "./Reveal";
import { caseStudies } from "../data/content";

export default function CaseStudies() {
  return (
    <section id="results" className="py-24 md:py-32 bg-surface/40 border-y border-line">
      <div className="container-content">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">{caseStudies.eyebrow}</span>
          <h2 className="h2 mt-6">{caseStudies.title}</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14">
          {caseStudies.cases.map((c, i) => (
            <Reveal key={c.name} delay={0.08 * i} className="card p-8 md:p-10">
              <div className="flex items-baseline justify-between gap-4 mb-6">
                <h3 className="h3">{c.name}</h3>
                <span className="font-mono text-xs text-muted uppercase tracking-widest shrink-0">{c.context}</span>
              </div>
              <div className="space-y-5">
                <div>
                  <div className="font-mono text-xs text-muted uppercase tracking-widest mb-1.5">Avant</div>
                  <p className="text-sm text-ivory/80 leading-relaxed">{c.before}</p>
                </div>
                <div>
                  <div className="font-mono text-xs text-muted uppercase tracking-widest mb-1.5">La méthode</div>
                  <p className="text-sm text-ivory/80 leading-relaxed">{c.method}</p>
                </div>
                <div>
                  <div className="font-mono text-xs text-brass uppercase tracking-widest mb-1.5">Résultat</div>
                  <p className="text-sm text-ivory leading-relaxed">{c.result}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
