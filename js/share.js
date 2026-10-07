// Partage d'une liste par lien : la liste est compressée et encodée dans le fragment de l'URL
// (#/partage/…). Rien n'est stocké sur un serveur, et le fragment n'est jamais envoyé au réseau.

const VERSION = 1;
const MAX_PHRASES = 200;
const MAX_CHARS = 400;

// --- base64url ---------------------------------------------------------------

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// --- compression (deflate-raw si disponible, sinon texte brut) ---------------

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

async function compress(text) {
  const bytes = new TextEncoder().encode(text);
  if ('CompressionStream' in window) return 'z' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
  return 'u' + toBase64Url(bytes);
}

async function decompress(payload) {
  const kind = payload[0];
  const bytes = fromBase64Url(payload.slice(1));
  if (kind === 'u') return new TextDecoder().decode(bytes);
  if (kind === 'z') return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate-raw')));
  throw new Error('format');
}

// --- API -----------------------------------------------------------------------

export async function shareUrl(list) {
  const data = {
    v: VERSION,
    n: list.name,
    t: list.tag,
    p: list.text.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, MAX_PHRASES),
    r: list.reps,
    a: list.pause,
    s: list.speed,
  };
  const base = location.origin + location.pathname;
  return `${base}#/partage/${await compress(JSON.stringify(data))}`;
}

// Renvoie { name, tag, text, reps, pause, speed } ou lève une erreur si le lien est invalide.
export async function decodeShare(payload) {
  const data = JSON.parse(await decompress(payload));
  if (!data || data.v !== VERSION || !Array.isArray(data.p)) throw new Error('format');
  const phrases = data.p
    .filter((x) => typeof x === 'string')
    .map((x) => x.trim().slice(0, MAX_CHARS))
    .filter(Boolean)
    .slice(0, MAX_PHRASES);
  if (!phrases.length) throw new Error('empty');
  return {
    name: (typeof data.n === 'string' && data.n.trim().slice(0, 80)) || '—',
    tag: typeof data.t === 'string' && /^[a-z]{2,3}(-[A-Z]{2})?$/.test(data.t) ? data.t : 'en-US',
    text: phrases.join('\n'),
    reps: Math.min(10, Math.max(1, Number(data.r) || 3)),
    pause: ['auto', '2', '3', '5', '8'].includes(String(data.a)) ? String(data.a) : 'auto',
    speed: Math.min(150, Math.max(50, Number(data.s) || 100)),
  };
}

// Feuille de partage du téléphone si disponible, sinon copie dans le presse-papiers.
// Renvoie 'shared' | 'copied' | 'shown' | 'cancelled'.
// url : lien déjà calculé (sur iPhone, la feuille de partage doit s'ouvrir juste après le toucher,
// sans attente intermédiaire).
export async function shareList(list, message, url) {
  url ||= await shareUrl(list);
  if (navigator.share) {
    try {
      await navigator.share({ title: list.name, text: message, url });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // sinon : on retombe sur la copie
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    prompt(message, url); // dernier recours : l'utilisateur copie le lien lui-même
    return 'shown';
  }
}
