# 🚀 TetPlayer Desktop — Guia Mestre de Evolução, Diferenciais de Mercado, UI/UX & Roadmap (v2.0.1+)

> **Escopo do Documento:** Planejamento estratégico de produto, pesquisa comparativa de mercado (Plexamp, Cider 2, Roon, Namida, Foobar2000, Pear Desktop / `th-ch/youtube-music`, Spotify e Apple Music), propostas de identidade visual exclusiva, inovações de áudio DSP via Web Audio API e histórico consolidado de engenharia do **TetPlayer Desktop** (Tauri v2 + Rust + React 19 + TypeScript + Tailwind CSS).

---

## 📑 Índice Navegável

1. [Visão Geral da Arquitetura Atual (Estado da Arte v2.0.1+)](#1-visão-geral-da-arquitetura-atual-estado-da-arte-v201)
2. [Pesquisa de Mercado Comparativa & Benchmarking](#2-pesquisa-de-mercado-comparativa--benchmarking)
3. [Catálogo de Sugestões Ativas em Destaque (Organizado por 6 Eixos Estratégicos)](#3-catálogo-de-sugestões-ativas-em-destaque-organizado-por-6-eixos-estratégicos)
   - [Eixo 1: Motor de Áudio, DSP & Qualidade Sonora Audiófila](#eixo-1-motor-de-áudio-dsp--qualidade-sonora-audiófila)
   - [Eixo 2: Identidade Visual Única, Temas & Estética Imersiva](#eixo-2-identidade-visual-única-temas--estética-imersiva)
   - [Eixo 3: Experiência de Letras, Karaokê & Diferenciais Culturais (J-Pop / Vocaloid / Global)](#eixo-3-experiência-de-letras-karaokê--diferenciais-culturais-j-pop--vocaloid--global)
   - [Eixo 4: Navegação, Descoberta, Busca & Ergonomia Desktop](#eixo-4-navegação-descoberta-busca--ergonomia-desktop)
   - [Eixo 5: Curadoria, Biblioteca & Playlists Inteligentes](#eixo-5-curadoria-biblioteca--playlists-inteligentes)
   - [Eixo 6: Ecossistema, Integrações Sociais & Modo Offline](#eixo-6-ecossistema-integrações-sociais--modo-offline)
4. [Matriz de Priorização (Impacto × Esforço) & Roadmap Visual](#4-matriz-de-priorização-impacto--esforço--roadmap-visual)
5. [Histórico Consolidado: 61 Funcionalidades e Otimizações Concluídas](#5-histórico-consolidado-61-funcionalidades-e-otimizações-concluídas)
6. [Plano Diretor de Minimalismo, Despoluição Visual & Redução de Cliques (*Clean UI/UX Overhaul*)](#6-plano-diretor-de-minimalismo-despoluição-visual--redução-de-cliques-clean-uiux-overhaul)

---

## 1. Visão Geral da Arquitetura Atual (Estado da Arte v2.0.1+)

O TetPlayer Desktop evoluiu de um cliente leve para uma plataforma multimídia desktop madura, combinando a leveza nativa do **Tauri v2 + Rust** com uma interface **React 19** otimizada para monitores de alta taxa de atualização (**144 FPS**).

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA ATUAL — TETPLAYER                         │
├──────────────────────────────────────┬───────────────────────────────────────┤
│          FRONTEND (React 19)         │          BACKEND NATIVO (Rust)        │
├──────────────────────────────────────┼───────────────────────────────────────┤
│ • Contextos Desacoplados:            │ • InnerTube Client (ytm.rs):          │
│   PlayerContext + PlaybackProgress   │   HTTP_CLIENT global com pool TLS,    │
│ • Motor de Áudio Dual-Deck:          │   SAPISIDHASH 1P, paginação de até    │
│   AudioEngine (Deck A/B Crossfade +  │   2.500 faixas, CRUD de playlists,    │
│   ReplayGain loudnessDb + GainNode)  │   reordenação determinística, busca   │
│   com fallback transparente p/ IFrame│   nativa de álbuns e StreamInfo       │
│ • UI Virtualizada a 144 FPS:         │ • Persistência Local (stats.rs):      │
│   @tanstack/react-virtual + Drag &   │   SQLite WAL + Compressão flate2      │
│   Drop com Card Flutuante no Portal  │   Deflate + Histórico de Reprodução   │
│ • Efeitos Visuais Acelerados (GPU):  │ • Autenticação Isolada (auth.rs):     │
│   Aurora Boreal (@property CSS),     │   Webview Google Login nativa sem     │
│   Motion Cover 3D, Waveform Seekbar  │   depender de navegadores externos    │
│   com preview de letras e 8 Temas    │ • Integração OS (lib.rs):             │
│ • Mini Player PiP & Docking Lateral  │   System Tray, Global Media Keys,     │
│   com snap magnético Win32           │   Auto-Updater assinado (Minisign)    │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Pesquisa de Mercado Comparativa & Benchmarking

Para definir o que tornará o TetPlayer **inconfundível e superior** às alternativas existentes, analisamos os recursos mais elogiados pelas comunidades de audiófilos e entusiastas nos principais players modernos:

| Player de Referência | Seus Maiores Diferenciais no Mercado | Como o TetPlayer Pode Absorver e Superar |
| :--- | :--- | :--- |
| **Plexamp** | *Waveform Seekbar* (barra de progresso em onda sonora real), *Sweet Fades* (crossfade inteligente), *Sonic Sage / Time Travel Mixes* e *Visualizer Overlays*. | Já absorvemos a **Waveform Seekbar** e o **Dual-Deck True Crossfade**. O próximo passo é criar **Smart Mixes locais** baseados no banco SQLite (`playback_history`). |
| **Cider 2 (Apple Music)** | Estética *Acrylic Glass*, **Modo Camaleão** (cor de destaque do app muda dinamicamente com a capa do álbum), *Sing Mode* (letras com vocal/tradução) e *Turntable Vinyl Mode*. | Adicionar **Tema Camaleão Dinâmico** alimentado pelo `colorWorker.ts`, **Modo Vitrola (Vinil 33⅓ RPM)** na gaveta e **Romanização/Tradução de Letras**. |
| **Roon** | *Signal Path Badge* (mostra com transparência a cadeia de áudio: fonte → codec → DSP → saída) e *Digital Booklet* (páginas ricas de artistas, créditos e discografia). | Já criamos a **Página de Artista Nativa** (`ArtistDetailView`). O próximo passo é o **Signal Path Badge** na `PlayerBar` (`Opus 160kbps • Dual-Deck Engine • ReplayGain`). |
| **Namida / NetEase / Musicolet** | **Desktop Floating Lyrics Overlay** (letras transparentes *click-through* sobre jogos/editores), sincronia palavra-por-palavra e múltiplos perfis de equalização. | Implementar uma segunda janela Tauri transparente e *click-through* (**Karaoke Desktop Overlay**) para exibir a linha atual da letra enquanto o usuário joga ou programa. |
| **Pear Desktop (`th-ch/youtube-music`)** | Plugins de **Discord Rich Presence**, **SponsorBlock** (`music_offtopic`), **Last.fm Scrobbler**, **Downloader MP3/Opus** e servidor de **Controle Remoto**. | Integrar esses recursos **nativamente em Rust** sem o peso de 350 MB de RAM do Electron e com interface unificada. |
| **Foobar2000 / DeaDBeeF** | Foco em zero desperdício de CPU, DSP modular (Equalizador de 10+ bandas, Compressor Noturno, Pitch/Tempo Shift) e busca instantânea por atalhos. | Expandir o grafo Web Audio API do `AudioEngine` com **EQ de 10 Bandas**, **Efeitos DSP (Slowed + Reverb / Nightcore)** e **Command Palette (`Ctrl+K`)**. |

---

## 3. Catálogo de Sugestões Ativas em Destaque (Organizado por 6 Eixos Estratégicos)

> [!NOTE]
> Esta seção destaca **exclusivamente as 21 propostas ativas** que ainda precisam ser implementadas, com numeração sequencial saneada e categorizada por eixo técnico. Todas as funcionalidades já concluídas foram promovidas para a [Seção 5 (Histórico Consolidado)](#5-histórico-consolidado-61-funcionalidades-e-otimizações-concluídas).

---

### Eixo 1: Motor de Áudio, DSP & Qualidade Sonora Audiófila

#### 1.1 Equalizador Paramétrico/Gráfico de 10 Bandas + Efeitos Criativos (*Slowed + Reverb* & *Nightcore*)
* **Status:** `[Em Aberto / Alta Prioridade]` 💡
* **Impacto:** `[Alto para Audiófilos e Comunidade]` | **Esforço:** `[Médio]`
* **Arquitetura no `AudioEngine`:**
  - Inserir uma cadeia de 10 filtros `BiquadFilterNode` (`peaking` em `32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz`) entre o `MediaElementAudioSourceNode` e o `GainNode` em [`audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts).
  - **Predefinições com 1 Clique:** *Flat*, *Bass Boost*, *Vocaloid / J-Pop Clarity* (realce sutil em 2kHz–6kHz e sub-grave limpo), *Rock*, *Acústico*, *Lo-Fi Warmth* e *Night Listening* (com `DynamicsCompressorNode` para ouvir de madrugada sem picos de volume).
  - **Modo Criativo DSP em Tempo Real (Diferencial Único):**
    - **Slowed + Reverb:** Controle de `playbackRate` (`0.85x`–`0.95x` com `preservesPitch = false`) combinado a um `ConvolverNode` sintético leve para ambiência espacial instantânea.
    - **Nightcore / Speed Up:** `playbackRate` (`1.15x`–`1.25x`) ajustável em tempo real sem alterar o arquivo original.
  - **Conector com o Visualizador:** Conectar um `AnalyserNode` real (`getByteFrequencyData`) ao grafo para que o [`SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx) reaja às frequências graves, médias e agudas reais da música quando o motor nativo estiver ativo!

---

#### 1.2 Insígnia de Caminho de Sinal Audiófilo (*Signal Path Badge* estilo Roon)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Charme Técnico]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**
  Um pequeno indicador luminoso na `PlayerBar` ou no cabeçalho do `NowPlayingDrawer` (ex: ponto verde-esmeralda/ciano `OPUS 160k` ou âmbar `IFRAME`). Ao passar o mouse ou clicar, exibe o card de diagnóstico em tempo real:
  - **Fonte:** YouTube Music InnerTube Stream (`itag 251`)
  - **Codec & Bitrate:** `audio/webm; codecs="opus" (~160 kbps)`
  - **Motor Ativo:** `TetPlayer Native Dual-Deck Engine (RAM Pre-buffered)`
  - **Processamento DSP:** `ReplayGain Normalization (-2.4 dB) • Equal-Power Crossfade (3s)`

---

### Eixo 2: Identidade Visual Única, Temas & Estética Imersiva

#### 2.1 Tema "Camaleão Dinâmico" (*Chameleon Dynamic Accent*)
* **Status:** `[Em Aberto / Diferencial de Identidade]` 💡
* **Impacto:** `[Muito Alto / Estética Viva]` | **Esforço:** `[Baixo / Médio]`
* **Descrição Conceitual:**
  Hoje o TetPlayer possui 8 temas fixos em [`settings.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/settings.ts) e o Web Worker [`colorWorker.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/workers/colorWorker.ts) que já extrai a paleta dominante da capa da música para o efeito Aurora.
  - Adicionar uma 9ª opção de tema chamada **"Camaleão (Dinâmico pela Capa)"**.
  - Quando ativa, a cor vibrante principal extraída da capa do álbum (com luminância normalizada para garantir contraste WCAG AA sobre fundo escuro) atualiza dinamicamente as variáveis `--accent`, `--accent-hover`, `--accent-glow` e `--accent-border` do aplicativo inteiro!
  - Se a música atual tem capa azul-ciano (ex: Hatsune Miku), todos os botões, seletores, barras de progresso e indicadores de onda assumem um tom ciano elétrico; na próxima música com capa carmesim (ex: Kasane Teto), toda a UI transiciona suavemente em 750ms para carmesim.

---

#### 2.2 Modo "OLED Abyss" (`#000000` Puro) & Textura Analógica ("Vinyl / Acrylic Grain")
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Alto para Monitores OLED]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**
  - **OLED Abyss Mode:** Opção em *Aparência* que substitui a base `#0b0c10` / `#0e1017` por preto absoluto `#000000` com bordas translúcidas `white/[0.06]`, desligando fisicamente os pixels em monitores OLED/QD-OLED e criando contraste infinito com o glow Aurora.
  - **Textura Sutil de Encarte (*Film / Acrylic Noise*):** Opção de overlay SVG fractal noise ultra-leve (opacidade `1.8%`, `pointer-events-none`) sobre o fundo Aurora da gaveta, eliminando qualquer *color banding* em gradientes escuros e conferindo um acabamento tátil de equipamento de áudio hi-fi.

---

#### 2.3 Modo Vitrola / Vinil Giratório na Gaveta (*Turntable Vinyl Showcase*)
* **Status:** `[Em Aberto / Identidade Visual Única]` 💡
* **Impacto:** `[Alto / Charme Visual]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**
  Expandir o alternador do [`MotionCover.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/MotionCover.tsx) na gaveta de reprodução para 3 modos: **`[Estática]`**, **`[Motion 3D]`** e **`[Vinil]`**.
  - No modo **Vinil**, a capa do álbum se transforma no selo central de um disco de vinil negro translúcido (ou colorido pela paleta da capa) com sulcos especulares concêntricos em CSS, girando suavemente a 33⅓ RPM enquanto `isPlaying === true`.
  - Ao pausar a música, o disco desacelera organicamente com inércia física até parar, acompanhado de um braço minimalista estilizado que repousa ou recolhe.

---

#### 2.4 Modo Tela Cheia Imersivo / "Modo TV & Karaokê" (`F11`)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Alto / Visual]` | **Esforço:** `[Baixo / Médio]`
* **Descrição Conceitual:**
  Inspirado no *Apple Music Sing* e *Spotify Fullscreen Mode*:
  - Pressionar `F11` (ou clicar no botão `Maximize2` na gaveta) oculta a `Sidebar`, a `TitleBar` e as bordas secundárias, expandindo o `NowPlayingDrawer` para 100% do monitor.
  - À esquerda, a capa do álbum (em modo *Motion 3D* ou *Vinil*) em grande escala com o nome da faixa e artista; à direita, as letras sincronizadas em tipografia ampliada para leitura à distância.
  - O cursor do mouse e os controles inferiores desaparecem automaticamente após 3 segundos de inatividade (*auto-hide HUD*).

---

### Eixo 3: Experiência de Letras, Karaokê & Diferenciais Culturais (J-Pop / Vocaloid / Global)

#### 3.1 Overlay Flutuante Transparente de Letras na Área de Trabalho (*Desktop Karaoke Overlay*)
* **Status:** `[Em Aberto / Grande Diferencial Desktop]` 💡
* **Impacto:** `[Muito Alto para Gamers & Multitarefa]` | **Esforço:** `[Médio]`
* **Origem:** Recurso consagrado nos players asiáticos e entusiastas (NetEase Cloud Music, QQMusic, Namida, Lyricify) e frequentemente requisitado no `th-ch/youtube-music`.
* **Arquitetura no Tauri v2:**
  - Segunda janela Tauri leve e sem bordas (`800x90px`), `alwaysOnTop: true`, `transparent: true` e `skipTaskbar: true`.
  - Suporte ao modo **Click-Through** (`window.setIgnoreCursorEvents(true)` via comando Rust): o mouse atravessa a letra flutuante sem interferir no jogo, navegador ou IDE que está por baixo!
  - Exibe a estrofe atual em destaque neon com contorno de alto contraste e a próxima linha logo abaixo em opacidade suave. Ao passar o mouse com uma tecla modificadora (ou pelo botão na `PlayerBar`), permite reposicionar ou trancar/destrancar a barra.

---

#### 3.2 Romanização Automática (Romaji) e Tradução Bilíngue nas Letras
* **Status:** `[Em Aberto / Diferencial Único para J-Pop, Vocaloid, Anime & K-Pop]` 💡
* **Impacto:** `[Muito Alto para o Perfil Musical do App]` | **Esforço:** `[Médio]`
* **Contexto:**
  Grande parte das bibliotecas modernas no YouTube Music inclui faixas em japonês (ex: *Kikuo, DECO*27, ryo/supercell, Hatsune Miku, Kasane Teto, Ado, YOASOBI*), coreano ou outros idiomas.
* **Proposta de Implementação:**
  - Adicionar um botão compacto **`[あ→A Romaji]`** e **`[Traduzir]`** no topo da [`LyricsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx) quando o texto contiver caracteres CJK (`[぀-ヿ㐀-䶿一-鿿가-힯]`).
  - Renderizar uma sub-linha discreta (`text-xs text-zinc-400 font-normal`) imediatamente abaixo de cada verso original com a pronúncia romanizada (para cantar junto no karaokê!) e/ou tradução contextual cacheada no SQLite local, sem poluir o destaque principal.

---

#### 3.3 Letras Sincronizadas Palavra-por-Palavra (*Syllable / Word-by-Word Karaoke Sync*)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Alto / Visual]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**
  Suporte a arquivos LRC estendidos (`<mm:ss.xx>palavra`) retornados pelo LRCLIB ou fontes compatíveis, preenchendo gradualmente cada palavra com um gradiente luminoso (`background-clip: text`) conforme o vocalista a pronuncia, além de um controle de **Offset de Sincronia (`-0.5s` / `+0.5s`)** por música caso uma letra da comunidade esteja levemente adiantada ou atrasada.

---

### Eixo 4: Navegação, Descoberta, Busca & Ergonomia Desktop

#### 4.1 Command Palette Universal (`Ctrl+K` — Estilo Raycast / Linear)
* **Status:** `[Em Aberto / Alta Prioridade UX]` 💡
* **Impacto:** `[Muito Alto para Produtividade]` | **Esforço:** `[Baixo / Médio]`
* **Descrição Conceitual:**
  Pressionar `Ctrl+K` em qualquer tela abre um modal central ultra-rápido com busca difusa (*fuzzy search*) unificando:
  1. **Faixas da Fila Atual e Biblioteca Cacheada:** Pular imediatamente para qualquer música sem abrir a playlist.
  2. **Playlists e Álbuns Salvos:** Navegar para qualquer playlist ou álbum digitando 2 ou 3 letras.
  3. **Ações Rápidas do Sistema:** *"Mudar Tema para Cyber Indigo"*, *"Ativar Sleep Timer (30 min)"*, *"Alternar Modo Mini Player"*, *"Criar Nova Playlist"*, *"Limpar Fila"*.

---

#### 4.2 Histórico de Navegação Voltar / Avançar (`Alt+←` / `Alt+→` e Botões Laterais do Mouse)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Médio / Ergonomia Desktop]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**
  Manter uma pilha de histórico de rotas internas (`viewStack` em `App.tsx`) e escutar os botões físicos `MouseButton 4 (Back)` e `MouseButton 5 (Forward)`, além de `Alt + Seta Esquerda/Direita` e setas `<` `>` discretas no `TitleBar`, permitindo voltar instantaneamente de um Álbum para a Playlist ou Busca anterior.

---

#### 4.3 Persistência e Restauração Completa de Sessão ao Reabrir o App
* **Status:** `[Em Aberto / Alta Prioridade]` 💡
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**
  - Persistir no SQLite (`app_cache` sob chave protegida) ou `localStorage` o estado da sessão: `activeQueue`, `originalQueue`, `currentQueueIndex`, `currentTime`, `isShuffle` e `repeatMode`.
  - Ao abrir o TetPlayer, recarregar a última faixa pausada exatamente no segundo em que parou, pronta para continuar ao apertar `Espaço`.

---

#### 4.4 Sleep Timer (Temporizador de Suspensão com Fade-Out Gradual) & Volume pela Roda do Mouse
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Funcionalidades:**
  - **Sleep Timer:** Ícone de lua/relógio com opções *15 min*, *30 min*, *45 min*, *60 min* e *"Parar ao final da música atual"*. Nos últimos 20 segundos do timer, reduz o volume gradualmente até zero antes de pausar.
  - **Scroll Wheel Volume:** Rolar a roda do mouse sobre o controle de volume na `PlayerBar` ou sobre o `MiniPlayer` ajusta o volume em passos de 5% com tooltip numérico instantâneo.

---

### Eixo 5: Curadoria, Biblioteca & Playlists Inteligentes

#### 5.1 Curtir / Descurtir Músicas Sincronizado com o YouTube Music (`like/like` & `like/removelike`)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Muito Alto]` | **Esforço:** `[Baixo / Médio]`
* **Descrição Conceitual:**
  - Botão de coração (`Heart`) na `PlayerBar`, no `MiniPlayer`, em cada `TrackRow` (visível no hover ou quando curtida) e no `TrackContextMenu`.
  - Chama os endpoints autenticados `https://music.youtube.com/youtubei/v1/like/like` e `like/removelike` em `ytm.rs`, atualizando automaticamente o cache da playlist *"Músicas Curtidas"* (`VLLM`) com UI otimista de 0ms.

---

#### 5.2 "Smart Mixes & Time Travel" baseados no Histórico Local SQLite (Estilo Plexamp)
* **Status:** `[Em Aberto / Diferencial Exclusivo]` 💡
* **Impacto:** `[Alto / Valor Pessoal]` | **Esforço:** `[Baixo / Médio]`
* **Descrição Conceitual:**
  Aproveitar a tabela `playback_history` do banco SQLite local (`stats.rs`) para gerar cards de **Smart Mixes Automáticos** no topo da Biblioteca, sem depender de algoritmos repetitivos da nuvem:
  - 🔥 **Em Alta na Sua Semana:** As 30 músicas que você mais repetiu nos últimos 7 dias.
  - 🕰️ **Cápsula do Tempo (Esquecidas):** Músicas que você ouvia muito há mais de 30 dias, mas não tocou recentemente.
  - 🌙 **Sessão da Madrugada:** Músicas que você costuma ouvir entre 23h e 05h.
  - 🎲 **Redescoberta da Biblioteca:** Mix inteligente combinando faixas de todas as suas playlists fixadas.

---

#### 5.3 Salvar Fila Atual como Nova Playlist & Detector de Músicas Duplicadas
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Alto]` | **Esforço:** `[Baixo]`
* **Funcionalidades:**
  - **Salvar Fila como Playlist:** Botão no cabeçalho da `QueueView` (*"Salvar fila como Playlist"*) que reutiliza o comando `create_playlist` já implementado na v1.4.0 para transformar uma sessão incrível de Rádio Automática em uma playlist permanente na sua conta do YouTube Music!
  - **Detector de Duplicatas em Playlist:** Nas playlists editáveis do usuário, exibir um aviso sutil caso existam faixas duplicadas (mesmo `videoId` ou mesmo título+artista normalizado) com botão *"Remover duplicatas"* em 1 clique.

---

#### 5.4 Bloquear Faixas e Artistas da Rádio Contínua (*Radio Blacklist*)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**
  Opção *"Não tocar esta música na rádio"* e *"Não sugerir este artista"* no `TrackContextMenu`. O `PlayerContext` filtra automaticamente a lista negra local ao receber recomendações de `get_radio_tracks`, com gerenciamento na aba de Configurações.

---

### Eixo 6: Ecossistema, Integrações Sociais & Modo Offline

#### 6.1 Integração Nativa com Discord Rich Presence (Discord RPC via Rust)
* **Status:** `[Em Aberto / Alta Prioridade]` 💡
* **Impacto:** `[Muito Alto para Engajamento Social]` | **Esforço:** `[Baixo / Médio]`
* **Arquitetura Técnica:**
  - Integração via IPC nomeado (`\\.\pipe\discord-ipc-0`) em Rust sem dependências pesadas.
  - Exibe no perfil do Discord: título da música, artista, capa do álbum em alta resolução, barra de progresso em tempo real (pausando quando o player está pausado) e botão *"Ouvir no YouTube Music"*.
  - Toggle de ativação/desativação em *Configurações > Sistema*.

---

#### 6.2 Downloads para Reprodução Offline & Modo Híbrido Local (`.opus` / `.m4a` em `data/music/`)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Muito Alto]` | **Esforço:** `[Alto]`
* **Arquitetura Técnica:**
  - A pasta dedicada `data/music/` já é criada e gerenciada por [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs)!
  - Comando Rust para baixar o stream direto de áudio (`itag 251` Opus ou `itag 140` AAC) em segundo plano com barra de progresso, salvando em `data/music/{video_id}.opus` e registrando na tabela `downloads` do SQLite.
  - O `useYouTubePlayer` verifica primeiro se a faixa possui arquivo local baixado: se sim, toca instantaneamente do disco (0ms de latência, zero uso de rede e funcionamento 100% offline!).

---

#### 6.3 Pular Trechos Não Musicais Automaticamente via SponsorBlock (`music_offtopic`)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**
  Muitos videoclipes no YouTube Music possuem introduções faladas, créditos longos ou esquetes silenciosas. Consultar a API pública do SponsorBlock (`category=music_offtopic`) no carregamento da faixa e realizar seek automático sobre segmentos não musicais, com um toast discreto *"Introdução não musical pulada"*.

---

#### 6.4 Scrobbling Nativo para Last.fm e ListenBrainz (com Fila Offline SQLite)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Alto para Entusiastas]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**
  Envio automático de *Now Playing* ao iniciar uma música e *Scrobble* ao atingir 50% da duração (ou 4 minutos), com fila persistente no SQLite caso o usuário esteja temporariamente sem conexão.

---

#### 6.5 Controle Remoto Web na Rede Local (QR Code Mobile) & API para Stream Deck
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Alto]` | **Esforço:** `[Médio / Alto]`
* **Descrição Conceitual:**
  Servidor local opcional (HTTP + WebSocket em Rust, desativado por padrão) que gera um QR Code nas Configurações. Ao escanear com o celular na mesma rede Wi-Fi, abre um controle remoto web responsivo com capa, letras, controle de volume e fila em tempo real, além de servir como endpoint local para teclas do Elgato Stream Deck.

---

#### 6.6 Notificações Nativas discretas ao Trocar de Faixa & Botões na Miniatura da Barra de Tarefas
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo / Médio]`
* **Funcionalidades:**
  - Opção para emitir notificação com capa, título e artista apenas quando a música mudar automaticamente e o TetPlayer estiver minimizado/em segundo plano.
  - Botões `Anterior`, `Play/Pause` e `Próxima` diretamente na miniatura da janela na barra de tarefas do Windows (`ITaskbarList3`).

---

#### 6.7 Importador de Playlists Externas (`CSV` / `M3U` / Exportify)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**
  Agora que o TetPlayer já cria e manipula playlists na nuvem (Histórico #51), adicionar um assistente para importar arquivos `.csv` (Spotify/Exportify) ou `.m3u`, resolvendo os `videoId`s via `search_ytm` e criando a playlist completa na conta do YouTube Music do usuário.

---

## 4. Matriz de Priorização (Impacto × Esforço) & Roadmap Visual

| Prioridade | ID | Sugestão | Impacto | Esforço | Versão Alvo |
| :---: | :---: | :--- | :---: | :---: | :---: |
| 🔥 **P0** | **2.1** | Tema Camaleão Dinâmico (Cor do App pela Capa Atual) | Muito Alto | Baixo/Médio | `v2.1.0` |
| 🔥 **P0** | **4.1** | Command Palette Universal (`Ctrl+K`) | Muito Alto | Baixo/Médio | `v2.1.0` |
| 🔥 **P0** | **4.3** | Restaurar Sessão Completa (Fila + Posição) ao Reabrir | Alto | Baixo | `v2.1.0` |
| 🔥 **P0** | **5.1** | Curtir / Descurtir Sincronizado com YouTube Music | Muito Alto | Baixo/Médio | `v2.1.0` |
| ⚡ **P1** | **1.1** | Equalizador 10 Bandas + Efeitos DSP (*Slowed+Reverb*) | Alto | Médio | `v2.2.0` |
| ⚡ **P1** | **3.2** | Romanização (Romaji) e Tradução Bilíngue nas Letras | Muito Alto | Médio | `v2.2.0` |
| ⚡ **P1** | **6.1** | Integração Discord Rich Presence (Discord RPC) | Muito Alto | Baixo/Médio | `v2.2.0` |
| 🌟 **P2** | **1.2** | Insígnia de Caminho de Sinal Audiófilo (*Signal Path Badge*) | Médio | Baixo | `v2.3.0` |
| 🌟 **P2** | **2.3** | Modo Vitrola / Vinil Giratório 33⅓ RPM na Gaveta | Alto | Médio | `v2.3.0` |
| 🌟 **P2** | **3.1** | Overlay Transparente Click-Through de Letras para Jogos | Muito Alto | Médio | `v2.3.0` |
| 🌟 **P2** | **5.2** | Smart Mixes Locais (*Time Travel / Sessão da Madrugada*) | Alto | Baixo/Médio | `v2.3.0` |
| 🔮 **P3** | **6.2** | Downloads Offline (`.opus`/`.m4a`) & Modo Híbrido Local | Muito Alto | Alto | `v2.4.0+` |
| 🔮 **P3** | **6.3–6.7** | SponsorBlock, Last.fm, Controle Remoto QR, Importador CSV | Médio | Médio | `v2.4.0+` |

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     LINHA DO TEMPO EVOLUTIVA — TETPLAYER                     │
└──────────────────────────────────────────────────────────────────────────────┘
  [CONCLUÍDO] Fases 1 a 4 & Milestone v2.0 GA (v0.1 → v1.0 → v1.4 → v2.0.1) ✅
  ├── Arquitetura Modular + Virtualização 144 FPS + Cache SQLite Comprimido
  ├── Motor de Áudio Dual-Deck (Deck A/B True Crossfade + ReplayGain loudnessDb)
  ├── Waveform Seekbar Interativa + Tooltip com Preview de Letra no Hover
  ├── Página Dedicada de Artista (ArtistDetailView) + Busca Multi-Categoria
  ├── Login Google Nativo via Webview + Auto-Updater Silencioso Assinado
  ├── Suporte Completo a Álbuns (Grade, Detalhes Editoriais, Discografia)
  └── Manipulação Bidirecional de Playlists + Drag & Drop Flutuante 144 FPS

  [PRÓXIMA ONDA] v2.1.0 — Ergonomia Imediata & Identidade Viva 🎯
  ├── Tema Camaleão Dinâmico + Modo OLED Abyss (#000000)
  ├── Command Palette Universal (Ctrl+K) + Salvar Fila como Playlist
  ├── Curtir/Descurtir Sincronizado + Restauração de Sessão ao Reabrir
  └── Histórico de Navegação Voltar/Avançar + Sleep Timer com Fade-Out

  [EXPANSÃO AUDIÓFILA & CULTURAL] v2.2.0 — Som & Letras de Estúdio 🎧
  ├── Equalizador 10 Bandas + Slowed & Reverb / Nightcore DSP
  ├── Romanização (Romaji) e Tradução Bilíngue nas Letras
  ├── Discord Rich Presence (RPC nativo em Rust)
  └── Modo Vitrola (Vinil 33⅓ RPM) + Signal Path Badge Audiófilo

  [ECOSSISTEMA & IMERSÃO] v2.3.0+ — Desktop Overlay & Offline 🔮
  ├── Overlay Transparente Click-Through de Letras na Área de Trabalho
  ├── Downloads Offline (.opus/.m4a) com Reprodução Híbrida Local
  ├── Smart Mixes Locais do SQLite (Cápsula do Tempo / Sessão Madrugada)
  └── SponsorBlock, Last.fm Scrobbling e Controle Remoto via QR Code
```

---

## 5. Histórico Consolidado: 61 Funcionalidades e Otimizações Concluídas

> [!NOTE]
> Todos os **61 itens** listados abaixo foram projetados, implementados, testados e validados no código-fonte do TetPlayer Desktop. Eles estão organizados cronologicamente e servem como registro arquitetural definitivo da evolução do projeto.

### Resumo Rápido por Marcos de Versão

| Faixa de Itens | Marco / Fase | Destaques Principais |
| :---: | :--- | :--- |
| **#01 – #18** | **Fundação & Arquitetura Core (`v0.1.x`)** | Modularização do `App.tsx`, Virtualização 144 FPS, Cache SWR, Web Worker de Cores, Aurora `@property`, Mini Player PiP/Docking, System Tray, Rádio Contínua, LRC Avançado, Estatísticas SQLite e SMTC. |
| **#19 – #37** | **Performance Extrema & Release Oficial (`v0.2` → `v1.0.0`)** | `PlaybackProgressContext`, Gapless Prefetch (88%), Cache SQLite com `flate2`, Vitest, `TimelineScrubber` isolado, `playerReducer`, Menu de Contexto, Motion Cover 3D, `SettingsModal`, Drag & Drop na Fila, Teclas Globais de Mídia e Share Cards PNG. |
| **#38 – #49** | **Maturidade, Auto-Update & Motor Nativo (`v1.1` → `v1.3.3`)** | Crossfade, Histórico "Músicas que Já Passaram", Scroll Cinético de Letras com Spring Bounce, Login Google Nativo via Webview, Auto-Update In-App Minisign, Pasta Portátil `data/`, Busca/Ordenação em Playlists, Paginação de 2.500 Faixas e Motor de Áudio Nativo Híbrido (`AudioEngine`). |
| **#50 – #53** | **Álbuns, CRUD de Playlists & UI/UX 144 FPS (`v1.4.0+`)** | Suporte Completo a Álbuns com Discografia Relacionada, Manipulação Bidirecional de Playlists (Criar/Editar/Excluir/Adicionar/Remover), Drag & Drop com Card Flutuante a 144 FPS sincronizado com o YouTube Music e Seletores Customizados Dark com Pílula Deslizante. |
| **#54 – #58** | **Release GA v2.0 & DSP de Alta Fidelidade (`v2.0.0` → `v2.0.1+`)** | Página Dedicada de Artista (`ArtistDetailView`), Busca Multi-Categoria (Tudo, Músicas, Álbuns), Dual-Deck True Crossfade com rampa equal-power, Normalização de Volume ReplayGain via `loudnessDb` e Waveform Seekbar com preview de letras no hover. |

---

### Detalhamento Completo dos 61 Itens Concluídos

#### 1. Modularização de `App.tsx` em Componentes e Custom Hooks
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx), [`desktop/src/hooks/`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/) e [`desktop/src/components/`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/).
* **Implementação Concluída:** O arquivo monolítico inicial foi decomposto em módulos atômicos e especializados: `useYouTubePlayer`, `useLyrics`, `useAuroraColor`, `useMediaSession`, `useKeyboardShortcuts`, `PlayerContext`, `MainView`, `Sidebar`, `TitleBar`, `PlayerBar`, `NowPlayingDrawer`, `MiniPlayer`, `StatsView` e `UpdateModal`.

#### 2. Virtualização de Listas de Músicas (`@tanstack/react-virtual`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MainView/VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx).
* **Implementação Concluída:** Renderiza apenas os elementos visíveis na janela de rolagem (*windowing*), mantendo o DOM leve em playlists com centenas ou milhares de faixas e garantindo **144 FPS locked**.

#### 3. Cache Local e Persistência Offline via Stale-While-Revalidate
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts).
* **Implementação Concluída:** `LocalCacheService` persistindo biblioteca de playlists, álbuns e faixas em disco, exibindo a biblioteca instantaneamente em **0ms** enquanto atualizações de rede ocorrem em segundo plano.

#### 4. Processamento do Amostrador de Cores em Web Worker / OffscreenCanvas
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/workers/colorWorker.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/workers/colorWorker.ts).
* **Implementação Concluída:** Algoritmo de amostragem de cores e agrupamento euclidiano de saturação/brilho movido para Web Worker dedicado, liberando 100% da thread de UI.

#### 5. Transição Suave e Fade Gradual no Fundo Aurora (CSS `@property`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css) e [`desktop/src/hooks/useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts).
* **Implementação Concluída:** Propriedades CSS tipadas (`@property --aurora-1/2/3`) com `syntax: "<color>"`, interpolando canais RGBA com curva `0.75s cubic-bezier(0.2, 0.8, 0.2, 1)`.

#### 6. Desacoplamento do Estado de Alta Frequência (`currentTime`) e Memoização da Árvore
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx) e [`desktop/src/components/`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/).
* **Implementação Concluída:** `PlayerContext.Provider` envolvido em `useMemo` e views principais encapsuladas em `React.memo`, eliminando re-renderizações em cascata a cada tick de 80ms.

#### 7. Otimização de GPU Compositing no Spectrum Visualizer (`transform: scaleY`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/Visualizer/SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).
* **Implementação Concluída:** Substituída a mutação de `height` por transformações aceleradas na GPU com `transform: scaleY(...)` e `will-change-transform`.

#### 8. Política de Evicção LRU e Quota Resiliente no Cache de Faixas e Cores
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts) e [`desktop/src/hooks/useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts).
* **Implementação Concluída:** Fila LRU limitando o cache local a 25 playlists e 25 álbuns ativos com tratamento resiliente de `QuotaExceededError`, além de teto rotativo de 150 paletas Aurora.

#### 9. Mini Player Flutuante (Always-on-Top / PiP Mode & Snap Magnético)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MiniPlayer/MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx) e [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs).
* **Implementação Concluída:** Janela compacta sem decorações (`380x140px`) Always-on-Top com mini espectro, scrubber, controles de áudio e encaixe magnético retrátil nas bordas da tela (`38x90px`) sem interromper o áudio.

#### 10. Minimizar para a Bandeja do Sistema (System Tray com Menu de Contexto)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs) e [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx).
* **Implementação Concluída:** `TrayIconBuilder` no Tauri v2 com menu nativo (Play/Pause, Próxima, Anterior, Mostrar/Ocultar, Mini Player e Sair).

#### 11. Autoplay Infinito & Rádio da Faixa (Continuous Radio)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Implementação Concluída:** Comando `get_radio_tracks` consultando `/next` do InnerTube para anexar recomendações automaticamente antes da fila acabar.

#### 12. Parser Avançado de Letras LRC com Suporte a Interlúdios e Múltiplos Timestamps
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/hooks/useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts).
* **Implementação Concluída:** Regex global processando múltiplos marcadores de tempo por linha e convertendo linhas instrumentais vazias no marcador musical `♪`.

#### 13. Acessibilidade e Ergonomia no Modal de Atualização (`UpdateModal`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/UpdateModal/UpdateModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx).
* **Implementação Concluída:** Fechamento via tecla `Escape` e clique no backdrop escuro seguindo normas WAI-ARIA.

#### 14. Visualizador de Áudio e Espectro Dinâmico Multi-Variante
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/Visualizer/SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).
* **Implementação Concluída:** Barras harmônicas em 3 variantes (`mini`, `inline` e `full`) e 4 estilos visuais (`bars`, `blocks`, `gradient`, `pulse`).

#### 15. Suporte Inicial Multi-Navegador para Sessão do YouTube (Posteriormente Evoluído para Webview Isolada no Item #43)
* **Status:** `[Implementado e Evoluído]` ✅
* **Localização:** [`desktop/src-tauri/src/auth.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs).
* **Implementação Concluída:** Suporte inicial a leitura de sessão, posteriormente substituído na v1.1.0 por login Google nativo 100% independente de navegadores externos.

#### 16. Estatísticas de Reprodução Pessoais ("Resumo Musical" / SQLite)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs) e [`desktop/src/components/StatsView/StatsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsView.tsx).
* **Implementação Concluída:** Banco SQLite gravando histórico de reprodução com métricas de tempo total, faixas tocadas, top 5 artistas com medalhas, top 10 músicas e filtros temporais (7 dias, 30 dias, todo o histórico).

#### 17. Sistema Automático de Notificação de Atualizações via GitHub
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/updater.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/updater.ts) e [`desktop/src/components/UpdateModal/UpdateModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx).
* **Implementação Concluída:** Checagem periódica e sob demanda de novas releases no GitHub com comparação SemVer.

#### 18. Correção de Sincronia de Seek no Windows Media Session (SMTC)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/hooks/useMediaSession.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useMediaSession.ts).
* **Implementação Concluída:** Referência `lastTrackedPositionRef` garantindo atualização imediata no overlay nativo do Windows após um seek manual.

#### 19. Separação do Contexto de Alta Frequência (`PlaybackProgressContext`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/context/PlaybackProgressContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlaybackProgressContext.tsx) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Implementação Concluída:** Isolamento atômico de `currentTime`, `duration` e `buffered` para manter toda a árvore de listas e barra lateral 100% estática durante o streaming.

#### 20. Pipeline de Pré-Carregamento Inteligente e Buffer Antecipado (88% Gapless Prefetch)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`desktop/src/hooks/useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts) e [`desktop/src/hooks/useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts).
* **Implementação Concluída:** Aos 88% da música atual (ou últimos 20s), pré-carrega letras, paleta Aurora e recomendações da rádio para a próxima música.

#### 21. Indexação e Persistência de Cache no Banco SQLite Nativo (`app_cache`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs) e [`desktop/src/services/cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts).
* **Implementação Concluída:** Tabela `app_cache` no SQLite espelhando gravações de cache local sem o limite de 5MB do `localStorage`.

#### 22. Tratamento de Conectividade Offline e Resiliência de Rede com Backoff Exponencial
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/network.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/network.ts) e [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx).
* **Implementação Concluída:** Utilitário `retryWithBackoff` e hook `useNetworkStatus()` com badge animado de status de rede na barra de título.

#### 23. Suíte de Testes Automatizados Unitários e de Integração com Vitest
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/vite.config.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/vite.config.ts) e [`desktop/src/test/setup.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/test/setup.ts).
* **Implementação Concluída:** Suíte completa de testes cobrindo parser LRC, cache LRU, `playerReducer`, `TimelineScrubber`, `AudioEngine`, `Sidebar`, `PlaylistDetailView` e `SearchView` (89 testes Vitest + 14 testes Cargo).

#### 24. Isolamento do Scrubber da Linha do Tempo em Componente Memoizado (`TimelineScrubber`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/Player/TimelineScrubber.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx) e [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx).
* **Implementação Concluída:** Extração do slider de progresso para subcomponente dedicado, tornando o `PlayerBar` 100% livre de re-renderizações por ticks de tempo.

#### 25. Pipeline de Telemetria de Desempenho Local e Monitor de Taxa de Frames (FPS & Profiler)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/telemetry.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/telemetry.ts) e [`desktop/src/hooks/usePerformanceTelemetry.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/usePerformanceTelemetry.ts).
* **Implementação Concluída:** Monitoramento em `requestAnimationFrame` detectando quedas de quadros (*jank* > 16.6ms e > 33.3ms) em desenvolvimento.

#### 26. Compressão Transparente de Payloads no Cache SQLite Nativo (`flate2` / Deflate)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs).
* **Implementação Concluída:** Compactação Deflate + Base64 reduzindo em até 75% o espaço ocupado por JSONs de playlists e álbuns no SQLite.

#### 27. Máquina de Estados Finita e Reducer Estruturado para o Ciclo de Fila e Reprodução (`playerReducer`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/context/playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Implementação Concluída:** Consolidação determinística de fila, shuffle, repeat, inserção, remoção, reordenação e rádio contínua.

#### 28. Menu de Contexto Flutuante e Ações Rápidas por Faixa (`TrackContextMenu`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/ContextMenu/TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx).
* **Implementação Concluída:** Menu glassmorphic escuro com Tocar a Seguir, Adicionar à Fila, Adicionar a uma Playlist (com sub-menu), Remover desta Playlist, Iniciar Rádio, Buscar mais do Artista, Ver Álbum, Copiar Link e Copiar Nome/Artista.

#### 29. Refinamento Visual do Drawer com Foco Minimalista e Iluminação Volumétrica Aurora
* **Status:** `[Concluído e Limpo]` ✅
* **Localização:** [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Implementação Concluída:** Design limpo com iluminação volumétrica Aurora e zero ruído visual.

#### 30. Capas Cinematográficas Animadas estilo Apple Music Motion Cover com Amortecimento Ultra Suave
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/NowPlayingDrawer/MotionCover.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/MotionCover.tsx).
* **Implementação Concluída:** Perspectiva 3D interativa com feixe de luz especular contínuo (`motionSweep`), respiração rítmica e retorno suave em `1.4s cubic-bezier(0.16, 1, 0.3, 1)`.

#### 31. Encaixe Sólido de Borda a Borda no Mini Player Docked (Fim dos Cantos Vazios)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MiniPlayer/MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx).
* **Implementação Concluída:** Preenchimento sólido da janela nativa sem cantos ocos transparentes.

#### 32. Layout Proporcional Responsivo de 3 Colunas no PlayerBar e Drawer Header
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx) e [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Implementação Concluída:** Arquitetura simétrica garantindo centralização perfeita dos controles de transporte e abas em qualquer resolução a partir de 800px.

#### 33. Modal Centralizado de Configurações do Aplicativo (`SettingsModal` & `SettingsService`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/SettingsModal/SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx) e [`desktop/src/services/settings.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/settings.ts).
* **Implementação Concluída:** Painel com 5 abas (*Áudio & Fila*, *Aparência & Efeitos*, *Sistema & Atalhos*, *Sessão & Armazenamento* e *Sobre*), acessível via `Ctrl + ,`.

#### 34. Reordenação da Fila de Reprodução via Drag & Drop (`REORDER_QUEUE`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/QueueView/QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx) e [`desktop/src/context/playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts).
* **Implementação Concluída:** Reordenação de faixas na seção "A Seguir" da gaveta mantendo a integridade do índice em execução.

#### 35. Teclas Multimídia Globais do Sistema Operacional (`tauri-plugin-global-shortcut`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs).
* **Implementação Concluída:** Suporte global a `MediaPlayPause`, `MediaTrackNext`, `MediaTrackPrevious`, `MediaStop` e `Ctrl+Alt+Space/Left/Right` mesmo com o app em segundo plano.

#### 36. Exportação e Compartilhamento de Estatísticas em PNG ("Resumo Musical" Canvas 2D)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/StatsView/StatsShareModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsShareModal.tsx).
* **Implementação Concluída:** Gerador em Canvas 2D (`1200x675`) com cores sincronizadas ao tema ativo, cópia direta para a área de transferência e download em PNG.

#### 37. Fechamento e Unificação da Versão 1.0.0 Oficial (Release GA)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/package.json`](file:///d:/progrmação/programas/TetPlayer/desktop/package.json), [`desktop/src-tauri/Cargo.toml`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/Cargo.toml) e [`desktop/README.md`](file:///d:/progrmação/programas/TetPlayer/desktop/README.md).
* **Implementação Concluída:** Consolidação da release 1.0.0 com documentação completa.

#### 38. Transição Musical Suave e Crossfade Configurável entre Faixas (0s a 12s)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/hooks/useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts) e [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Implementação Concluída:** Fade-out e fade-in configuráveis de 0s a 12s com botão de ciclo rápido no cabeçalho da gaveta.

#### 39. Histórico de Faixas Tocadas com Reexecução Imediata ("Músicas que Já Passaram")
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/QueueView/QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx).
* **Implementação Concluída:** Seção retrátil no topo da fila permitindo revisitar e tocar novamente qualquer faixa anterior da sessão.

#### 40. Sincronização Determinística do Ciclo de Vida da Gaveta de Reprodução (`toggleNowPlaying`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Implementação Concluída:** Unificação dos estados `isNowPlayingOpen` e `showLyrics` com transição acelerada por GPU de 200ms sem reflow.

#### 41. Unificação de Controles e Simetria nos Extremos do PlayerBar
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx).
* **Implementação Concluída:** Botão do Mini Player posicionado na extrema esquerda e seta de expansão da gaveta na extrema direita para simetria ergonômica perfeita.

#### 42. Animação Cinematográfica, Scroll Cinético e Spring Bounce na Troca de Letras
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/hooks/useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts), [`desktop/src/components/LyricsView/LyricsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx) e [`desktop/src/index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css).
* **Implementação Concluída:** Algoritmo `requestAnimationFrame` com curva elástica `kineticSpringBounce`, keyframes `lyric-spring-bounce` de 5 estágios e profundidade de campo graduada.

#### 43. Login Próprio com Conta Google via Webview Embutida Isolada
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/auth.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs).
* **Implementação Concluída:** Autenticação nativa via `WebviewWindowBuilder` com validação de perfil InnerTube e persistência local no SQLite, eliminando dependência de navegadores externos.

#### 44. Sistema Completo de Auto-Update Silencioso In-App via Tauri v2 e GitHub Actions
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/updater.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/updater.ts), [`desktop/src-tauri/tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json) e [`.github/workflows/release.yml`](file:///d:/progrmação/programas/TetPlayer/.github/workflows/release.yml).
* **Implementação Concluída:** Atualização silenciosa in-app com verificação de assinatura criptográfica Minisign (`latest.json`) e reinício automático.

#### 45. Armazenamento Unificado e Portátil na Pasta de Instalação (`data/tetstats.db` e `data/music/`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs) e [`desktop/src-tauri/tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json).
* **Implementação Concluída:** Centralização dos dados na pasta `data/` junto ao executável, migração automática de `%LOCALAPPDATA%` e seleção de diretório no instalador NSIS.

#### 46. Fechamento Automático da Gaveta de Reprodução ao Navegar na Barra Lateral
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx) e [`desktop/src/components/Sidebar/Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx).
* **Implementação Concluída:** Ao clicar em Biblioteca, Buscar, Estatísticas ou em uma Playlist/Álbum na Sidebar, a gaveta expandida recolhe automaticamente.

#### 47. Busca Instantânea (`Ctrl+F`) e Ordenação Flexível Dentro de Playlists
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MainView/PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx).
* **Implementação Concluída:** Filtro em tempo real por título, artista e álbum com atalho `Ctrl+F` e ordenação por Ordem Original, Título (A-Z), Artista (A-Z) e Duração.

#### 48. Paginação Completa de Playlists com Continuação Automática (Até 2.500 Faixas)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Implementação Concluída:** Extrator recursivo `extract_continuation_token` e loop iterativo de até 25 páginas em `get_playlist_tracks`, superando definitivamente o limite de 100 faixas por requisição da API InnerTube.

#### 49. Motor de Áudio Nativo Híbrido com Pré-Buffer em RAM e Fallback Resiliente para IFrame
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts), [`desktop/src/hooks/useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts) e [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Implementação Concluída:** Extração autenticada de stream direto (`get_stream_info`, priorizando Opus 160kbps e AAC 128kbps) reproduzido pelo `AudioEngine` sobre HTML5 Audio + Web Audio API `GainNode`, com fallback automático para o IFrame do YouTube em caso de `signatureCipher` ou erro de rede.

#### 50. Suporte Completo a Álbuns na Biblioteca com Detalhes Editoriais, Indicador de Onda e Discografia Relacionada (Antigo Item 2.11 — Release v1.4.0)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`desktop/src/components/MainView/AlbumGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumGridView.tsx), [`desktop/src/components/MainView/AlbumDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumDetailView.tsx), [`desktop/src/components/MainView/AlbumCard.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumCard.tsx) e [`desktop/src/services/cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts).
* **Implementação Concluída:**
  - Comandos Rust `get_user_albums` (`FEmusic_liked_albums` + extração automática de álbuns das faixas da biblioteca), `get_album_details` e `search_album_by_name`.
  - Visualização em grade (`AlbumGridView`) com busca, ordenação, fixação no topo (*Pin*) e **Indicador de Onda Sutil** animado quando um álbum está tocando.
  - Página de detalhes (`AlbumDetailView`) com numeração oficial das faixas, duração total, botão de Shuffle e carrossel de *"Mais deste artista / Recomendações"* no rodapé.
  - Navegação direta para o álbum ao clicar no nome do álbum em qualquer `TrackRow` ou pelo menu de contexto (*"Ver Álbum"*).

#### 51. Manipulação Bidirecional Completa de Playlists Sincronizada com o YouTube Music (Antigo Item 2.4 — Release v1.4.0+)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`desktop/src/components/PlaylistModals/PlaylistModals.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/PlaylistModals/PlaylistModals.tsx), [`desktop/src/components/ContextMenu/TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Implementação Concluída:**
  - **5 Comandos de Mutação em Rust:** `create_playlist` (`/playlist/create`), `delete_playlist` (`/playlist/delete`), `edit_playlist` (`/browse/edit_playlist` para título e descrição), `add_track_to_playlist` (`ACTION_ADD_VIDEO`) e `remove_track_from_playlist` (`ACTION_REMOVE_VIDEO` via `setVideoId`).
  - **Modais Dedicados (`PlaylistModals.tsx`):** Modais estilizados de Criar Playlist (com privacidade Pública/Não listada/Privada), Editar Playlist e Confirmar Exclusão.
  - **UI Otimista de 0ms:** Todas as adições, remoções e edições refletem instantaneamente na tela e no `LocalCacheService`, sincronizando em segundo plano com a conta oficial do YouTube Music.

#### 52. Reordenação Drag-and-Drop de Faixas em Playlists com Card Flutuante a 144 FPS e Sincronização na Nuvem (`ACTION_MOVE_VIDEO_BEFORE`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MainView/VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx), [`desktop/src/components/MainView/TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx), [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Implementação Concluída:**
  - **Alça de Arrasto Precisa à Esquerda:** O arrasto é iniciado exclusivamente ao segurar na região esquerda da faixa (`[ índice/grip | capa | título e artista ]`) na Ordem Original de playlists editáveis, com limiar de movimento de 5px e supressão de cliques acidentais ao soltar.
  - **Card Flutuante Acelerado por GPU a 144 FPS (`createPortal`):** Ao agarrar uma música, uma prévia flutuante da faixa acompanha o cursor via `translate3d(...)` direto na referência DOM (zero re-render do React por pixel movido), enquanto o slot original fica tracejado e uma linha luminosa colorida (`var(--accent)`) indica onde a faixa será encaixada.
  - **Auto-Scroll Contínuo e Sincronização Determinística:** Rolagem automática nas bordas da lista virtualizada e comando Rust `reorder_playlist_track` (incluindo manobra atômica de 2 passos para a última posição da playlist), eliminando os glitches visuais do cliente web oficial do YouTube Music.

#### 53. Refinamento de UI/UX: Seletores Customizados Dark Glassmorphic e Segmented Control com Pílula Deslizante
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MainView/PlaylistGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistGridView.tsx), [`desktop/src/components/MainView/AlbumGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumGridView.tsx) e [`desktop/src/components/MainView/PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx).
* **Implementação Concluída:**
  - Substituídos os elementos `<select>` nativos claros do Windows por menus dropdown customizados em vidro escuro (`bg-[#12151f]/95 backdrop-blur-xl`), com destaque pelo tema ativo, ícone `Check`, fechamento por `Escape`/clique externo e hierarquia de empilhamento (`z-30` vs `z-10`) sempre acima da lista de faixas.
  - Implementado Segmented Control unificado entre *Playlists* e *Álbuns* com pílula deslizante neutra animada via `transform: translateX(100%)` e `cubic-bezier(0.22, 1, 0.36, 1)` sem desmontar o cabeçalho.

