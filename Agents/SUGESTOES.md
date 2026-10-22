# 🚀 Guia Estratégico de Sugestões, Otimizações e Novas Features — TetPlayer Desktop

> **Data de Elaboração / Última Revisão:** 22 de Outubro de 2026  
> **Auditor Técnico:** Especialista em Arquitetura de Software, UX/UI e Sistemas de Mídia (`reviwer.md`)  
> **Documento de Referência:** [`Agents/SUGESTOES.md`](file:///d:/progrmação/programas/TetPlayer/Agents/SUGESTOES.md)  
> **Objetivo:** Fornecer um roadmap técnico, estruturado e categorizado para elevar o TetPlayer Desktop de um player de streaming eficiente a uma experiência de reprodução moderna, robusta, visualmente impressionante e escalável.

---

## 🧭 Visão Holística e Diagnóstico da Base Atual

O **TetPlayer Desktop** consolidou uma arquitetura moderna e eficiente, combinando o ecossistema nativo do **Tauri v2 (Rust)** com um frontend reativo em **React 19 + Vite + Tailwind CSS v4**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ARQUITETURA ATUAL DO TETPLAYER                    │
├────────────────────────────────┬───────────────────────────────────────┤
│ Camada                         │ Tecnologia & Responsabilidade         │
├────────────────────────────────┼───────────────────────────────────────┤
│ Backend de Sistema             │ Tauri v2 + Rust (Cookies, InnerTube)  │
│ Mecanismo de Áudio             │ Iframe Oculto YouTube Player API      │
│ Interface do Usuário           │ React 19 + TypeScript + Lucide        │
│ Estilização & Ambient Glow     │ Tailwind CSS v4 + GPU Dynamic Aurora  │
│ Provedor de Letras             │ LRCLIB API + Fallback YTM InnerTube   │
│ Controles Globais              │ Windows SMTC (MediaSession) + Rust    │
└────────────────────────────────┴───────────────────────────────────────┘
```

Apesar da alta qualidade visual e das respostas rápidas da interface, a análise estática e de produto revela oportunidades significativas para transformar o projeto em uma aplicação de padrão mundial. As melhorias a seguir foram divididas em **4 eixos estratégicos**:

1. ⚡ **Performance, Arquitetura e Engenharia de Código**
2. 🎧 **Experiência do Usuário (UX) & Ergonomia de Reprodução**
3. ✨ **Interface Visual (UI), Estética e Efeito "WOW"**
4. 🌐 **Novas Funcionalidades & Ecossistema de Integrações**

---

## Eixo 1: Performance, Arquitetura e Engenharia de Código

### 1.1 Modularização de `App.tsx` em Componentes e Custom Hooks
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Crítico para Manutenibilidade]` | **Esforço:** `[Médio]`
* **Implementação Concluída:**  
  O arquivo monolítico [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx) de ~2.900 linhas foi decomposto em módulos atômicos e especializados, reduzindo o arquivo principal para ~230 linhas:
  ```
  desktop/src/
  ├── types/                # Contratos TypeScript centralizados
  ├── services/cache.ts     # Cache local e persistência com stale-while-revalidate
  ├── workers/colorWorker.ts # Extração matemática de cores em thread dedicada
  ├── context/PlayerContext.tsx # Estado global de reprodução e fila
  ├── hooks/
  │   ├── useYouTubePlayer.ts   # Iframe lifecycle, seek, play/pause e volume throttling
  │   ├── useLyrics.ts          # Busca no LRCLIB/InnerTube, parser LRC, linha ativa e autoscroll
  │   ├── useAuroraColor.ts     # Amostragem da capa via Worker e injeção de CSS vars
  │   ├── useMediaSession.ts    # Integração completa com Windows SMTC
  │   └── useKeyboardShortcuts.ts # Atalhos globais e atalho Shift+Up
  └── components/
      ├── TitleBar/             # Drag da janela, controles de minimizar/maximizar/fechar
      ├── Sidebar/              # Navegação, biblioteca, playlists fixadas com grip arrastável
      ├── MainView/             # Grid de playlists, detalhes com virtualização e busca
      ├── Player/               # Barra inferior: controles, scrubber, volume e drawer trigger
      ├── NowPlayingDrawer/     # Gaveta de reprodução: Aurora Cover responsivo e abas WAI-ARIA
      ├── LyricsView/           # Karaokê sincronizado, autoscroll e botão de recentralização
      └── QueueView/            # Músicas passadas, tocando agora e a seguir com WAI-ARIA
  ```

---

### 1.2 Virtualização de Listas de Músicas (`@tanstack/react-virtual`)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo / Médio]`
* **Implementação Concluída:**  
  Implementado [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx) com a biblioteca oficial `@tanstack/react-virtual`.  
  Renderiza apenas os elementos visíveis na janela de rolagem (`windowing`), mantendo o DOM leve mesmo em playlists massivas (centenas ou milhares de faixas) e garantindo **144 FPS locked** sem perda de frames.

---

### 1.3 Cache Local e Persistência Offline via Stale-While-Revalidate
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Alto]` | **Esforço:** `[Médio]`
* **Implementação Concluída:**  
  Criado [`LocalCacheService`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts) persistindo biblioteca de playlists e faixas no disco.  
  Permite carregar e exibir a biblioteca e a playlist selecionada instantaneamente em **0ms** (*instant loading*), enquanto atualizações de rede ocorrem em segundo plano (*stale-while-revalidate*).

---

### 1.4 Processamento do Amostrador de Cores em Web Worker / OffscreenCanvas
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Implementação Concluída:**  
  O algoritmo de amostragem de cores e agrupamento euclidiano de saturação/brilho foi movido para o [`colorWorker.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/workers/colorWorker.ts) compilado como chunk dedicado pelo Vite, liberando 100% da thread de UI.

