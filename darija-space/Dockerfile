FROM python:3.11-slim

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Modèle et vocodeur téléchargés à la construction : démarrage plus rapide.
RUN python -c "from huggingface_hub import hf_hub_download as d; d('Jip7e/habibi-tts-doda-darija','model_ema.safetensors'); d('Jip7e/habibi-tts-doda-darija','vocab.txt'); d('charactr/vocos-mel-24khz','config.yaml'); d('charactr/vocos-mel-24khz','pytorch_model.bin')"

COPY --chown=user . .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
