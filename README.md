# FLUX CINE — app Android

Vídeos cinematográficos para empresários, editados no próprio celular.

## Fluxo
1. **Abertura**: logo animado → 3 perguntas → apresentação (Acesso VIP ou Continuar no gratuito).
2. **Cinemático (1 vídeo)** ou **Dinâmico (vários vídeos)**.
3. **30 títulos cinematográficos** (15 estilos × 2 cores). Toque para ver a prévia, **arraste** o título e ajuste o **tamanho**.
4. **Estrutura da fala**: o app escuta e separa
   - **Gancho**: sempre uma pergunta. Vai para o início, com corte limpo, sem cortar palavras;
   - **Mensagem**;
   - **Final de impacto**: zoom "soco", efeito de impacto e legenda maior.
   Repetições (quando a pessoa grava a mesma frase de novo) são removidas, ficando a última tomada. Dá para tirar ou pôr qualquer trecho.
5. **Dinâmico**: chips (vídeos curtos) com cortes **rápidos, lentos e pausas** → mensagem → final de impacto, num vídeo só. 6 modelos de ritmo.
6. **Legenda em linha do tempo**: player do corte, trilha com gancho/mensagem/final, blocos de legenda editáveis.
   Estilos: 14 fontes, tamanho, espaçamento, sombra (contorno, suave, dura, brilho), efeito (pop, pulo, surgir, palavra a palavra), destaque, cor e posição.
7. **Áudio difícil de entender** → o app pergunta: legenda sim/não, efeitos sim/não.
8. **Alta (grátis) ou 4K (VIP)** → salvo no **Perfil** (assistir, baixar, compartilhar, postar no Instagram, reeditar, apagar).

## Como o vídeo é montado (tudo no aparelho)
- `SpeechEngine.java`: Vosk PT-BR offline, com tempo e confiança de cada palavra.
- `www/app.js` › `analyze()` / `timeline()`: frases, repetições, gancho-pergunta, final de impacto, montagem dos chips e legendas.
- `www/titles.js`: os 30 modelos e o desenho da legenda (a prévia do app).
- `TitleLayer.java` / `CineRenderer.java`: o mesmo desenho no vídeo final.
- `CineExporter.java`: Media3 1.9. Chips com velocidade são gravados antes; depois tudo é juntado com título,
  legenda, zoom de impacto e a trilha de efeitos (`SfxSynth.writeTrack`).

## Builds automáticos (GitHub Actions)
- **Gerar APK do FLUX CINE**: publica o `FLUX-CINE.apk` em *Releases*.
- **Testar edição no Android**: Android virtual que abre o app e exporta vídeos de teste (cinemático, legenda com brilho,
  dinâmico com chips rápido/lento/pausa e 4K). As fotos dos quadros ficam em *Releases › ci-frames*.

## Limites atuais
- **Tendências**: o Instagram não libera esses dados. A seção "Em alta" é curada.
- **Postagem direta** exige app aprovado pela Meta. Hoje o app abre o Instagram com o vídeo e copia a legenda.
- **Pagamento VIP**: depende de publicar na Google Play. Há um "VIP de teste".
- **Gancho**: a pergunta é reconhecida pelas palavras ("você sabia", "como", "por que", "qual"…), não pela entonação.