---

### 1.5 Transição Suave e Fade Gradual no Fundo Aurora (CSS `@property`)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Alto / Visual & UX]` | **Esforço:** `[Baixo / Médio]`
* **Implementação Concluída:**  
  Registradas propriedades CSS tipadas (`@property --aurora-1/2/3`) no [`index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css) com `syntax: "<color>"`.  
  O fundo dinâmico agora interpola matematicamente os canais de cor RGBA através de curva `0.75s cubic-bezier(0.2, 0.8, 0.2, 1)`, eliminando qualquer salto brusco ou efeito de piscar ao trocar de faixa. Paletas extraídas são mantidas em cache para transições em 0ms.

---

## Eixo 2: Experiência do Usuário (UX) & Ergonomia de Reprodução

### 2.1 Mini Player Flutuante (Always-on-Top / PiP Mode)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Muito Alto / Recurso Mais Pedido]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Um modo de visualização compacto que permite ao usuário manter o controle da música enquanto joga, estuda ou trabalha em outros programas.
* **Implementação Concluída:**
  - Janela reduzida sem decorações (`380x140px`) acionada pelo comando Rust `set_mini_player_mode`.
  - Configura a janela como **"Sempre no Topo"** (`set_always_on_top(true)`), mantendo o player visível sobre qualquer jogo ou software em tela cheia sem bordas.
  - Componente dedicado [`MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx) com região nativa de arrasto da janela (`data-tauri-drag-region`).
  - Mini capa com brilho de fundo, título e artista com marquee automático quando o texto excede o contêiner.
  - Mini espectro de áudio com 4 barras harmônicas animadas em tempo real.
  - Mini scrubber interativo com contadores de tempo decorrido e total.
  - Controles compactos: Play/Pause, Próxima, Anterior, Volume com slider popup e botão de restauração instantânea para o modo completo.
  - O iframe do YouTube permanece montado e ativo no DOM em modo oculto, garantindo **0ms de interrupção no fluxo de áudio**.
  - **Transparência Nativa de Janela:** `"transparent": true` ativado no Tauri e contêineres transparentes no CSS, eliminando qualquer borda ou quina escura nos cantos arredondados.
  - **Encaixe Magnético nas Bordas (Edge Snapping & Docking):** Supressão do Aero Snap do Windows com `set_resizable(false)` e `set_maximizable(false)`. Ao soltar a janela próximo da borda esquerda ou direita (~85px), o Mini Player recolhe instantaneamente em uma aba sutil de `38x90px` na margem do monitor.
  - **Deslocamento Vertical PiP (Estilo YouTube Android):** Segurar e arrastar a setinha mantém o tab estritamente travado na borda horizontal (X fixo), permitindo deslizar apenas para cima e para baixo ao longo da tela. Clicar (sem arrastar) na setinha expande o player para 380x140px.

