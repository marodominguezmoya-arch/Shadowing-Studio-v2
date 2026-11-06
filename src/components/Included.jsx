import Reveal from "./Reveal";
import { Check } from "lucide-react";
import { included } from "../data/content";

export default function Included() {
  return (
    <section className="py-24 md:py-32">
      <div className="container-content">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">{included.eyebrow}</span>
          <h2 className="h2 mt-6">{included.title}</h2>
        </Reveal>

        {included.personalization && (
          <Reveal delay={0.05} className="card p-8 md:p-10 mt-10">
            <p className="text-lg md:text-xl leading-relaxed">
              <span className="text-ivory font-medium">{included.personalization.lead}</span>{" "}
              <span className="text-brass font-medium">{included.personalization.statement}</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              {included.personalization.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-xs uppercase tracking-widest text-muted border border-line rounded-full px-3.5 py-1.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Reveal>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line mt-10 rounded-2xl overflow-hidden border border-line">
          {included.items.map((item, i) => (
            <Reveal key={item.title} delay={0.03 * i} className="bg-void p-7">
              <Check size={18} className="text-brass mb-3" strokeWidth={2} />
              <h3 className="text-sm font-medium text-ivory">{item.title}</h3>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">{item.desc}</p>
            </Reveal>
          ))}
        </div>

        {included.closing && (
          <Reveal delay={0.15} className="mt-10">
            <p className="body-lg !text-ivory/80 max-w-2xl">{included.closing}</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
