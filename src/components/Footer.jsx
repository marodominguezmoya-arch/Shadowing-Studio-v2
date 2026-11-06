import { brand, footer } from "../data/content";

export default function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="container-content flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="font-display font-semibold text-lg">
            {brand.name}
            <span className="text-muted font-body text-xs ml-2">{brand.by}</span>
          </div>
          <div className="text-xs text-muted mt-1">{footer.tagline}</div>
        </div>
        <div className="flex gap-8">
          {footer.links.map((l) => (
            <a key={l.label} href={l.href} className="text-sm text-muted hover:text-ivory transition-colors">
              {l.label}
            </a>
          ))}
        </div>
        <div className="text-xs text-muted/60 font-mono">
          © {new Date().getFullYear()} {brand.name} {brand.by}
        </div>
      </div>
    </footer>
  );
}
