import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta-marker");
    const apply = document.getElementById("apply");
    const onScroll = () => {
      if (!hero || !apply) return;
      const past = hero.getBoundingClientRect().bottom < 0;
      const reached = apply.getBoundingClientRect().top < window.innerHeight * 0.6;
      setVisible(past && !reached);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 sm:hidden"
        >
          <a href="#apply" className="btn-primary w-full max-w-sm shadow-2xl shadow-black/50">
            Candidater
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