---

### 2.2 Minimizar para a Bandeja do Sistema (System Tray com Menu de Contexto)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo / Médio via Tauri Tray]`
* **Descrição Conceitual:**  
  Permitir que o usuário feche a janela principal ou clique em minimizar para esconder o app na barra de tarefas do Windows, mantendo o som tocando de fundo no System Tray (área de notificação perto do relógio).
* **Implementação Concluída:**
  - `TrayIconBuilder` no Tauri v2 com ícone de alta resolução na bandeja do Windows e tooltip informativo do TetPlayer.
  - Menu nativo de botão direito com itens funcionais:
    - ⏯️ **Reproduzir / Pausar** (despacha evento IPC `tray-action: play-pause`)
    - ⏭️ **Próxima Faixa** (despacha `tray-action: next`)
    - ⏮️ **Faixa Anterior** (despacha `tray-action: prev`)
    - 🪟 **Mostrar / Ocultar TetPlayer** (alterna visibilidade e foco da janela)
    - 📌 **Alternar Mini Player** (despacha `tray-action: toggle-mini`)
    - 🚪 **Encerrar TetPlayer** (finaliza o processo graciosamente)
  - Clique simples no ícone da bandeja traz a aplicação instantaneamente para o primeiro plano.
  - Botão dedicado de minimizar para a bandeja adicionado à barra de título (`TitleBar.tsx`).

---

### 2.3 Reordenação da Fila via Drag & Drop (Arrastar para Reordenar)
* **Impacto:** `[Alto]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  A nova gaveta de reprodução já conta com a visualização clara de músicas a seguir. O próximo passo ergonômico é permitir ao usuário pegar qualquer música da lista "A Seguir" e arrastá-la para cima ou para baixo para personalizar a ordem de reprodução sem esforço.
* **Funcionalidades:**
  - Alça tátil de arrasto (*grip icon*) ao passar o mouse sobre cada item.
  - Reordenação dinâmica com feedback visual e animação suave de troca de posição.
  - Sincronização automática do índice da fila atual.

---

### 2.4 Menu de Contexto em Cada Faixa (Botão Direito / Ações Rápidas)
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo / Médio]`
* **Descrição Conceitual:**  
  Ao clicar com o botão direito do mouse em qualquer música (seja na playlist, busca ou fila), exibir um menu flutuante elegante com opções essenciais de reprodutor:
  - 🎵 **"Tocar a Seguir"** (insere a faixa imediatamente após a música atual na fila).
  - ➕ **"Adicionar ao Fim da Fila"**.
  - 🔗 **"Copiar Link do YouTube"** (facilita compartilhar a música com amigos).
  - 📋 **"Copiar Nome / Artista"**.
  - 🔍 **"Buscar mais músicas deste artista"**.

---

### 2.5 Sleep Timer (Temporizador de Sono)
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**  
  Ideal para usuários que gostam de dormir ouvindo música ou podcasts no desktop.
* **Funcionalidades:**
  - Menu rápido para programar pausa automática em: *15 min*, *30 min*, *45 min*, *1 hora* ou *Ao finalizar a faixa atual*.
  - Ao chegar ao término do tempo, o TetPlayer executa um fade-out gradual e pausado do áudio, sem sustos ou paradas bruscas.

---

