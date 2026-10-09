// Profil idéal (ICP) à partir des réponses de l'onboarding. Même calcul que le Worker
// (worker/src/index.js) : un point par critère.

export function icpScore({ level, blocker, why, deadline }) {
  return [
    ['B1', 'B2'].includes(level),
    blocker === 'speak',
    ['work', 'abroad'].includes(why),
    ['3m', 'year'].includes(deadline),
  ].filter(Boolean).length;
}

// « Je comprends mais je ne parle pas » + au moins deux autres critères : invité au diagnostic.
export const isHot = (answers) => answers.blocker === 'speak' && icpScore(answers) >= 3;
