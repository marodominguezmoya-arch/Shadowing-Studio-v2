import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Reveal from "./Reveal";
import { application } from "../data/content";
import { trackEvent } from "../lib/analytics";

// Web3Forms access key — hardcoded on purpose. This key is not a secret: it's
// already visible in every form submission's network request, so there's no
// confidentiality gained by keeping it in an environment variable instead.
const WEB3FORMS_ACCESS_KEY = "9c6840d4-eb33-40e0-9c85-7c9e9012b15a";

const fieldConfig = {
  name: { label: "Nom complet", type: "text", placeholder: "Jeanne Dupont" },
  email: { label: "Email", type: "text", placeholder: "toi@email.com" },
  instagram: { label: "Instagram (ou LinkedIn)", type: "text", placeholder: "@toncompte" },
  business: { label: "Ta situation, en une phrase", type: "text", placeholder: "Directrice marketing dans l'agroalimentaire" },
  country: { label: "Pays / ville", type: "text", placeholder: "Paris, France" },
  businessModel: {
    label: "Ton profil",
    type: "select",
    options: ["Entrepreneur", "Dirigeant ou cadre", "Profession libérale", "Freelance", "Étudiant / en formation", "Autre"],
  },
  targetLanguage: {
    label: "Quelle langue veux-tu améliorer ?",
    type: "select",
    options: ["Anglais", "Espagnol", "Allemand", "Italien", "Portugais", "Néerlandais", "Autre"],
  },
  desiredResult: {
    label: "Quel résultat concret voudrais-tu obtenir dans les prochaines semaines ?",
    type: "textarea",
    placeholder: "Sois concret — c'est ce qui guide le diagnostic.",
  },
  situations: {
    label: "Dans quelles situations dois-tu l'utiliser ?",
    type: "textarea",
    placeholder: "Ventes, négociation, pitch investisseur, networking...",
  },
  comprehensionToday: {
    label: "Que comprends-tu aujourd'hui ?",
    type: "textarea",
    placeholder: "Podcasts, réunions, emails... à quel point ça passe déjà.",
  },
  blockingSituations: {
    label: "Dans quelles situations bloques-tu ?",
    type: "multiselect",
    options: [
      "Comprendre un podcast / une vidéo",
      "Communiquer en réunions",
      "Présenter / pitcher son offre",
      "Réseau / networking",
      "Tout simplement démarrer à l'oral",
      "Création de contenu dans la langue",
      "Webinars et prise de parole",
    ],
  },
  triedBefore: {
    label: "Qu'as-tu déjà essayé pour progresser dans cette langue ?",
    type: "textarea",
    placeholder: "Cours, applis, prof particulier, immersion...",
  },
  durationBlocked: {
    label: "Depuis combien de temps ?",
    type: "select",
    options: ["Moins de 6 mois", "6 mois à 1 an", "1 à 3 ans", "Plus de 3 ans"],
  },
  helpType: {
    label: "Qu'est-ce que tu recherches aujourd'hui ?",
    type: "select",
    // Les options viennent de content.js pour rester synchronisées avec les routes.
    options: Object.values(application.routes).map((r) => r.match),
  },
  urgencyReason: {
    label: "Pourquoi veux-tu résoudre ce problème maintenant ?",
    type: "select",
    options: [
      "J'ai une opportunité professionnelle qui arrive.",
      "Je dois bientôt utiliser cette langue dans mon business.",
      "Je veux pouvoir travailler avec des clients internationaux.",
      "Je suis frustré de stagner malgré mes efforts.",
      "Je veux simplement progresser à long terme.",
      "Autre.",
    ],
  },
  investmentRange: {
    label: "Quelle fourchette correspond à ce que tu es prêt·e à investir ?",
    type: "select",
    options: ["Moins de 100€", "100€ – 300€", "300€ – 700€", "700€+", "Je préfère en discuter lors de notre échange"],
  },
};

