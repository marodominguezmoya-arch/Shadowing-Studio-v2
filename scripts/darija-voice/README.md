# Voix Darija (Piper) — comment elle est fabriquée

1. `prepare.py` (Mac) : extrait la voix M1 du corpus DODa (Jip7e/doda-darija-cosyvoice2, CC BY 4.0), rééchantillonne
   en 22 050 Hz, normalise le texte comme `js/darija.js`, et calcule les sons avec **le moteur de l'app**
   (`phonemize.cjs` = piper-wasm 1.0.0 dans Node : un module neuf par lot, `callMain` répété plante).
   Résultat publié : huggingface.co/datasets/maromoya/darija-m1-piper.
2. `train_darija_kaggle.ipynb` (Kaggle, GPU gratuit) : réentraîne Kareem (ar_JO, medium) sur ces données
   (piper1-gpl, `--model.warmstart_ckpt`, `dataset_type phoneme_ids`), puis exporte l'ONNX + config.
3. Les fichiers `ary_MA-darija_m1-medium.onnx(.json)` sont hébergés sur huggingface.co/maromoya/piper-darija
   (dépôt de modèle, gratuit) et déclarés dans `js/audio/voices-data.js` (`base`).
