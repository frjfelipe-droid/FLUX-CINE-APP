# FLUX CINE — Android e iPhone

Vídeos cinematográficos para empresários, editados no próprio celular.

## Fluxo
1. **Abertura**: logo animado → 3 perguntas → apresentação (Acesso VIP ou Continuar no gratuito).
2. **Cinemático (1 vídeo)** ou **Dinâmico (vários vídeos)**.
3. **46 títulos cinematográficos** (23 estilos × 2 cores), incluindo os estilos de cartaz: Paraíso (vertical), Verão,
   Domingo, Além, Vlog de Viagem (em arco), A Última Chamada, Marcador (escrito à mão) e Tudo Passa (serifa elegante).
   A prévia fica travada; para posicionar, toque em **Mover título**, arraste, ajuste o tamanho e toque em **Pronto**.
4. **Estrutura da fala**: o app escuta e separa
   - **Gancho**: sempre uma pergunta ("?" da transcrição ou palavras de pergunta). Vai para o início, sem cortar palavras;
   - **Mensagem**;
   - **Final de impacto**: zoom "soco", efeito de impacto e legenda maior.
5. **Cortes inteligentes** (aba Cortes): tira silêncios, vícios ("é", "né", "tipo"), gaguejos e palavras repetidas,
   remove repetições de frase (fica a última tomada) e dá um leve zoom alternado a cada corte.
6. **Dinâmico**: chips com cortes **rápidos, lentos e pausas** → mensagem → final de impacto, num vídeo só.
7. **Editor com abas**: player com a cor aplicada ao vivo e linha do tempo com **agulha fixa no centro**
   (arraste a régua para navegar; toque num bloco para corrigir a legenda).
   - **Legenda**: 14+ fontes, tamanho, espaçamento, sombra, efeito, destaque, cor e posição.
   - **Color Cine**: 9 colorações de cinema (Blockbuster, Kodak 400, Fuji Verde, Hora Dourada, Anos 70, Bleach Bypass,
     Luar, Neon Noite, Noir P&B), intensidade, **granulação de filme**, vinheta e faixas de cinema.
   - **Cortes** e **Som e final** (efeitos sonoros, CTA, Alta/4K).
8. Salvo no **Perfil** (assistir, baixar, compartilhar, postar no Instagram, reeditar, apagar).

## Legenda precisa
- **Android**: Whisper (whisper.cpp) rodando no aparelho, sem internet, com pontuação e tempo de cada palavra
  (modelo base incluído). Na aba Legenda dá para ativar o **modo ultra preciso** (modelo small, baixa 190 MB uma vez).
- **iPhone**: reconhecimento de fala da Apple em português, no aparelho, com pontuação.

## Como o vídeo é montado (tudo no aparelho)
- `www/app.js` › `analyze()` / `keptSegments()` / `timeline()`: gancho, cortes, montagem e legendas.
- `www/titles.js`: títulos e legenda; `www/grade.js`: Color Cine (shader WebGL da prévia).
- **Android**: `SpeechEngine.java` + `cpp/whisper_jni.cpp`; `CineExporter.java` (Media3), `CineGrade.java` (mesmo shader),
  `TitleLayer.java` / `CineRenderer.java` (mesmo desenho da prévia).
- **iPhone**: `ios/App/App/FluxEditorPlugin.swift`, `CineExport.swift` (AVFoundation + compositor próprio + Core Image),
  `CineDraw.swift` (títulos e legenda em Core Graphics).

## Builds automáticos (GitHub Actions)
- **Gerar APK do FLUX CINE** → `FLUX-CINE.apk` em *Releases*.
- **Gerar versão iOS do FLUX CINE** → `FLUX-CINE.ipa` em *Releases* (sem assinatura) e teste no simulador de iPhone
  (quadros em *Releases › ci-ios*).
- **Testar edição no Android** → Whisper + exportações de teste; quadros em *Releases › ci-frames*.

## Instalar no iPhone
A Apple não deixa instalar apps fora da App Store sem assinatura. Duas opções:
1. **Sideloadly** ou **AltStore** (grátis): no computador, abra o `FLUX-CINE.ipa`, entre com seu Apple ID e instale.
   Com Apple ID gratuito o app vale 7 dias e precisa ser reinstalado.
2. **Conta Apple Developer** (US$ 99/ano): publica no TestFlight/App Store, sem prazo.

## Limites atuais
- **Tendências**: o Instagram não libera esses dados. A seção "Em alta" é curada.
- **Postagem direta** exige app aprovado pela Meta. Hoje o app abre o Instagram com o vídeo e copia a legenda.
- **Pagamento VIP**: depende de publicar nas lojas. Há um "VIP de teste".
