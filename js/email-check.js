// Adresse email : fautes de frappe courantes et domaine capable de recevoir des emails.

// Domaines fréquents. mail.com n'y figure pas exprès : c'est un vrai fournisseur,
// mais beaucoup plus souvent une faute de frappe pour gmail.com (on propose, sans imposer).
const COMMON = [
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.fr', 'outlook.com', 'outlook.fr', 'live.com',
  'live.fr', 'msn.com', 'yahoo.com', 'yahoo.fr', 'icloud.com', 'me.com', 'aol.com', 'gmx.com',
  'gmx.fr', 'proton.me', 'protonmail.com', 'orange.fr', 'free.fr', 'sfr.fr', 'laposte.net',
  'wanadoo.fr', 'bbox.fr', 'yandex.ru', 'mail.ru', 'qq.com', '163.com',
];

// Distance d'édition où l'inversion de deux lettres voisines compte pour une seule faute (« gmial »).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// « ghizlan123@mail.com » → « ghizlan123@gmail.com » ; null si rien de proche.
export function suggestEmail(email) {
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  if (COMMON.includes(domain)) return null;
  // Une seule faute de frappe : au-delà, c'est sans doute un autre domaine (yopmail ≠ hotmail).
  let best = null;
  let bestScore = 2;
  for (const d of COMMON) {
    const score = distance(domain, d);
    if (score < bestScore) [best, bestScore] = [d, score];
  }
  return best ? `${email.slice(0, at)}@${best}` : null;
}

// Demande au Worker si le domaine reçoit des emails (seul le domaine est envoyé).
// Renvoie 'ok' | 'invalid' | 'disposable' ; en cas de doute (hors ligne, délai), 'ok'.
export async function checkEmailDomain(email) {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`api/email-check?domain=${encodeURIComponent(domain)}`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return 'ok';
    const { result } = await res.json();
    return ['invalid', 'disposable'].includes(result) ? result : 'ok';
  } catch {
    return 'ok';
  } finally {
    clearTimeout(timer);
  }
}