#### 54. Perfil Completo e Página Dedicada de Artista (`ArtistDetailView`) com Discografia, Músicas e Biografia (Antigo Item 4.3 — Release v2.0.0)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MainView/ArtistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/ArtistDetailView.tsx), [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) (`get_artist_details`) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Implementação Concluída:**
  - Clique no nome do artista em qualquer faixa abre o perfil rico do artista com banner fotográfico em alta resolução, bio expansível, métricas de ouvintes e botão de rádio contínua.
  - Seções completas de **Músicas Mais Populares**, **Álbuns Completos** e **Singles & EPs**, integrados com cache local Stale-While-Revalidate em 0ms.

#### 55. Busca Multi-Categoria e Segmented Control Dinâmico (Tudo, Músicas e Álbuns) a 144 FPS (Antigo Item 4.2 — Release v2.0.1)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) (`search_albums`), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs) e [`desktop/src/components/MainView/SearchView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/SearchView.tsx).
* **Implementação Concluída:**
  - Extração nativa de álbuns via `search_albums` com filtro oficial do YouTube Music (`EgWKAQIYAWoKEAkQBRAKEAMQBA%3D%3D`).
  - Segmented Control com pílula deslizante acelerada por GPU entre abas **Tudo**, **Músicas** e **Álbuns** com contadores dinâmicos.
  - Cards de álbum no resultado de busca com navegação direta para `AlbumDetailView`, reprodução rápida e fixação na coleção.

