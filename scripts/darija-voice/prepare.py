# Prépare la voix Darija M1 pour Piper : audio 22 050 Hz + sons calculés par le moteur de l'app.
import io, json, os, re, subprocess, sys, tarfile, urllib.request
import numpy as np, pyarrow.parquet as pq, soundfile as sf, librosa

SPK = 'M1'
BASE = 'https://huggingface.co/datasets/Jip7e/doda-darija-cosyvoice2/resolve/main'
OUT = 'dataset'
os.makedirs(f'{OUT}/wav', exist_ok=True)
PHON = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'phon', 'phonemize.cjs')

# Même normalisation que l'app (js/darija.js) avant le moteur espeak.
def normalize(text):
    text = text.replace('ـ', '')
    text = re.sub('[ڭگ]', 'ق', text)
    text = text.replace('ڤ', 'ف')
    return re.sub(r'\s+', ' ', text).strip()

def tars(split):
    lst = urllib.request.urlopen(f'{BASE}/{split}/parquet/data.list').read().decode().split()
    return [l.split('/')[-1] for l in lst]

rows = []
for split in ('train', 'dev'):
    for name in tars(split):
        local = f'cache_{split}_{name}'
        if not os.path.exists(local):
            urllib.request.urlretrieve(f'{BASE}/{split}/parquet/{name}', local)
        t = pq.read_table(local, columns=['utt', 'audio_data', 'text', 'spk'])
        for r in t.to_pylist():
            if r['spk'] != SPK:
                continue
            audio, sr = sf.read(io.BytesIO(r['audio_data']), dtype='float32')
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            dur = len(audio) / sr
            text = normalize(r['text'])
            if not text or not (0.6 <= dur <= 15):
                continue
            audio = librosa.resample(audio, orig_sr=sr, target_sr=22050)
            sf.write(f"{OUT}/wav/{r['utt']}.wav", audio, 22050, subtype='PCM_16')
            rows.append((r['utt'], text, dur))
        print(split, name, len(rows), flush=True)

texts = '\n'.join(json.dumps(t, ensure_ascii=False) for _, t, _ in rows) + '\n'
res = subprocess.run(['node', PHON, 'ar'], input=texts.encode(), capture_output=True, check=True)
ids = [json.loads(l) for l in res.stdout.decode().splitlines() if l]
assert len(ids) == len(rows), (len(ids), len(rows))
with open(f'{OUT}/metadata.csv', 'w', encoding='utf-8') as f:
    for (utt, text, _), p in zip(rows, ids):
        f.write(f"{utt}.wav|{text.replace('|', ' ')}|{' '.join(map(str, p['ids']))}\n")
print('phrases', len(rows), 'heures', round(sum(d for *_, d in rows) / 3600, 2))
