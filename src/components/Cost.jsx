import Reveal from "./Reveal";
import { TrendingDown, MessageSquareOff, Globe2 } from "lucide-react";
import { cost } from "../data/content";

const icons = [TrendingDown, MessageSquareOff, Globe2];

export default function Cost() {
  return (
    <section className="py-24 md:py-32 bg-surface/40 border-y border-line">
      <div className="container-content">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">{cost.eyebrow}</span>
          <h2 className="h2 mt-6">{cost.title}</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line mt-14 rounded-2xl overflow-hidden border border-line">
          {cost.items.map((item, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Reveal key={item.title} delay={0.05 * i} className="bg-void p-8">
                <Icon size={20} className="text-brass mb-4" strokeWidth={1.5} />
                <h3 className="text-base font-medium text-ivory">{item.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{item.desc}</p>
              </Reveal>
            );
          })}
        </div>

        {cost.closing && (
          <Reveal delay={0.2} className="mt-10">
            <p className="body-lg !text-ivory/80 max-w-2xl">{cost.closing}</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
