import Reveal from "./Reveal";
import { testimonials } from "../data/content";

export default function Testimonials() {
  return (
    <section className="py-24 md:py-32 border-t border-line">
      <div className="container-content">
        <Reveal className="max-w-2xl">
          <span className="eyebrow">{testimonials.eyebrow}</span>
          <h2 className="h2 mt-6">{testimonials.title}</h2>
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col sm:flex-row sm:items-center gap-5 mt-10">
          <div className="flex -space-x-4 shrink-0">
            {testimonials.people.map((p, i) => (
              <img
                key={i}
                src={p.photo}
                alt=""
                className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-2 border-void shadow-lg"
              />
            ))}
          </div>
          <p className="text-sm text-muted max-w-sm">{testimonials.caption}</p>
        </Reveal>
      </div>
    </section>
  );
}
