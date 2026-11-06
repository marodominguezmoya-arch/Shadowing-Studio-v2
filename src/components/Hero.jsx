import { Suspense, lazy, useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { hero } from "../data/content";

const HeroScene = lazy(() => import("./HeroScene"));

export default function Hero() {
  const [isDesktop, setIsDesktop] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Le sous-titre/CTA rétrécit et s'efface au fil du scroll — le titre, lui, ne bouge pas.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const subScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.82]);
  const subOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const subY = useTransform(scrollYProgress, [0, 0.6], [0, -40]);

  return (
    <section id="top" ref={sectionRef} className="relative pt-32 md:pt-44 pb-24 md:pb-32 overflow-hidden min-h-[85vh]">
      {isDesktop && (
        <div className="absolute top-1/2 right-[-6%] -translate-y-1/2 w-[560px] h-[560px] pointer-events-none">
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        </div>
      )}

      <div className="container-content relative">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <span className="eyebrow">{hero.eyebrow}</span>
          <h1 className="h1 mt-6">{hero.headline}</h1>

          <motion.div
            style={{ scale: subScale, opacity: subOpacity, y: subY }}
            className="origin-top-left"
          >
            <p className="body-lg mt-6 max-w-xl">{hero.sub}</p>

            <div id="hero-cta-marker" className="mt-10">
              <a href="#apply" className="btn-primary">
                {hero.ctaPrimary} <ArrowRight size={16} />
              </a>
            </div>
            {hero.microcopy && (
              <p className="font-mono text-xs text-muted mt-4 tracking-wide">{hero.microcopy}</p>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
