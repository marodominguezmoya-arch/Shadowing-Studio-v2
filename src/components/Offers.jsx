import Reveal from "./Reveal";
import { Check, ArrowRight } from "lucide-react";
import { offers } from "../data/content";
import { trackEvent } from "../lib/analytics";

function Points({ items }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((p) => (
        <li key={p} className="flex items-start gap-3 text-sm text-ivory/90 leading-relaxed">
          <Check size={16} className="text-brass mt-0.5 shrink-0" strokeWidth={2} />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Offers() {
  const { premium, diagnostic } = offers;
  const diagnosticHref = diagnostic.paymentUrl || "#apply";
  const diagnosticIsExternal = Boolean(diagnostic.paymentUrl);

  return (
    <section id="offers" className="py-24 md:py-32 bg-surface/40 border-y border-line">
      <div className="container-content">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">{offers.eyebrow}</span>
          <h2 className="h2 mt-6">{offers.title}</h2>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-14">
          {/* Accompagnement : prix volontairement non affiché */}
          <Reveal className="lg:col-span-3 card p-8 md:p-10 !border-brass/40 flex flex-col">
            <span className="eyebrow">{premium.label}</span>
            <h3 className="h3 mt-4">{premium.name}</h3>
            <p className="font-mono text-xs uppercase tracking-widest text-muted mt-3">{premium.duration}</p>
            <p className="text-ivory/80 mt-5 leading-relaxed max-w-lg">{premium.lead}</p>
            <Points items={premium.points} />
            <div className="mt-auto pt-10">
              <p className="text-sm text-muted mb-5">{premium.priceNote}</p>
              <a
                href="#apply"
                onClick={() => trackEvent("offer_cta_click", { offer: "premium" })}
                className="btn-primary"
              >
                {premium.cta} <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>

          {/* Diagnostic : prix public */}
          <Reveal delay={0.1} className="lg:col-span-2 card p-8 md:p-10 flex flex-col">
            <span className="font-mono text-xs tracking-[0.2em] uppercase text-muted">{diagnostic.label}</span>
            <h3 className="h3 mt-4">{diagnostic.name}</h3>
            <div className="font-display font-extrabold text-5xl md:text-6xl text-ivory mt-4 tracking-tight">
              {diagnostic.price}
            </div>
            <p className="text-ivory/80 mt-5 leading-relaxed">{diagnostic.lead}</p>
            <Points items={diagnostic.points} />
            <div className="mt-auto pt-10">
              <p className="text-sm text-brass mb-5">{diagnostic.priceNote}</p>
              <a
                href={diagnosticHref}
                {...(diagnosticIsExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                onClick={() => trackEvent("offer_cta_click", { offer: "diagnostic" })}
                className="btn-secondary"
              >
                {diagnostic.cta} <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
