import Reveal from "./Reveal";
import { about } from "../data/content";

export default function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-surface/40 border-y border-line">
      <div className="container-content grid grid-cols-1 lg:grid-cols-[0.9fr_1.3fr] gap-12 lg:gap-16">
        <Reveal>
          <span className="eyebrow">{about.eyebrow}</span>
          <h2 className="h2 mt-6">{about.title}</h2>
          <div className="mt-8 rounded-2xl overflow-hidden border border-line max-w-sm">
            <img
              src="/about/maro.jpg"
              alt="Maro Moya, fondateur d'UNLOCK"
              className="w-full h-auto object-cover"
            />
          </div>
        </Reveal>

        <div className="space-y-6">
          {about.paragraphs.map((p, i) => (
            <Reveal key={i} delay={0.08 * i}>
              <p className="body-lg !text-ivory/80">{p}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