#### 56. Crossfade Real com Sobreposição de Duplo Deck (*Dual-Deck True Crossfade*) (Antigo Item 1.1 — Release v2.0.1+)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts) e [`desktop/src/hooks/useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts).
* **Implementação Concluída:**
  - Evolução do `AudioEngine` para arquitetura Dual-Deck com instâncias independentes (`primaryDeck` e `secondaryDeck`).
  - Método `startCrossfadeToNext` executando rampa *equal-power* contínua baseada em curva trigonométrica ($\sin/\cos$) entre a faixa em encerramento e a faixa pré-carregada em RAM, eliminando qualquer silêncio ou oscilação de volume acústico.

#### 57. Normalização Real de Volume por Faixa via `loudnessDb` (ReplayGain Nativo) (Antigo Item 1.3 — Release v2.0.1+)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`desktop/src/services/audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts) e [`desktop/src/hooks/useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts).
* **Implementação Concluída:**
  - Extração do campo `playerConfig.audioConfig.loudnessDb` retornado pelo endpoint `/player` do YouTube Music dentro da struct `StreamInfo`.
  - Cálculo de atenuação logarítmica ($10^{-	ext{loudnessDb}/20}$) dentro de uma faixa de ganho seguro (`0.35` a `1.6`) no `AudioEngine` e no player IFrame, garantindo volume percebido (LUFS) constante entre gravações antigas e contemporâneas.

