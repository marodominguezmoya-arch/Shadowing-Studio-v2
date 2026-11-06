import Reveal from "./Reveal";
import { method } from "../data/content";

export default function Method() {
  return (
    <section id="method" className="py-24 md:py-32">
      <div className="container-content">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">{method.eyebrow}</span>
          <h2 className="h2 mt-6">{method.title}</h2>
          <p className="body-lg mt-6">{method.intro}</p>
        </Reveal>

        <div className="mt-16 relative">
          <div className="hidden md:block absolute left-[27px] top-4 bottom-4 w-px bg-line" />
          <div className="space-y-10 md:space-y-14">
            {method.steps.map((step, i) => (
              <Reveal key={step.n} delay={0.08 * i} className="relative flex gap-6 md:gap-10">
                <div className="shrink-0 w-14 h-14 rounded-full bg-surface border border-line flex items-center justify-center font-mono text-sm text-brass relative z-10">
                  {step.n}
                </div>
                <div className="pt-2">
                  <h3 className="h3">{step.title}</h3>
                  <p className="text-muted mt-2 max-w-xl leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {(method.mechanism || method.outro) && (
          <Reveal delay={0.3} className="mt-14 pt-8 border-t border-line max-w-2xl space-y-4">
            {method.mechanism && <p className="text-sm text-muted leading-relaxed">{method.mechanism}</p>}
            {method.outro && <p className="text-ivory/90 leading-relaxed">{method.outro}</p>}
          </Reveal>
        )}
      </div>
    </section>
  );
}
