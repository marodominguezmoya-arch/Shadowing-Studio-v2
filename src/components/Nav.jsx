import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { nav, brand } from "../data/content";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-void/80 backdrop-blur-md border-b border-line" : "bg-transparent"
      }`}
    >
      <nav className="container-content flex items-center justify-between h-16 md:h-20">
        <a href="#top" className="font-display font-semibold text-lg tracking-tight">
          {brand.name}
          <span className="text-muted font-body text-xs ml-2 hidden sm:inline">{brand.by}</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {nav.links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted hover:text-ivory transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a href="#apply" className="hidden sm:inline-flex btn-primary !py-2.5 !px-5 !text-xs">
            {nav.cta}
          </a>
          <button
            aria-label="Ouvrir le menu"
            className="md:hidden p-2 -mr-2"
            onClick={() => setOpen((o) => !o)}
          >
            <div className="w-5 h-px bg-ivory mb-1.5" />
            <div className="w-5 h-px bg-ivory" />
          </button>
        </div>
      </nav>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="md:hidden bg-void border-b border-line"
        >
          <div className="container-content py-4 flex flex-col gap-4">
            {nav.links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-muted">
                {l.label}
              </a>
            ))}
            <a href="#apply" onClick={() => setOpen(false)} className="btn-primary !py-2.5 w-full">
              {nav.cta}
            </a>
          </div>
        </motion.div>
      )}
    </header>
  );
}