#### 58. Barra Reta Minimalista no Player com Tooltip de Letras & Visualizador de Onda Sincronizado à Música (Eixo 1 & 3 — Release v2.0.1+)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/Player/TimelineScrubber.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx), [`desktop/src/components/Visualizer/SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx), [`desktop/src/services/audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts) e [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Implementação Concluída:**
  - **Barra de Progresso Reta Clássica:** Linha do tempo reta, contínua e elegante na `PlayerBar`, eliminando segmentações visuais na barra e mantendo o tooltip dark glassmorphic no hover com **timestamp exato** e **estrofe correspondente da letra** via busca binária em $O(\log N)$.
  - **Sincronia Acústica do Visualizador de Espectro:** A onda de espectro exibida abaixo da capa do álbum na gaveta (`SpectrumVisualizer`) foi sincronizada diretamente com o áudio da música, integrando dados reais de FFT do Web Audio API (`AudioEngine.getSpectrumData()`) e síntese acústica com batida rítmica (bumbo, caixa e hi-hats), dinâmicas de compasso e modulação vocal via letras sincronizadas.


#### 59. Histórico de Navegação Voltar / Avançar (`Alt+←` / `Alt+→`, Mouse 4/5 e Setas no TitleBar) (Item 4.2)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx) e [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx).
* **Implementação Concluída:**
  - Pilha interna de histórico com gerenciamento de `historyStack` e `historyIndex` memorizando rotas, playlists, álbuns, artistas e termos de busca.
  - Setas interativas no `TitleBar` com estados de desativação translúcidos e transições suaves.
  - Atalhos físicos no teclado (`Alt + Seta Esquerda/Direita`) e suporte total aos botões laterais do mouse (botões 3 e 4 do hardware).

