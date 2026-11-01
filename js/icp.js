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

// Usage choisi dans l'onboarding (ex. « general.daily ») → ancien critère « why » du score.
const USE_TO_WHY = { travel: 'travel', daily: 'abroad', family: 'family', fun: 'fun' };
export function whyFromUse(useDetail = '') {
  const [group, detail] = useDetail.split('.');
  return group === 'general' ? USE_TO_WHY[detail] || '' : group || '';
}
