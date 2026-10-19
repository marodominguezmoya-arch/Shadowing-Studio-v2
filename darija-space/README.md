---
title: Shadowing Studio Darija
emoji: 🇲🇦
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# Voix Darija de Shadowing Studio

Serveur de synthèse vocale en darija marocain pour [Shadowing Studio](https://maromoya.com/shadowingstudio/).
Il n'est appelé que par le relais Cloudflare de l'app (clé `API_KEY`, secret du Space).

- Modèle : [HADRA — Jip7e/habibi-tts-doda-darija](https://huggingface.co/Jip7e/habibi-tts-doda-darija) (F5-TTS), licence Apache-2.0 déclarée.
- Voix de référence (`voices/`) : extraits du jeu de données [Jip7e/doda-darija-cosyvoice2](https://huggingface.co/datasets/Jip7e/doda-darija-cosyvoice2) (CC BY 4.0), issu de DODa (AtlasIA).