#### 60. Curtir / Descurtir Músicas Sincronizado com o YouTube Music (`like_track` & `unlike_track`) (Item 5.1)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/likes.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/likes.ts), [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx), [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx), [`desktop/src/components/MainView/TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx) e [`desktop/src/components/ContextMenu/TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx).
* **Implementação Concluída:**
  - Integração nativa com os endpoints autenticados do YouTube Music (`like/like` e `like/removelike`).
  - Atualização otimista de 0ms na UI sincronizada via serviço global e eventos em tempo real.
  - Botão de coração acessível em todos os pontos da aplicação (PlayerBar, NowPlayingDrawer, TrackRow e Menu de Contexto).

#### 61. Downloads para Reprodução Offline & Modo Híbrido Local (`data/music/` com SQLite e Blob Stream Instantâneo) (Item 6.2)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`desktop/src/services/downloads.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/downloads.ts), [`desktop/src/hooks/useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts), [`desktop/src/components/Sidebar/Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx) e [`desktop/src/components/MainView/TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx).
* **Implementação Concluída:**
  - Tabela `downloads` criada no SQLite gerenciando metadados, tamanhos e caminhos em `data/music/`.
  - Backend Rust realizando streaming e gravação direta dos arquivos de áudio (`.opus` / `.m4a`) com feedback de progresso e comandos IPC rápidos.
  - `useYouTubePlayer` com verificação primária offline: se a música estiver no disco, ela toca instantaneamente através de Blob URL em ~5ms sem consumir rede.
  - Coleção "Músicas Baixadas" na barra lateral e biblioteca, crachá visual de download concluído nas faixas e botões de baixar/remover em todos os menus.


