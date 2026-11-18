# FLUX CINE — app Android

Vídeos cinematográficos para empresários, editados no próprio celular.

## Fluxo
1. **Modelo**: 6 estilos com vídeos de exemplo e título animado com desfoque, mais a seção **Formatos em alta**.
2. **Vídeos**: o empresário escolhe 2 vídeos. O app **escuta a fala** (offline, em português),
   mostra a transcrição e **corta silêncios e pausas** automaticamente.
3. **Estilo**: fonte do título e da legenda, CTA, final (tela final, fade, zoom out, corte seco) e efeito sonoro.
4. **Pronto**: o vídeo final em 1080×1920, a legenda do post com hashtags e o botão
   **Postar no Instagram**, que abre o Instagram com o vídeo e copia a legenda.
   Também dá para **salvar na galeria** e **compartilhar** (WhatsApp, TikTok…).

## Como o vídeo é montado (tudo no aparelho)
- `SpeechEngine.java`: reconhecimento de voz Vosk (modelo pequeno PT-BR) com o tempo de cada palavra.
- `www/app.js` › `timeline()`: transforma as palavras em trechos sem silêncio e em legendas de até 3 palavras.
- `CineExporter.java`: Media3 Transformer. Recorta e junta os trechos, enquadra em 9:16 e exporta H.264/AAC.
- `CineRenderer.java`: camada gráfica de cada quadro. Título com desfoque e espaçamento animados,
  legenda palavra por palavra, flash na troca de vídeo, CTA e final.
- `SfxMixer.java` / `SfxSynth.java`: efeitos sonoros sintetizados e mixados por cima da voz.

## Builds automáticos (GitHub Actions)
- **Gerar APK do FLUX CINE**: a cada envio, baixa o modelo de voz e os vídeos de exemplo,
  compila e publica o `FLUX-CINE.apk` em *Releases*.
- **Testar edição no Android**: liga um Android virtual, edita um vídeo de teste com fala
  e publica as fotos dos quadros em *Releases › ci-frames*.

## Vídeos de exemplo
São prévias do [Mixkit](https://mixkit.co) (licença gratuita), baixadas durante o build.
Para trocar pelos seus próprios exemplos, mude os números em `media:` dentro de `www/app.js`
e no passo "Vídeos de exemplo" dos dois workflows.

## Limites atuais
- **Tendências**: o Instagram não libera esses dados para outros apps. A seção "Em alta" é uma seleção curada.
- **Postagem direta** (sem abrir o Instagram) exige um app aprovado pela Meta (Instagram Graph API).
- O reconhecimento de voz usa o modelo pequeno, para o app ficar leve. Em ambiente barulhento ele erra mais.
