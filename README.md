# FLUX CINE — app Android

Telas: escolher modelo → enviar 2 vídeos → fonte, CTA, final e efeito sonoro → vídeo pronto.

## Gerar o APK (sem instalar nada)
1. Crie um repositório no GitHub e envie esta pasta inteira.
2. Abra a aba **Actions**: o fluxo "Gerar APK do FLUX CINE" roda sozinho (uns 5 minutos).
3. Quando ficar verde, abra a execução e baixe **FLUX-CINE-apk** em "Artifacts".
4. Descompacte, mande o `FLUX-CINE.apk` para o celular e instale
   (o Android vai pedir para permitir "instalar apps desconhecidos").

## Ou no computador, com Android Studio
    npm install
    npx cap sync android
    npx cap open android     # depois: Build > Build APK

## O que já funciona
- Escolha real de vídeos da galeria do celular, prévia ao vivo da legenda, fontes offline.
- Efeitos sonoros tocam de verdade (gerados no aparelho).
- A barra "editando…" é uma simulação: a edição real precisa de um servidor
  (FFmpeg + legendas automáticas ou uma API como Creatomate/Shotstack),
  ligado no envio dos vídeos e no botão "Baixar vídeo".

Código das telas: `www/index.html`, `www/style.css`, `www/app.js`.
