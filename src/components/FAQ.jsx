import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import Reveal from "./Reveal";
import { faq } from "../data/content";

function Item({ q, a, isOpen, onClick }) {
  return (
    <div className="border-b border-line">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-6 text-left gap-6"
        aria-expanded={isOpen}
      >
        <span className="text-base md:text-lg font-medium text-ivory">{q}</span>
        <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <Plus size={20} className="text-brass" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-muted pb-6 leading-relaxed max-w-2xl">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="container-content max-w-3xl">
        <Reveal>
          <span className="eyebrow">{faq.eyebrow}</span>
          <h2 className="h2 mt-6">{faq.title}</h2>
        </Reveal>

        <div className="mt-12">
          {faq.items.map((item, i) => (
            <Item
              key={item.q}
              q={item.q}
              a={item.a}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