---

## 6. Plano Diretor de Minimalismo, Despoluição Visual & Redução de Cliques (*Clean UI/UX Overhaul*)

> **Objetivo deste Segmento:** Auditoria completa da interface atual do **TetPlayer Desktop** com foco em eliminar a sensação de "interface entupida", reduzir o ruído cognitivo/textual, substituir rótulos verbosos por **ícones universais limpos**, eliminar controles duplicados entre painéis adjacentes e diminuir o número de cliques para as ações cotidianas — mantendo **100% das funcionalidades acessíveis** e preservando a performance extrema (**< 50MB RAM, < 1% CPU, 144 FPS locked**).

---

### 6.1 Princípios Norteadores do Redesign *Clean & Minimalista*

1. **Regra "Ícone Primeiro, Texto no Tooltip" (*Icon-First Secondary Actions*):**
   - Apenas a ação primária de uma tela (ex: **Reproduzir**) deve ter destaque cheio. Todas as ações secundárias (`Aleatório`, `Baixar Offline`, `Fixar`, `Editar`, `Excluir`, `Copiar Link`, `Nova Playlist`, `Sincronizar`, `Fila`, `Letras`) devem ser convertidas em botões circulares/quadrados somente-ícone (`w-9 h-9` ou `w-10 h-10`) com `title` / `aria-label` instantâneos e feedback por cor semântica.