export default function Application() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const totalSteps = application.steps.length;

  const setField = (key, value) => setData((d) => ({ ...d, [key]: value }));

  const toggleMulti = (key, opt) => {
    setData((d) => {
      const current = d[key] || [];
      const next = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
      return { ...d, [key]: next };
    });
  };

  const currentFields = application.steps[step]?.fields || [];
  const isStepValid = currentFields.every((f) => {
    const v = data[f];
    if (fieldConfig[f].type === "multiselect") return Array.isArray(v) && v.length > 0;
    return v && v.length > 0;
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: `Nouvelle candidature UNLOCK — ${data.name || "sans nom"}`,
          from_name: data.name || "Candidat UNLOCK",
          ...data,
          blockingSituations: Array.isArray(data.blockingSituations) ? data.blockingSituations.join(", ") : data.blockingSituations,
        }),
      });
      const result = await res.json();
      if (result.success) {
        trackEvent("application_submitted", { businessModel: data.businessModel, helpType: data.helpType });
        setSubmitted(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="apply" className="relative py-24 md:py-32 border-t border-line overflow-hidden">
      <div className="container-content max-w-2xl relative">
        <Reveal className="text-center">
          <span className="eyebrow">{application.eyebrow}</span>
          <h2 className="h2 mt-6">{application.title}</h2>
          <p className="body-lg mt-6">{application.sub}</p>
        </Reveal>

        <div className="card mt-12 p-6 md:p-10">
          {!submitted ? (
            <>
              <div className="flex items-center gap-2 mb-10">
                {application.steps.map((s, i) => (
                  <div key={s.title} className="flex-1">
                    <div className={`h-1 rounded-full transition-colors ${i <= step ? "bg-brass" : "bg-line"}`} />
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="font-mono text-xs text-muted uppercase tracking-widest mb-1">
                    Étape {step + 1} / {totalSteps}
                  </div>
                  <h3 className="h3 mb-8">{application.steps[step].title}</h3>

                  <div className="space-y-6">
                    {currentFields.map((key) => {
                      const cfg = fieldConfig[key];
                      return (
                        <div key={key}>
                          <label className="block text-sm text-ivory mb-2">{cfg.label}</label>

                          {cfg.type === "text" && (
                            <input
                              type="text"
                              placeholder={cfg.placeholder}
                              value={data[key] || ""}
                              onChange={(e) => setField(key, e.target.value)}
                              className="w-full bg-void border border-line rounded-lg px-4 py-3 text-sm text-ivory placeholder:text-muted/60 focus:border-brass/60 outline-none transition-colors"
                            />
                          )}

                          {cfg.type === "textarea" && (
                            <textarea
                              placeholder={cfg.placeholder}
                              value={data[key] || ""}
                              onChange={(e) => setField(key, e.target.value)}
                              rows={3}
                              className="w-full bg-void border border-line rounded-lg px-4 py-3 text-sm text-ivory placeholder:text-muted/60 focus:border-brass/60 outline-none transition-colors resize-none"
                            />
                          )}

                          {cfg.type === "select" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cfg.options.map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setField(key, opt)}
                                  className={`text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                                    data[key] === opt
                                      ? "border-brass bg-brass/10 text-ivory"
                                      : "border-line text-muted hover:border-ivory/30"
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {cfg.type === "multiselect" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cfg.options.map((opt) => {
                                const active = (data[key] || []).includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggleMulti(key, opt)}
                                    className={`flex items-center justify-between text-left text-sm px-4 py-3 rounded-lg border transition-colors ${
                                      active
                                        ? "border-brass bg-brass/10 text-ivory"
                                        : "border-line text-muted hover:border-ivory/30"
                                    }`}
                                  >
                                    {opt}
                                    {active && <Check size={14} className="text-brass shrink-0 ml-2" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between mt-10 pt-6 border-t border-line">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className={`inline-flex items-center gap-2 text-sm text-muted hover:text-ivory transition-colors ${
                    step === 0 ? "invisible" : ""
                  }`}
                >
                  <ArrowLeft size={16} /> Retour
                </button>

                {step < totalSteps - 1 ? (
                  <button
                    disabled={!isStepValid}
                    onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                    className="btn-primary !py-3 !px-6 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuer <ArrowRight size={16} />
                  </button>
                ) : (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      disabled={!isStepValid || submitting}
                      onClick={handleSubmit}
                      className="btn-primary !py-3 !px-6 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Envoi..." : application.submitLabel} <ArrowRight size={16} />
                    </button>
                    {error && (
                      <p className="text-xs text-red-400 max-w-xs text-right">
                        Une erreur est survenue à l'envoi. Réessaie, ou écris-moi directement si ça persiste.
                      </p>
                    )}
                    {!error && application.submitCaption && (
                      <p className="text-xs text-muted">{application.submitCaption}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-14 h-14 rounded-full bg-brass/10 border border-brass/40 flex items-center justify-center mx-auto mb-6">
                <Check size={24} className="text-brass" />
              </div>
              <h3 className="h3">{application.successTitle}</h3>
              <p className="text-muted mt-3 max-w-sm mx-auto">{application.successBody}</p>
              {(() => {
                const route = Object.values(application.routes || {}).find((r) => r.match === data.helpType);
                return route ? (
                  <p className="text-sm text-ivory/90 mt-6 max-w-sm mx-auto">
                    D'après tes réponses, <span className="text-brass font-medium">{route.name}</span> semble la
                    solution la plus adaptée à ta situation. Je reviens vers toi personnellement sous 48h pour en
                    discuter.
                  </p>
                ) : null;
              })()}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