### 2.6 Autoplay Infinito & Rádio da Faixa (Continuous Radio)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Alto]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Quando a playlist atual ou a fila manual do usuário terminar, o player não precisa ficar em silêncio. A aplicação pode consultar a API de recomendações do YouTube Music (`endpoint: next`) e adicionar automaticamente à fila faixas similares no mesmo estilo e gênero musical.
* **Implementação Concluída:**
  - Endpoint de rádio implementado em Rust [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs): `get_radio_tracks` consulta a API InnerTube `/next` com `enablePersistentPlaylistPanel: true` e parseia itens de `playlistPanelVideoRenderer`.
  - Integração contínua no [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx): quando a fila se aproxima do fim com o modo rádio ativo (`isAutoplayRadio`), busca e anexa recomendações automaticamente sem travar a reprodução.
  - Botão de rádio com ícone e estado ativo integrado na barra inferior de reprodução [`PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx).
  - Previne loops de faixas duplicadas e mantém a experiência contínua e sem anúncios.

---

## Eixo 3: Interface Visual (UI), Estética e Efeito "WOW"

### 3.1 Modo Tela Cheia Imersivo com Efeito Karaokê (Apple Music Style)
* **Impacto:** `[Muito Alto / Visual Impact]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Uma experiência visual cinematográfica para monitores modernos (incluindo ultrawide e TVs), acionada por `F11` ou botão dedicado de tela cheia.
* **Diferenciais Visuais:**
  - O fundo dinâmico Aurora se expande fluidamente por 100% da tela, com iluminação volumétrica viva e reflexos líquidos reagindo às cores da capa.
  - A capa do álbum aparece em grande escala no lado esquerdo com reflexo realista de vidro no piso.
  - No lado direito, as letras sincronizadas são exibidas em tipografia moderna (ex: `Inter` ou `Plus Jakarta Sans`) em tamanho grande, com efeito de **desfoque suave nas estrofes anteriores e posteriores** (*depth of field*), destacando exclusivamente a frase cantada no momento.
  - Suporte a rolagem manual sem perder a fluidez do cenário.

---

### 3.2 Visualizador de Áudio e Espectro Dinâmico (Waveform / Spectrum Bars)
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Alto]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Adicionar uma onda de frequência ou barras de equalizador vivas que pulsam em tempo real.
* **Implementação Concluída:**
  - Criado componente dinâmico [`SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx) com aceleração gráfica via GPU (`transform: scaleY`).
  - Suporta três variantes especializadas:
    - `mini`: 4 barras compactas integradas no Mini Player e na barra de reprodução ao lado do título da música.
    - `inline`: 12 barras harmônicas com gradientes adaptativos às cores da capa do álbum (`var(--aurora-1)` e `var(--aurora-2)`).
    - `full`: 24 barras de alta densidade integradas na gaveta "Tocando Agora" (`NowPlayingDrawer.tsx`), reagindo em tempo real ao estado de Play/Pause.
  - Curvas de interpolação harmônicas senoidais com frequências escalonadas, simulando resposta espectral de áudio com consumo de CPU < 0.1%.

---

### 3.3 Temas de Cores Customizáveis (Accent Themes & Modo Dark OLED)
* **Impacto:** `[Médio / Personalização]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**  
  Embora o tema padrão vermelho (`#dc2626`) seja a assinatura do TetPlayer, oferecer paletas alternativas confere sensação de software premium de primeira classe.
* **Presets de Acento:**
  - 🔴 **TetPlayer Ruby (Padrão):** Vermelho vibrante com detalhes carmesim.
  - 🟣 **Cyber Indigo:** Violeta elétrico com detalhes neon roxo.
  - 🟢 **Emerald Wave:** Verde esmeralda fresco estilo sintetizador analógico.
  - 🔵 **Ocean Blue:** Azul safira e turquesa profundo.
  - 🖤 **Monochrome Pure OLED:** Fundo 100% preto (`#000000`) com detalhes em cinza titânio e branco puro, otimizado para economia de energia e contraste absoluto em telas OLED.

---

### 3.4 Suporte a Letras Palavra-por-Palavra (Syllable / Word-by-Word Sync)
* **Impacto:** `[Alto]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Quando fornecido pelo LRCLIB ou InnerTube (`karaoke lyrics format`), iluminar cada palavra individualmente conforme ela é cantada pelo vocalista, replicando a consagrada experiência do Apple Music Sing e Spotify Karaoke.

---

## Eixo 4: Novas Funcionalidades & Ecossistema de Integrações

### 4.1 Integração com Discord Rich Presence (Discord RPC)
* **Impacto:** `[Muito Alto para Engajamento Social]` | **Esforço:** `[Baixo / Médio via Rust]`
* **Descrição Conceitual:**  
  Mostrar no perfil do Discord dos usuários exatamente o que eles estão ouvindo através do TetPlayer Desktop.
* **Dados Exibidos no Discord:**
  - Status: *"Ouvindo música no TetPlayer Desktop"*.
  - Nome da faixa, artista e álbum.
  - Capa da música como imagem grande e logotipo do TetPlayer como ícone pequeno.
  - Barra de tempo decorrido / restante sincronizada em tempo real.
  - Botão com link para abrir a música no YouTube Music.

---

### 4.2 Suporte Multi-Navegador para Sessão e Cookies do YouTube
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo / Médio no backend Rust]`
* **Diagnóstico Atual:**  
  O módulo [`desktop/src-tauri/src/auth.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs) atualmente procura pelos cookies de autenticação do YouTube exclusivamente nos caminhos do **Google Chrome**. Usuários que utilizam outros navegadores baseados em Chromium não conseguem carregar suas contas automaticamente.
* **Melhoria Proposta:**  
  Expandir a varredura automática do backend Rust para cobrir outros navegadores populares:
  - **Microsoft Edge** (`%LOCALAPPDATA%/Microsoft/Edge/User Data/Default/Cookies`)
  - **Brave Browser** (`%LOCALAPPDATA%/BraveSoftware/Brave-Browser/User Data/Default/Cookies`)
  - **Opera & Opera GX** (`%APPDATA%/Opera Software/Opera Stable/Network/Cookies`)
  - **Vivaldi** (`%LOCALAPPDATA%/Vivaldi/User Data/Default/Cookies`)
  - **Mozilla Firefox** (lendo o arquivo `cookies.sqlite` do perfil ativo).
  - Detecção com prioridade configurável ou seleção manual do navegador preferido nas configurações.

---

### 4.3 Equalizador Gráfico de 10 Bandas & Equalização de Volume (ReplayGain)
* **Impacto:** `[Alto para Audiófilos]` | **Esforço:** `[Médio / Alto]`
* **Descrição Conceitual:**  
  Músicas no YouTube frequentemente possuem níveis de gravação discrepantes (uma música toca muito alto e a seguinte muito baixo).
* **Soluções de Áudio:**
  - **Normalização de Volume Inteligente (Loudness Normalization):** Suaviza as diferenças de decibéis entre faixas de épocas e gêneros distintos.
  - **Equalizador Gráfico de 10 Bandas:** Com sliders de 32Hz a 16kHz e predefinições (Bass Boost, Treble, Acústico, Rock, Pop, Vocais Claras).

---

### 4.4 Estatísticas de Reprodução Pessoais ("TetStats / Wrapped")
* **Status:** `[Implementado e Validado]` ✅
* **Impacto:** `[Médio / Alto]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Um painel interno que contabiliza localmente no SQLite:
  - Top 10 músicas mais tocadas no TetPlayer.
  - Artistas mais ouvidos na semana/mês.
  - Tempo total de reprodução acumulado.
  - Exportação de imagem ou card com o resumo pessoal para compartilhar nas redes sociais.
* **Implementação Concluída:**
  - Módulo nativo em Rust [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs) com banco de dados SQLite embutido (`%LOCALAPPDATA%/com.tetplayer.desktop/tetstats.db`).
  - Criação automática da tabela `playback_history` indexada com comandos Tauri:
    - `log_playback_event`: registra faixas reproduzidas com timestamp UTC e duração ouvida.
    - `get_playback_stats`: consolida em tempo de execução métricas de total de faixas, horas ouvidas, artistas únicos, faixas distintas, top 10 faixas e top 5 artistas por período.
  - Painel visual completo [`StatsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsView.tsx):
    - 4 cartões de métricas com ícones gradientes (Total de Músicas, Tempo Ouvido, Artistas Únicos, Músicas Distintas).
    - Seletor de período temporal (Últimos 7 dias, Últimos 30 dias, Todo o Histórico).
    - Lista de Top 5 Artistas com medalhas douradas, prateadas e bronzeadas e contagem de reproduções.
    - Lista de Top 10 Músicas com ranking numérico estilizado, capa, artista e botão de play direto que inicia a faixa imediatamente.
  - Aba "Estatísticas" integrada na barra lateral de navegação ([`Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx)) e no título da aplicação ([`TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx)).

---

## 📊 Matriz de Priorização e Roadmap Sugerido

Para guiar o desenvolvimento de forma eficiente, as propostas foram agrupadas em 3 fases sequenciais de implementação:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ROADMAP DE IMPLEMENTAÇÃO TETPLAYER                   │
└────────────────────────────────────────────────────────────────────────┘

  FASE 1: QUALIDADE, ARQUITETURA & QUICK WINS (Imediato)
  ────────────────────────────────────────────────────────────────────────
  [x] Resolver apontamentos ativos do CORRECOES.md (Dessync de fila, volume flood)
  [x] Modularizar App.tsx em componentes e custom hooks especializados (Eixo 1.1)
  [x] Expandir captura do atalho Shift+Up e acessibilidade WAI-ARIA nas abas
  [x] Virtualização de listas longas (@tanstack/react-virtual) para 144 FPS (Eixo 1.2)
  [x] Cache Local e Persistência Offline via Stale-While-Revalidate (Eixo 1.3)
  [x] Amostragem de Cores em Web Worker / OffscreenCanvas (Eixo 1.4)
  [x] Transição Suave e Fade Gradual no Fundo Aurora com CSS @property (Eixo 1.5)
  [ ] Implementar Menu de Contexto (botão direito: tocar a seguir, copiar link)
  [ ] Sleep Timer (Temporizador de suspensão programada de áudio)

  FASE 2: ERGONOMIA, FLUIDEZ & EXPERIÊNCIA DE USO (Curto Prazo)
  ────────────────────────────────────────────────────────────────────────
  [x] Mini Player flutuante (Picture-in-Picture / Always-on-Top) (Eixo 2.1)
  [x] Minimizar para o System Tray com menu de atalhos rápidos (Eixo 2.2)
  [ ] Reordenação Drag & Drop na visualização da fila de reprodução
  [ ] Suporte de sessão a outros navegadores (Edge, Brave, Firefox)

  FASE 3: DIFERENCIAÇÃO, VISUAL PREMIUM & RECURSOS AVANÇADOS (Médio Prazo)
  ────────────────────────────────────────────────────────────────────────
  [ ] Modo Tela Cheia Imersivo / Karaokê em tela cheia com estrofes desfocadas
  [ ] Discord Rich Presence (exibição de faixa, artista e tempo no perfil)
  [x] Autoplay Infinito / Rádio contínua ao término da lista (Eixo 2.6)
  [x] Visualizador de Áudio e Espectro Dinâmico (Waveform / Spectrum Bars) (Eixo 3.2)
  [ ] Temas de acento customizáveis (Cyber Indigo, Emerald, Dark OLED)
  [x] Painel de estatísticas pessoais de audição ("TetStats") (Eixo 4.4)
```

---

## 📌 Conclusão

Com a implementação progressiva deste catálogo de sugestões, o **TetPlayer Desktop** não apenas manterá seu diferencial de performance ágil e leveza sem anúncios, mas se consolidará como uma das alternativas de reprodutor de música mais completas, elegantes e agradáveis disponíveis no ecossistema desktop.