2. **Zero Duplicação Simultânea na Mesma Viewport:**
   - Nenhum dado ou controle deve aparecer duplicado na mesma tela (ex: status da conta Google repetido na `TitleBar` e na `Sidebar`; título da música repetido 3 vezes quando o `NowPlayingDrawer` está aberto; filtros e botões de criar/sincronizar duplicados lado a lado entre `Sidebar` e `LibraryView`).
3. **Revelação Progressiva (*Progressive Disclosure* no Hover):**
   - Elementos de manipulação estrutural (alças de arrasto `<GripVertical />`, botões de opções `<MoreVertical />`, ações rápidas de fila e contadores secundários) devem permanecer invisíveis em repouso (`opacity-0 group-hover:opacity-100`), garantindo alinhamento geométrico limpo e zero custo de *layout reflow* (animando exclusivamente `opacity` e `transform`).
4. **Ergonomia de 0 a 1 Clique (*Zero/One-Click Flows*):**
   - Ações frequentes devem exigir no máximo **1 clique** (ou **0 cliques** via roda do mouse / hover), eliminando menus intermediários desnecessários.

---

### 6.2 Diagnóstico e Propostas Componente por Componente (*Antes vs. Depois*)

#### A. Barra de Título Superior (`TitleBar.tsx`) — Topo Respirável e Livre para Arrasto
* **Arquivo:** [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx)
* **Problemas de Poluição Identificados (Estado Atual):**
  - **Crachá de versão fixo (`v2.1.0`):** Ocupa espaço permanente ao lado do logo sem utilidade contínua para o usuário durante a audição.
  - **Status de Autenticação Duplicado:** Exibe uma pílula `"Google: {user_name}"` ou `"Modo Visitante"` no topo direito (linhas 230–240), repetindo a mesma informação que já ocupa todo o rodapé da `Sidebar`.
  - **Breadcrumb Verboso (`Biblioteca > Nome da Playlist`):** Repete o prefixo `"Biblioteca >"` e o nome da playlist/álbum que já está renderizado em fonte `text-3xl` poucos pixels abaixo no banner principal.
  - **Banner Offline Extenso:** O aviso `"Modo offline (sem conexão com a internet)"` ocupa grande largura horizontal na barra de título.
* **Proposta de Limpeza (*Clean UI*):**
  1. **Mover a tag de versão (`v2.1.0`)** exclusivamente para o rodapé do modal de Configurações (`SettingsModal`).
  2. **Remover o crachá textual `"Google: Nome"` da `TitleBar`**, deixando na direita apenas indicadores de estado críticos e os 4 botões de janela nativos.
  3. **Simplificar o Indicador Offline:** Reduzir o texto na `TitleBar` para uma pílula compacta `<WifiOff /> Offline` (exibindo a explicação completa no tooltip ao passar o mouse).
  4. **Breadcrumb Inteligente (Contextual ao Scroll):** Ocultar o título redundante no `TitleBar` enquanto o cabeçalho grande da playlist/álbum estiver visível no topo, exibindo-o suavemente (`opacity`) apenas quando o usuário rolar a lista de músicas para baixo.
* **Impacto:** Libera **+40% de área livre** na barra de título para arrastar a janela (`start_drag_window`) sem clicar acidentalmente em crachás.

---

#### B. Barra Lateral (`Sidebar.tsx`) — Alinhamento Limpo, Busca Retrátil e Rodapé Compacto
* **Arquivo:** [`desktop/src/components/Sidebar/Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx)
* **Problemas de Poluição Identificados (Estado Atual):**
  - **Alça `<GripVertical />` sempre visível nos Fixados (linha 793):** Cada playlist/álbum fixado renderiza 6 pontos de arrasto fixos à esquerda da capa, empurrando as miniaturas para a direita e quebrando o alinhamento vertical com o restante da lista.
  - **Excesso de Cabeçalhos em Caixa Alta e Badges:** Divisórias com texto `"FIXADOS (X)"`, `"OUVIDOS RECENTES"`, além de pílulas textuais `"Tocando"` e `"Fixado"` dentro de cada linha, espremendo o título da playlist em uma barra de apenas `256px` (`w-64`).
  - **Subtítulos Verbosos em Cada Item:** Cada linha repete `"Playlist • Autor • 109 músicas"` ou `"Álbum • Artista"`, gerando três informações truncadas na mesma linha.
  - **Caixa de Busca Sempre Aberta + Segmented Control:** O topo da coleção empilha título + 2 botões + 3 abas + 1 input de busca permanente, consumindo **~135px verticais** antes mesmo do primeiro item da lista.
  - **Card de Conta Gigante no Rodapé (linhas 950–1018):** Ocupa **~76px de altura** mostrando Avatar, Nome, E-mail completo, botão de Revalidar Sessão e botão de Configurações.
* **Proposta de Limpeza & Redução de Cliques:**
  1. **Alinhamento Perfeito das Capas (Zero `<GripVertical />` Fixo):** Remover o `<GripVertical />` estático da esquerda; permitir arrastar diretamente pelo item fixado (ou exibir o grip sutilmente sobreposto no `group-hover`), mantendo todas as capas `w-10 h-10` alinhadas na mesma coluna.
  2. **Substituir Rótulos `"FIXADOS"` e `"OUVIDOS RECENTES"` por Divisória Minimalista:** Trocar os cabeçalhos de texto em caixa alta por uma linha sutil de `1px` (`border-white/5`) e identificar itens fixados apenas por um discreto ícone `<Pin className="w-3 h-3" />`.
  3. **Substituir o Badge `"Tocando"` por Indicador Acústico na Capa:** Em vez de uma tag de texto `"Tocando"` ao lado do nome, exibir o mini indicador de barras de áudio diretamente sobre a miniatura da capa da playlist ativa, ganhando **+65px horizontais** para leitura do nome da playlist.
  4. **Busca Retrátil por Ícone (`1 Clique`):** Substituir o campo de texto permanente `"Filtrar coleção..."` por uma lupa `<Search />` integrada na mesma linha das pílulas `[Tudo | Playlists | Álbuns]`. Ao clicar na lupa, o input desliza suavemente sobre a linha; ao limpar/pressionar `Esc`, recolhe novamente.
  5. **Unificar Rodapé em Pílula Compacta de 1 Clique:** Compactar o rodapé de conta para uma única linha discreta (`Avatar 28px + Nome + Ícone Engrenagem`), movendo o e-mail completo e o botão `"Revalidar sessão"` para dentro da aba Conta do `SettingsModal`.
* **Impacto:** Economiza **~110px de altura vertical** na `Sidebar` (permitindo ver **+2 a 3 playlists extras** sem rolar) e elimina o truncamento prematuro dos títulos.

---

#### C. Tela Principal da Biblioteca (`App.tsx` / `PlaylistGridView` / `AlbumGridView`) — Desduplicação da Toolbar
* **Arquivos:** [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx), [`desktop/src/components/MainView/PlaylistGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistGridView.tsx) e [`desktop/src/components/MainView/AlbumGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumGridView.tsx)
* **Problemas de Poluição Identificados (Estado Atual):**
  - **Subtítulo Explicativo Redundante (linha 1782):** Exibe a frase longa *"Suas playlists e álbuns salvos sincronizados com o YouTube Music (X playlists • Y álbuns)"*.
  - **Toolbar Repetida:** A barra superior da grade principal repete os mesmos controles que já estão a poucos centímetros de distância na `Sidebar` (`[Tudo | Playlists | Álbuns]`, campo de busca, botão `+ Nova Playlist` com texto e botão `Sincronizar`).
  - **Seletor de Ordenação Verboso:** O botão de ordenação exibe o prefixo estático `"Ordenar: Recentes"`, ocupando largura desnecessária.
* **Proposta de Limpeza & Redução de Cliques:**
  1. **Remover o Subtítulo Longo:** Deixar apenas o título `"Biblioteca"` acompanhado de um contador discreto em pílula (`24`).
  2. **Converter Botões de Texto em Ícones Circulares (`w-9 h-9`):**
     - Substituir o botão largo `[+ Nova Playlist]` por um botão circular somente-ícone `<Plus />` com tooltip `"Nova Playlist"`.
     - No dropdown de ordenação, remover o texto `"Ordenar:"` e manter apenas o ícone `<ArrowUpDown />` + critério curto (`Recentes`, `A–Z`), ou apenas o ícone com indicador.
     - Transformar o input `"Filtrar playlists e álbuns..."` em um botão `<Search />` expansível.
  3. **Sincronia Silenciosa:** Ocultar os contadores numéricos dentro de cada aba do Segmented Control (`Tudo`, `Playlists`, `Álbuns`), deixando a pílula deslizante muito mais limpa e simétrica.

---

#### D. Cabeçalho de Playlists e Álbuns (`PlaylistDetailView.tsx` & `AlbumDetailView.tsx`) — Fim da "Muralha de Botões"
* **Arquivos:** [`desktop/src/components/MainView/PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx) e [`desktop/src/components/MainView/AlbumDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumDetailView.tsx)
* **Problemas de Poluição Identificados (Estado Atual):**
  - **Fileira de 5 a 7 Botões com Texto Lado a Lado:**
    Atualmente, abrir uma playlist ou álbum renderiza uma fileira pesada de botões retangulares com texto:
    `[▶ Tocar Playlist]` + `[🔀 Aleatório]` + `[➕ Adicionar à Playlist]` + `[⬇ Baixar Playlist]` + `[📌 Fixar]` + `[✏️ Editar]` + `[🗑️ Excluir]` / `[🔗 Copiar Link]`.
  - **Triplicação da Contagem de Faixas:**
    1. Linha 1 do cabeçalho: `P0pes • 109 itens`
    2. Linha 2 do cabeçalho: `109 músicas carregadas` (visível nas capturas de tela)
    3. Barra de busca abaixo: `109 itens`
  - **Botão `"← Voltar para Biblioteca"` Repetido:** Ocupa uma linha vertical inteira acima da capa, repetindo a função da seta `<` que já existe logo acima no `TitleBar`.
  - **Segunda Barra de Ferramentas Volumosa:** Um container inteiro abaixo do cabeçalho só para abrigar o campo `"Buscar música ou artista na playlist... (Ctrl+F)"`, o dropdown `"Posição original"` e o contador repetido.
* **Proposta de Limpeza (*Padrão Spotify / Apple Music / Cider 2*):**
  1. **1 Botão Principal + Fileira de Ícones Circulares (`Icon Action Bar`):**
     - Manter **apenas** o botão primário de **Play/Pause** em destaque (um botão circular `w-12 h-12 rounded-full bg-[var(--accent)]` ou pílula curta `Reproduzir`).
     - Converter **todas** as demais ações em **botões circulares somente-ícone** (`w-10 h-10 rounded-full`):
       - `<Shuffle />` (*Modo Aleatório*)
       - `<Download />` / `<CheckCircle2 />` (*Baixar Offline / Baixada* — fica verde-esmeralda quando concluído, ou mostra anel de progresso compacto durante o download)
       - `<Pin />` (*Fixar na Biblioteca*)
       - `<ListPlus />` (*Adicionar Álbum à Playlist*)
       - `<Pencil />` (*Editar Playlist*)
       - `<Link2 />` (*Copiar Link*)
       - `<Trash2 />` (*Excluir Playlist*)
  2. **Unificar Metadados em 1 Única Linha:**
     - Fundir tudo em `P0pes • 109 músicas • 6h 12m`, **removendo completamente** a segunda linha `"109 músicas carregadas"` e o contador repetido da barra inferior.
  3. **Remover a Linha `"← Voltar para Biblioteca"` (ou torná-la apenas um ícone circular discreto):** Como o `TitleBar`, o atalho `Alt+←` e o botão lateral do mouse já voltam instantaneamente, eliminar o texto `"Voltar para Biblioteca"` ganha **+36px verticais** imediatos.
  4. **Integrar Busca (`Ctrl+F`) e Ordenação na Mesma Linha dos Botões de Ação:**
     - Em vez de uma segunda caixa inteira abaixo do banner, posicionar no lado direito da própria linha de botões de ação uma lupa `<Search />` (que expande o input quando clicada ou via `Ctrl+F`) e o ícone `<ArrowUpDown />` de ordenação.
* **Impacto:** Reduz a largura ocupada pelos botões em **~65%**, elimina **3 textos repetidos** e libera **+90px de espaço vertical** para exibir imediatamente mais faixas da playlist na tela.

---

#### E. Linhas de Música (`TrackRow.tsx`) — Ações de 1 Clique e Eliminação do Play Duplicado
* **Arquivo:** [`desktop/src/components/MainView/TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx)
* **Problemas de Poluição Identificados (Estado Atual):**
  - **Botão de Play Redundante na Extrema Direita (linhas 233–249):** Mesmo que clicar em qualquer lugar da linha (`TrackRow`) já reproduza ou pause a faixa, toda linha renderiza um botão circular `w-8 h-8` de Play permanente na extrema direita ao lado de `Duração`, `Heart` e `MoreVertical`.
  - **3 Cliques para Adicionar à Fila ou Playlist:** Para colocar uma música como "Tocar a seguir" ou salvá-la em uma playlist, o usuário precisa clicar em `...` (`MoreVertical`) e depois procurar a opção no menu.
