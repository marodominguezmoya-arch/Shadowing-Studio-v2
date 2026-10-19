# Serveur de voix Darija pour Shadowing Studio (Hugging Face Space, CPU gratuit).
# Modèle : HADRA (Jip7e/habibi-tts-doda-darija, F5-TTS). POST /tts → WAV 24 kHz mono.
# Appelé uniquement par le Worker Cloudflare, qui envoie la clé partagée X-Api-Key.

import io
import os
import threading

import numpy as np
import soundfile as sf
import torch
import torchaudio
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field


# Lecture WAV sans ffmpeg (torchaudio récent passe par torchcodec, qui en a besoin).
def _load(path, *args, **kwargs):
    data, sr = sf.read(path, dtype="float32", always_2d=True)
    return torch.from_numpy(data.T.copy()), sr


torchaudio.load = _load

from f5_tts.infer.utils_infer import infer_process, load_model, load_vocoder  # noqa: E402
from f5_tts.model import DiT  # noqa: E402
from huggingface_hub import hf_hub_download  # noqa: E402

REPO = "Jip7e/habibi-tts-doda-darija"
API_KEY = os.environ.get("API_KEY", "")
HERE = os.path.dirname(os.path.abspath(__file__))
VOICES = {
    name: (os.path.join(HERE, "voices", f"{name}.wav"), open(os.path.join(HERE, "voices", f"{name}.txt")).read().strip() + ". ")
    for name in ("M1", "M2")
}

torch.set_num_threads(os.cpu_count() or 2)
model = load_model(
    DiT,
    dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4),
    hf_hub_download(REPO, "model_ema.safetensors"),
    vocab_file=hf_hub_download(REPO, "vocab.txt"),
    device="cpu",
)
vocoder = load_vocoder("vocos", device="cpu")
lock = threading.Lock()  # une génération à la fois : le CPU est déjà saturé

app = FastAPI()

# Tests en local uniquement (l'app sur localhost appelle ce serveur directement).
if os.environ.get("DEV_CORS"):
    from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:8080"], allow_methods=["*"], allow_headers=["*"])


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=300)
    voice: str = "M1"
    speed: float = Field(default=1.0, ge=0.5, le=1.5)


@app.get("/")
def health():
    return {"ok": True}


@app.post("/tts")
def tts(req: TtsRequest, x_api_key: str = Header(default="")):
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=401)
    if req.voice not in VOICES:
        raise HTTPException(status_code=400, detail="voice")
    ref_audio, ref_text = VOICES[req.voice]
    with lock:
        wav, sr, _ = infer_process(
            ref_audio, ref_text, req.text.strip(), model, vocoder,
            speed=0.95 * req.speed, nfe_step=16, cfg_strength=2.0, sway_sampling_coef=-1.0, device="cpu",
        )
    buf = io.BytesIO()
    sf.write(buf, np.asarray(wav, dtype=np.float32), sr, format="WAV", subtype="PCM_16")
    return Response(buf.getvalue(), media_type="audio/wav")