* **Proposta de Limpeza & Redução de Cliques:**
  1. **Unificar Número da Faixa + Botão Play na Esquerda:**
     - Remover o botão circular de Play da extrema direita.
     - Na coluna esquerda (onde fica o índice `1, 2, 3...`), exibir o número em repouso; no `group-hover` (ou quando a faixa estiver tocando), substituir suavemente o número pelo ícone `<Play />` / `<Pause />` (ou mini barras animadas).
  2. **Ação Rápida de 1 Clique no Hover (`Adicionar à Fila / Playlist`):**
     - Na direita da linha, manter visível em repouso **apenas** a `Duração` (e o `<Heart />` se a música já for curtida).
     - Ao passar o mouse (`group-hover`), revelar suavemente 3 ícones limpos de **1 clique**:
       - `<Heart />` (*Curtir / Descurtir em 1 clique*)
       - `<ListPlus />` (*Adicionar para Tocar a Seguir em 1 clique*, sem precisar abrir o menu de contexto!)
       - `<MoreVertical />` (*Mais opções*)

---

#### F. Barra do Reprodutor (`PlayerBar.tsx`) & Gaveta (`NowPlayingDrawer.tsx`) — Foco Absoluto na Música
* **Arquivos:** [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx) e [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx)
* **Problemas de Poluição Identificados (Estado Atual):**
  - **3 Botões Diferentes para Abrir a Mesma Gaveta na `PlayerBar`:** Na direita da `PlayerBar`, existem o botão `[🎵 Fila]`, o botão `[🎤 Letras]` e um terceiro botão `[⌃ Seta]` (`ChevronUp/Down`), além do clique na capa/título da esquerda.
  - **Textos Desnecessários na Direita da `PlayerBar`:** Rótulos `"Fila"`, `"Letras"` e o crachá `"Tocando"` / `"Pausa"` ao lado do mini visualizador (sendo que o botão central de Play/Pause já mostra claramente se está tocando ou pausado).
  - **Triplicação da Faixa Atual no `NowPlayingDrawer`:** Quando a gaveta está aberta, o título e o artista da música aparecem simultaneamente em **3 lugares** na mesma tela (no topo esquerdo da gaveta com o badge `"REPRODUZINDO AGORA"`, abaixo da capa 3D central e na `PlayerBar` inferior), além de **2 botões de Curtir** e **2 indicadores de Crossfade** visíveis ao mesmo tempo.
* **Proposta de Limpeza & Ergonomia de 0/1 Clique:**
  1. **`PlayerBar` 100% Iconográfica na Direita:**
     - Remover os textos `"Fila"` e `"Letras"` dos botões da `PlayerBar`, mantendo apenas os ícones `<ListMusic />` e `<Mic2 />` com o mesmo ponto luminoso inferior (`w-1 h-1 rounded-full bg-[var(--accent)]`) já usado nos botões de `Shuffle`, `Repeat` e `Radio` — criando unidade visual perfeita em toda a barra inferior.
     - Remover o texto `"Tocando"` / `"Pausa"` do mini visualizador de espectro.
     - Remover o botão redundante `<ChevronUp />` da extrema direita (clicar em `<ListMusic />` abre/fecha a Fila em 1 clique; clicar em `<Mic2 />` abre/fecha as Letras em 1 clique; clicar na capa também alterna a gaveta).
  2. **Volume com Scroll do Mouse (*0 Cliques*):**
     - Adicionar suporte a `onWheel` sobre a área de volume da `PlayerBar` para aumentar/diminuir o som em passos de `5%` apenas girando o scroll do mouse, sem precisar clicar e arrastar a barra.
  3. **Cabeçalho Minimalista no `NowPlayingDrawer`:**
     - Remover a repetição do título/artista e o crachá `"REPRODUZINDO AGORA"` do canto superior esquerdo da gaveta.
     - Remover o botão duplicado `"Curtir"` com texto e o badge repetido `"Crossfade Xs"` que ficam empilhados abaixo da capa `MotionCover` (já que o botão interativo de Crossfade está no topo da gaveta e o botão de Curtir está logo abaixo na `PlayerBar`), deixando a capa 3D, o título principal e o `SpectrumVisualizer` respirarem com estética de galeria (*Apple Music / Cider 2*).

---

### 6.3 Matriz Resumo de Impacto: Redução de Cliques, Textos e Ganho de Espaço

| Área / Componente | O Que Sai (Poluição Removida) | O Que Entra (Solução Clean) | Economia de Espaço / Cliques |
| :--- | :--- | :--- | :--- |
| **`TitleBar`** | Tag `v2.1.0`, pílula duplicada `Google: Nome`, prefixo `Biblioteca >` e texto longo do modo offline. | Indicadores compactos por ícone e barra superior desobstruída para arrasto. | **-4 textos fixos** / **+40% área de drag** |
| **`Sidebar`** | `<GripVertical />` fixo desalinhado, cabeçalhos `FIXADOS` / `OUVIDOS RECENTES`, badge `Tocando`, input de busca fixo e rodapé de 76px. | Capas 100% alinhadas, lupa expansível em 1 clique, onda sobre a capa e rodapé compacto em linha única. | **+110px verticais livres** (+3 playlists visíveis sem scroll) |
| **`Library Toolbar`** | Subtítulo longo, texto `+ Nova Playlist`, prefixo `Ordenar:` e contadores redundantes nas abas. | Botões circulares somente-ícone (`<Plus />`, `<ArrowUpDown />`, `<Search />`). | **-60% de ruído textual** no topo da grade |
| **`Playlist & Album Header`** | Fileira de 6 botões largos com texto, linha repetida `X músicas carregadas`, linha `Voltar para Biblioteca` e 2ª barra de busca volumosa. | **1 botão Play de destaque** + fileira de **ícones circulares (`w-10 h-10`)** com busca/ordenação integradas na mesma linha. | **-65% largura de botões** / **+90px verticais** para a lista |
| **`TrackRow`** | Botão circular de Play duplicado na extrema direita da linha. | Play integrado no número da faixa no hover + botão rápido `<ListPlus />` (*Tocar a seguir*). | **De 2 cliques para 1 clique** para adicionar à fila |
| **`PlayerBar` & `Drawer`** | Rótulos `Fila`/`Letras`, texto `Tocando/Pausa`, botão `<ChevronUp>` extra, e triplicação de título/Curtir/Crossfade na gaveta. | Controles 100% por ícones com ponto luminoso ativo, volume via *Mouse Wheel* e gaveta limpa focada na arte. | **0 cliques** p/ volume (scroll) e **-5 elementos duplicados** |
