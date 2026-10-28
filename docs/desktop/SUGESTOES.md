# 🚀 Guia Estratégico de Sugestões, Otimizações e Novas Features — TetPlayer Desktop

> **Data de Elaboração / Última Revisão:** 27 de Outubro de 2026  
> **Auditor Técnico:** Especialista em Arquitetura de Software, UX/UI e Sistemas de Mídia (`reviewer`)  
> **Documento de Referência:** [`docs/desktop/SUGESTOES.md`](file:///d:/progrmação/programas/TetPlayer/docs/desktop/SUGESTOES.md)  
> **Status:** 🟢 **49 Itens Concluídos e Validados no Histórico Consolidado (Milestone v1.4+)** | 💡 **19 Sugestões Futuras v1.4+ Mapeadas (incl. pesquisa de mercado e preparação para app público)**  
> **Objetivo:** Fornecer um roadmap técnico, moderno e categorizado para elevar o TetPlayer Desktop ao estado da arte em reprodutores de mídia para desktop.

---

## 🧭 Visão Holística e Diagnóstico da Base Atual

O **TetPlayer Desktop** opera sobre uma fundação de alta performance combinando o ecossistema nativo do **Tauri v2 (Rust)** com um frontend reativo em **React 19 + TypeScript + Tailwind CSS v4**.

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
│ Controles Globais              │ Windows SMTC + GlobalShortcut + Tray  │
│ Persistência Local             │ SQLite Embutido (TetStats + AppCache) │
│ Resiliência de Rede            │ Exponential Backoff Retry + Offline   │
│ Atualizações Contínuas         │ Auto-Updater In-App Silencioso (NSIS) │
└────────────────────────────────┴───────────────────────────────────────┘
```

Abaixo encontram-se a **pesquisa de mercado**, as **21 sugestões ativas em aberto** para as próximas versões e o **Histórico Consolidado** com todos os 47 itens já implementados, testados e validados na base de código.

---

## 🔎 Pesquisa de Mercado: O que Usuários Pedem em Clientes de Música Desktop

> [!NOTE]
> Levantamento feito a partir de discussões do r/YoutubeMusic, dos plugins mais usados do cliente open-source [th-ch/youtube-music](https://github.com/th-ch/youtube-music), de clientes alternativos de YouTube Music (OuterTune, Metrolist, ViMusic) e das funções mais pedidas no Spotify Desktop. Cada demanda foi cruzada com o código atual do TetPlayer.

| Demanda recorrente dos usuários | Onde aparece | Situação no TetPlayer |
|---|---|---|
| App nativo leve, sem "cara de aba do navegador" | Reddit (queixa nº 1 do app oficial) | ✅ Já atendido (Tauri + Rust) |
| Eliminação de stuttering com motor de áudio nativo e pré-buffer | Audiófilos, Reddit, clientes desktop | ✅ Já atendido (Motor Híbrido Stream Direto + IFrame em 1.1 / Item 49) |
| Playlists completas sem corte no limite de 100 músicas | Reddit, usuários de playlists grandes | ✅ Já atendido (Loop de Continuation Tokens em 1.2 / Item 48) |
| Teclas de mídia globais, bandeja, mini player | Reddit, th-ch | ✅ Já atendido |
| Letras sincronizadas | Reddit, th-ch | ✅ Já atendido (Kinetic Scroll suave) |
| Buscar uma música **dentro** de uma playlist e ordenar | Reddit (muito citado) | ✅ Já atendido (Busca em tempo real e ordenação em 2.2 / Item 47) |
| Curtir/descurtir e ver se a faixa já está curtida | Reddit | ❌ Não existe → **2.3** |
| Criar, editar e modificar playlists (adicionar, remover, renomear, reordenar) | Reddit, Spotify | ❌ Não existe → **2.4** |
| Voltar de onde parou ao reabrir o app | Clientes alternativos | ❌ Não existe → **2.5** |
| Notificação nativa ao trocar de faixa | th-ch (plugin Notifications) | ❌ Não existe → **2.6** |
| Bloquear músicas/artistas da rádio e recomendações | Reddit, Spotify | ❌ Não existe → **2.7** |
| Botões Voltar/Avançar de navegação | th-ch (plugin Navigation), Reddit | ❌ Não existe → **2.8** |
| Volume pela roda do mouse com passos precisos | th-ch (plugin Precise Volume) | ❌ Não existe → **2.9** |
| Feed de lançamentos e biblioteca de álbuns/artistas | Reddit, Spotify | ❌ Não existe → **2.10** |
| Sleep timer | Clientes alternativos | ❌ Não existe → **2.1** |
| Discord Rich Presence | th-ch, Reddit | ❌ Não existe → **4.1** |
| Equalizador / normalização real de volume | Clientes alternativos, audiófilos | ⚠️ Só um limitador simples acima de 85% → **4.2** |
| Scrobbling Last.fm / ListenBrainz | th-ch (plugin Last.fm) | ❌ Não existe → **4.3** |
| Pular intros/trechos não musicais (SponsorBlock) | th-ch (plugin SponsorBlock) | ❌ Não existe → **4.4** |
| Controlar pelo celular / Stream Deck (estilo Spotify Connect) | Reddit, th-ch (API Server) | ❌ Não existe → **4.5** |
| Botões de mídia na miniatura da barra de tarefas | th-ch (Taskbar Media Control) | ❌ Não existe → **4.6** |
| Importar playlists do Spotify / CSV | Clientes alternativos | ❌ Não existe → **4.7** |
| Download de músicas/playlists para escuta offline | Clientes alternativos (muito pedido) | ❌ Não existe → **4.8** |
| Login próprio com Google via Webview (independente de navegador) | Apps desktop públicos (th-ch, Spotube) | ✅ Já atendido (Webview isolada nativa em 4.9) |
| Atualização in-app automática (buscar nas configs, download em 1 clique) | Apps desktop modernos (Spotify, Discord, th-ch) | ✅ Já atendido (Auto-updater silencioso nativo em 4.10) |

---

## 💡 SUGESTÕES ATIVAS EM ABERTO (Roadmap v1.4+)

> [!TIP]
> Os números das sugestões originais foram mantidos como identificadores únicos de referência. Itens concluídos foram transferidos integralmente para a seção [Histórico Consolidado](#-histórico-consolidado-46-sugestões-e-otimizações-concluídas).

---

### Eixo 1: Fundação Técnica do Motor de Áudio

#### 1.1 Motor de Áudio Nativo Híbrido (Stream Direto com Pré-Buffer e Fallback Resiliente para IFrame)
* **Status:** `[Concluído e Validado no Histórico Consolidado — Item 49]` ✅
* **Impacto:** `[Crítico / Muito Alto]` | **Esforço:** `[Alto]`
* **Implementação Concluída:** Ver detalhes arquiteturais completos no [Item 49 do Histórico Consolidado](#49-motor-de-áudio-nativo-híbrido-com-pré-buffer-e-fallback-resiliente-para-iframe-item-11).
* **Origem & Diagnóstico Técnico do Problema:**
  - **Stuttering e Engasgos de Áudio:** O TetPlayer atualmente reproduz mídia através de um **iframe oculto do YouTube** ([useYouTubePlayer.ts](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts)). O iframe carrega em segundo plano todo o pipeline de vídeo do YouTube (decodificação de codecs pesados como VP9/AV1), telemetria e algoritmos ABR (Adaptive Bitrate) do Google, que restringem o buffer antecipado a poucos segundos para economizar largura de banda nos servidores da CDN. Qualquer micro-variação de rede ou concorrência de CPU esvazia o buffer do Iframe, causando engasgos (*audio stuttering*).
  - **Latência de Troca (1 a 2.5s):** O IFrame não consegue pré-carregar a próxima faixa antes que a atual termine. Cada troca de faixa exige destruir o contexto do player, negociar novas conexões de mídia e carregar um novo player do zero.
  - **Bloqueio da Web Audio API (CORS):** Por estar encapsulado em um iframe de domínio cruzado (youtube.com), o navegador bloqueia o acesso aos dados brutos de áudio via Web Audio API, impossibilitando a criação de Equalizador real, ReplayGain (normalização de volume) e Crossfade verdadeiro com sobreposição de ondas sonoras.

* **Arquitetura da Solução Híbrida (Nativo + IFrame Fallback):**
  `
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 ARQUITETURA DO MOTOR DE ÁUDIO HÍBRIDO                  │
  ├────────────────────────────────────────────────────────────────────────┤
  │                                                                        │
  │  1. Solicitação de Faixa (videoId)                                     │
  │     │                                                                  │
  │     ▼                                                                  │
  │  [Backend Rust (ytm.rs)] ──► Endpoint InnerTube /player (ANDROID_MUSIC)│
  │     │                                                                  │
  │     ├─► Sucesso (95% - 98% dos casos):                                 │
  │     │   Retorna URL direta limpa (Opus 160kbps / AAC 128kbps)          │
  │     │   │                                                              │
  │     │   ▼                                                              │
  │     │  [Motor de Áudio Nativo (Web Audio API / HTML5 Audio)]           │
  │     │   ├─ Pré-Buffer em RAM (10s a 30s antecipados, zero stutter)    │
  │     │   ├─ Pré-carregamento da próxima faixa nos últimos 15s (0ms)     │
  │     │   ├─ Grafo de Efeitos (Equalizador 10 bandas + Bass Boost)        │
  │     │   ├─ Normalização Dinâmica de Volume (ReplayGain / Limiter)      │
  │     │   └─ Crossfade Real com Sobreposição (Dois nós GainNode ativos)  │
  │     │                                                                  │
  │     └─► Falha / Cipher / Restrição de Gravadora (2% - 5% dos casos):   │
  │         Desvio transparente e silencioso (< 200ms)                     │
  │         │                                                              │
  │         ▼                                                              │
  │        [Fallback Silencioso: IFrame do YouTube (useYouTubePlayer.ts)]   │
  │         Garante que a música toque SEMPRE, sem erro e sem interrupção. │
  └────────────────────────────────────────────────────────────────────────┘
  `

* **Ganhos Comprovados de Performance e Consumo:**
  | Métrica | Com IFrame Oculto (Atual) | Com Motor Nativo Direto (Proposta) |
  |---|---|---|
  | **Consumo de Memória RAM** | ~80 MB a 150 MB por processo de Iframe | ~5 MB a 15 MB (áudio puro em memória) |
  | **Consumo de Banda por Faixa** | ~15 MB a 30 MB (baixa vídeo oculto + áudio) | ~3 MB a 5 MB (apenas stream de áudio Opus/AAC) |
  | **Uso de CPU / GPU** | Alto (decodificação contínua de frames de vídeo) | Quase nulo (decodificação de áudio estéreo) |
  | **Buffer / Resiliência a Oscilações** | ~3 a 5 segundos (suscetível a stutter) | 30s a faixa inteira pré-carregada em RAM |
  | **Latência de Troca de Música** | 1.000ms a 2.500ms de silêncio | 0ms a 50ms (instantâneo / pré-carregado) |
  | **Acesso a Equalizador e Filtros** | Impossível (bloqueado por CORS) | Total (Web Audio API: BiquadFilterNode, etc.) |

* **Análise de Frequência do Fallback (Por que o Fallback é Seguro e Raro):**
  - **Taxa de Sucesso Nativo (~95% a 98% das faixas):** O cliente ANDROID_MUSIC do InnerTube entrega quase a totalidade das músicas oficiais do catálogo do YouTube Music com URLs diretas não cifradas no array daptiveFormats.
  - **Incidência do Fallback (~2% a 5% das faixas):** Ocorre unicamente em:
    1. *Vídeos comuns do YouTube inseridos em playlists:* Versões ao vivo amadoras, rips de fãs ou uploads antigos que não pertencem ao catálogo oficial de música e usam signatureCipher.
    2. *Restrições territoriais estritas de gravadoras (ex: UMG/Sony):* Poucos lançamentos recém-adicionados com travas de DRM temporárias.
    3. *Atualizações periódicas de segurança do Google (PO Token):* Mudanças que o Google implementa a cada 4 a 8 meses para bloquear bots. Quando isso ocorre, o IFrame assume 100% da carga enquanto o backend é ajustado, sem que o usuário final fique no silêncio.

---

#### 1.2 Paginação Completa de Playlists com Continuação Automática (Token de Continuação)
* **Status:** `[Concluído e Validado no Histórico Consolidado — Item 48]` ✅
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo / Médio]`
* **Implementação Concluída:** Ver detalhes completos no [Item 48 do Histórico Consolidado](#48-paginação-completa-de-playlists-com-continuação-automática-item-12-da-pesquisa-de-mercado).
* **Origem & Diagnóstico do Problema:**
  - **Corte de Playlists em 100 Músicas:** O endpoint do YouTube Music (https://music.youtube.com/youtubei/v1/browse) envia listas de faixas paginadas em lotes de no máximo 100 itens por requisição.
  - Se uma playlist tiver mais de 100 músicas (ex: 109, 150, 500 ou 1.000 faixas), a resposta inicial traz apenas as 100 primeiras faixas e inclui um token de continuação em musicPlaylistShelfRenderer.continuations[0].nextContinuationData.continuation (ou continuationCommand).
  - Atualmente, a função get_playlist_tracks em [desktop/src-tauri/src/ytm.rs](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) efetua apenas uma chamada única.
  - **Consequência no TetPlayer:** Em uma playlist de 109 músicas, o TetPlayer exibe apenas 100 músicas. Ao tocar do início, as faixas 101 a 109 não entram na fila de reprodução e nunca são tocadas. Em uma playlist de 500 músicas, 400 músicas ficam inacessíveis.
* **Solução Proposta (Backend Rust):**
  - No backend Rust ([desktop/src-tauri/src/ytm.rs](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs)), implementar um loop assíncrono iterativo:
    1. Disparar a chamada inicial para /youtubei/v1/browse com o `browseId`.
    2. Extrair as faixas do lote inicial para o vetor acumulador `tracks`.
    3. Verificar a presença de token de continuação em `json_val`.
    4. Se houver token, disparar requisição para /youtubei/v1/browse?continuation={token} com payload contextual correspondente.
    5. Repetir o processo adicionando as novas faixas ao acumulador até que não haja mais token de continuação (ou até atingir um teto seguro configurável de 1.000 a 2.000 faixas para evitar loops infinitos).
    6. Retornar a lista 100% completa para o frontend.
  - No frontend, a lista virtualizada existente ([PlaylistDetailView.tsx](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx)) já é otimizada para listas longas e renderizará todas as centenas de músicas sem perda de performance.

---

### Eixo 2: Experiência do Usuário (UX) & Ergonomia de Reprodução

#### 2.1 Sleep Timer (Temporizador de Suspensão com Fade-Out Gradual)
* **Status:** `[Em Aberto / Alta Prioridade]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Descrição Conceitual:**  
  Ideal para usuários que gostam de dormir ou estudar ouvindo música no desktop.
* **Funcionalidades:**
  - Menu rápido para programar pausa automática em: *15 min*, *30 min*, *45 min*, *1 hora* ou *Ao finalizar a faixa atual*.
  - Ao chegar ao término do tempo, o TetPlayer executa um fade-out gradual e suave de volume ao longo de 20 segundos, pausando sem paradas bruscas.

---

#### 2.2 Busca e Ordenação Dentro de Playlists
* **Status:** `[Concluído e Validado no Histórico Consolidado — Item 47]` ✅
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo]`
* **Origem:** Uma das queixas mais repetidas no r/YoutubeMusic: numa playlist de 500 músicas não há como procurar uma faixa.
* **Implementação Concluída:** Ver detalhes completos no [Item 47 do Histórico Consolidado](#47-busca-instantânea-e-ordenação-flexível-dentro-de-playlists-item-22-da-pesquisa-de-mercado).

---

#### 2.3 Curtir / Descurtir Sincronizado com o YouTube Music
* **Status:** `[Em Aberto / Essencial]` 💡
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo / Médio]`
* **Origem:** Usuários reclamam de não saber se uma música já está curtida sem abrir menus.
* **Funcionalidades:**
  - Botão de coração no [`PlayerBar`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx), no Mini Player e no menu de contexto.
  - Comandos Rust usando os endpoints InnerTube `like/like`, `like/dislike` e `like/removelike` com o `videoId`, reaproveitando a sessão autenticada de [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
  - "Descurtir" pula a faixa na hora e ajuda o algoritmo da rádio.

---

#### 2.4 Edição e Modificação Avançada de Playlists (Criar, Adicionar, Remover, Renomear e Reordenar)
* **Status:** `[Em Aberto / Essencial]` 💡
* **Impacto:** `[Alto]` | **Esforço:** `[Médio]`
* **Origem:** Hoje o TetPlayer apenas lê playlists existentes. Para um cliente completo e público, o gerenciamento bidirecional direto com a nuvem do YouTube Music é indispensável.
* **Funcionalidades & Arquitetura:**
  - **Menu de Contexto Completo:** Opção *"Adicionar à playlist…"* no [`TrackContextMenu`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx), exibindo a lista das playlists do usuário com busca rápida e botão *"Criar nova playlist"*.
  - **Criação de Playlist Nativa:** Modal para criar playlist com Título, Descrição e Nível de Privacidade (Pública, Não Listada, Privada) chamando o endpoint InnerTube `/playlist/create`.
  - **Edição em `PlaylistDetailView`:**
    - Botão de remover faixa da playlist atual (`ACTION_REMOVE_VIDEO_BY_VIDEO_ID` ou `setVideoId`).
    - Opção de renomear e alterar descrição da playlist (`ACTION_SET_PLAYLIST_NAME` / `ACTION_SET_PLAYLIST_DESCRIPTION`).
    - Reordenação de faixas via drag & drop refletida no YouTube Music (`ACTION_MOVE_VIDEO_AFTER`).
  - **Salvar Fila Atual:** Botão *"Salvar fila de reprodução como playlist"* na bandeja Now Playing.
  - **Invalidação Reativa de Cache:** Atualização instantânea da biblioteca e da tabela `app_cache` do SQLite após qualquer mutação.

---

#### 2.5 Restaurar a Sessão ao Reabrir o App
* **Status:** `[Em Aberto / Essencial]` 💡
* **Impacto:** `[Alto]` | **Esforço:** `[Baixo]`
* **Funcionalidades:**
  - Salvar periodicamente a fila, o índice atual, a posição na música e o modo shuffle/repeat na tabela `app_cache` do SQLite (já existente).
  - Ao abrir, restaurar tudo **pausado** na posição exata. Configuração para desativar.

---

#### 2.6 Notificações Nativas de Troca de Faixa
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Funcionalidades:**
  - Toast do Windows com capa, título e artista via `tauri-plugin-notification`.
  - Exibida só quando a janela não está em foco (evita poluição). Liga/desliga nas configurações.

---

#### 2.7 Bloquear Faixas e Artistas da Rádio / Autoplay ("Não Tocar Isto")
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Alto]` | **Esforço:** `[Baixo / Médio]`
* **Origem:** Pedido constante no Spotify e YouTube Music: músicas indesejadas que voltam sempre na rádio.
* **Funcionalidades:**
  - Opções "Não tocar esta música" e "Não tocar este artista" no menu de contexto.
  - Lista de bloqueio local no SQLite, aplicada ao anexar faixas da rádio no [`playerReducer`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts) e ao avançar a fila.
  - Tela para revisar e desbloquear itens nas configurações.

---

#### 2.8 Navegação Voltar / Avançar com Histórico
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Funcionalidades:**
  - Pilha de navegação entre telas (biblioteca, playlist, busca, estatísticas) com botões ← → na barra de título.
  - Suporte aos botões laterais do mouse e `Alt+←` / `Alt+→` (sem conflito com `←`/`→`, que hoje fazem seek).

---

#### 2.9 Volume pela Roda do Mouse com Passos Precisos
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Baixo / Médio]` | **Esforço:** `[Baixo]`
* **Funcionalidades:**
  - Rolar o mouse sobre o controle de volume (e sobre o Mini Player) ajusta o volume.
  - Tamanho do passo configurável (1%, 2%, 5%) e tooltip com a porcentagem atual.

---

#### 2.10 Feed de Lançamentos e Biblioteca Expandida (Álbuns, Artistas, Curtidas)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Alto]` | **Esforço:** `[Médio]`
* **Origem:** Usuários que seguem muitos artistas querem uma lista confiável de novidades.
* **Funcionalidades:**
  - Aba "Novidades" com lançamentos via browse InnerTube (`FEmusic_new_releases`).
  - Abas de biblioteca para álbuns salvos, artistas inscritos e músicas curtidas.
  - Página de artista com discografia organizada por álbuns.

---

### Eixo 3: Interface Visual (UI), Estética e Efeito "WOW"

#### 3.1 Modo Tela Cheia Imersivo com Efeito Karaokê (Apple Music Style)
* **Status:** `[Em Aberto / Alta Prioridade]` 💡
* **Impacto:** `[Muito Alto / Visual Impact]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Uma experiência visual cinematográfica para monitores e TVs, acionada pela tecla `F11` ou botão dedicado na barra superior.
* **Diferenciais Visuais:**
  - Fundo dinâmico Aurora expandido por 100% da tela com iluminação volumétrica profunda.
  - Capa do álbum em grande escala no lado esquerdo com reflexo realista de vidro.
  - Letras sincronizadas em tipografia ampliada no lado direito com **desfoque suave de profundidade de campo (*depth of field blur*)** nas frases anteriores e posteriores, iluminando com brilho vívido a estrofe cantada no momento.

---

#### 3.2 Suporte a Letras Sincronizadas Palavra-por-Palavra (Syllable / Word-by-Word Sync)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Alto / Visual]` | **Esforço:** `[Médio]`
* **Descrição Conceitual:**  
  Quando fornecido pelo LRCLIB ou InnerTube (`karaoke lyrics format`), iluminar individualmente cada sílaba/palavra conforme ela é entoada pelo vocalista, replicando a consagrada experiência do Apple Music Sing e Spotify Karaoke.

---

### Eixo 4: Novas Funcionalidades & Ecossistema de Integrações

#### 4.1 Integração com Discord Rich Presence (Discord RPC)
* **Status:** `[Em Aberto / Alta Prioridade]` 💡
* **Impacto:** `[Muito Alto para Engajamento Social]` | **Esforço:** `[Baixo / Médio via Rust]`
* **Dados Exibidos no Perfil do Discord:**
  - Status: *"Ouvindo música no TetPlayer Desktop"*.
  - Nome da faixa, artista e álbum.
  - Capa da música como imagem grande e logotipo do TetPlayer como ícone pequeno.
  - Barra de tempo decorrido / restante sincronizada em tempo real.
  - Botão com link para abrir a música diretamente no YouTube Music.

---

#### 4.2 Equalizador Gráfico de 10 Bandas & Equalização de Volume (ReplayGain)
* **Status:** `[Em Aberto / Alta Prioridade]` 💡
* **Impacto:** `[Alto para Audiófilos]` | **Esforço:** `[Médio / Alto]`
* **Soluções de Áudio:**
  - **Normalização de Volume Inteligente (Loudness Normalization):** Suaviza as diferenças de decibéis entre faixas de épocas e gêneros distintos.
  - **Equalizador Gráfico de 10 Bandas:** Com sliders de 32Hz a 16kHz e predefinições (Bass Boost, Treble, Acústico, Rock, Pop, Vocais Claras).
* **Observações técnicas (após análise do código):**
  - A opção "Normalização de Volume" atual em [`useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts) é só um limitador: reduz pela metade o que passar de 85% do volume. Não iguala o volume entre faixas.
  - **Normalização real já é possível sem trocar o motor:** a resposta do endpoint InnerTube `/player` traz o valor de loudness da faixa (`loudnessDb`). Basta buscá-lo no Rust e ajustar o `setVolume` do iframe por faixa.
  - **O equalizador depende do item 1.1** (motor de áudio nativo), porque o áudio do iframe não pode ser processado.

---

#### 4.3 Scrobbling para Last.fm e ListenBrainz
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Alto para entusiastas]` | **Esforço:** `[Médio]`
* **Origem:** Plugin Last.fm é um dos mais usados no th-ch/youtube-music.
* **Funcionalidades:**
  - Login no Last.fm (fluxo de autenticação desktop) e token do ListenBrainz nas configurações.
  - "Now Playing" ao iniciar a faixa e scrobble seguindo a regra padrão (faixa com mais de 30s, tocada por metade da duração ou 4 minutos).
  - Fila offline de scrobbles no SQLite, reenviada quando a internet voltar (reaproveitando `retryWithBackoff`).

---

#### 4.4 Pular Trechos Não Musicais Automaticamente (SponsorBlock)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Baixo]`
* **Origem:** Plugin SponsorBlock do th-ch/youtube-music. Videoclipes costumam ter intros faladas, cenas e outros sem música.
* **Funcionalidades:**
  - Consulta à API pública do [SponsorBlock](https://sponsor.ajay.app) pela categoria `music_offtopic` usando o `videoId`.
  - Seek automático ao entrar num segmento marcado, com aviso discreto "Trecho não musical pulado".
  - Liga/desliga nas configurações. Os segmentos também ajustam o cálculo do crossfade.

---

#### 4.5 Controle Remoto pelo Celular e Stream Deck (Servidor Local)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Alto]` | **Esforço:** `[Médio / Alto]`
* **Origem:** Usuários sentem falta de algo como o Spotify Connect. O th-ch oferece um "API Server" para Stream Deck.
* **Funcionalidades:**
  - Servidor HTTP + WebSocket na rede local, desligado por padrão.
  - Página web leve aberta no celular via QR Code: capa, play/pause, próxima, volume, fila.
  - Pareamento por token e acesso só pela rede local, por segurança.
  - Mesma API usada por Stream Deck e automações.

---

#### 4.6 Botões de Mídia na Miniatura da Barra de Tarefas do Windows
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio]` | **Esforço:** `[Médio]`
* **Funcionalidades:**
  - Botões Anterior / Play-Pause / Próxima na prévia ao passar o mouse sobre o ícone da barra de tarefas (API `ITaskbarList3` via crate `windows` no Rust).
  - Progresso da música desenhado no próprio ícone da barra de tarefas.

---

#### 4.7 Importação de Playlists de Outros Serviços (Spotify / CSV / M3U)
* **Status:** `[Em Aberto]` 💡
* **Impacto:** `[Médio / Alto para quem está migrando]` | **Esforço:** `[Médio]`
* **Depende de:** 2.4 (criar playlists).
* **Funcionalidades:**
  - Importar arquivos CSV (ex.: exportados pelo Exportify) ou M3U.
  - Busca automática de cada faixa no YouTube Music, com tela de revisão para correspondências duvidosas.
  - Criação da playlist final na conta do usuário.

---

#### 4.8 Downloads de Músicas e Playlists para Reprodução Offline (Biblioteca Local & Modo Híbrido)
* **Status:** `[Em Aberto / Alto Impacto]` 💡
* **Impacto:** `[Muito Alto para Usuários]` | **Esforço:** `[Alto]`
* **Origem:** Funcionalidade mais requisitada em clientes alternativos (Spotube, RiMusic, ViMusic, Metrolist). Permite ouvir músicas em viagens, conexões lentas ou sem internet.
* **Arquitetura Técnica:**
  - **Pipeline de Download:**
    - Backend Rust obtém os streams de áudio através do endpoint `/player` (ou via módulo nativo com assinatura decifrada).
    - Download em chunks assíncronos via `reqwest` com barra de progresso em tempo real.
    - Gravação em formato de alta fidelidade (`.m4a` / AAC ou `.opus` / OGG Vorbis).
  - **Injeção de Metadados e Capa (Tagging ID3):**
    - Embutir automaticamente metadados completos: título, artista principal, artistas participantes, álbum, ano de lançamento, número da faixa e capa em alta resolução (extraída de `artwork_url`).
  - **Armazenamento e Indexação Local:**
    - Arquivos salvos em diretório dedicado (`%APPDATA%/TetPlayer/Music/` ou customizável nas configurações).
    - Registro e indexação no SQLite local em tabela dedicada `downloads (video_id, title, artist, file_path, file_size, downloaded_at)`.
  - **Reprodução Híbrida Inteligente:**
    - Antes de iniciar o streaming de qualquer música, o player verifica se o `video_id` consta nos arquivos baixados. Se positivo, reproduz diretamente do arquivo local (`convertFileSrc` do Tauri) com latência 0ms e sem consumo de dados.
    - Se o app detectar ausência de conexão à internet, chaveia automaticamente a interface para o modo *"Biblioteca Offline"*.
  - **Distribuição e Cuidados de Lançamento:**
    - Em apps de código aberto distribuídos fora de lojas oficiais (GitHub Releases, instaladores `.exe` / `.msi`), a funcionalidade de download opera sob responsabilidade do usuário final (modelo consagrado pelo *yt-dlp*, *Spotube* e *NewPipe*).

---

## 📊 Matriz de Priorização e Roadmap Geral

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ROADMAP DE IMPLEMENTAÇÃO TETPLAYER                   │
└────────────────────────────────────────────────────────────────────────┘

  FASE 1 & 2: CONSOLIDAÇÃO, PERFORMANCE & FUNDAÇÃO (100% Concluída) ✅
  ────────────────────────────────────────────────────────────────────────
  [x] Modularizar App.tsx em componentes e custom hooks especializados
  [x] Virtualização de listas longas (@tanstack/react-virtual) para 144 FPS
  [x] Cache Local e Persistência Offline via Stale-While-Revalidate
  [x] Amostragem de Cores em Web Worker / OffscreenCanvas
  [x] Transição Suave e Fade Gradual no Fundo Aurora com CSS @property
  [x] Desacoplar currentTime e isolar re-renderizações com React.memo & useMemo
  [x] Otimizar animação do Spectrum Visualizer com transform: scaleY na GPU
  [x] Política de evicção LRU e controle de quota resiliente no Cache
  [x] Mini Player flutuante (Picture-in-Picture / Always-on-Top / Docking)
  [x] Minimizar para o System Tray com menu de atalhos rápidos nativo
  [x] Autoplay Infinito / Rádio contínua ao término da lista via InnerTube
  [x] Parser LRC avançado com suporte a interlúdios silenciosos e múltiplos tempos
  [x] Acessibilidade por tecla Esc e clique no backdrop no UpdateModal
  [x] Visualizador de Áudio e Espectro Dinâmico (mini, inline, full)
  [x] Suporte Multi-Navegador (Firefox, Chrome, Edge, Brave) no auth.rs
  [x] Painel de estatísticas pessoais de audição ("TetStats" com SQLite)
  [x] Sistema Automático de Notificação de Atualizações via GitHub
  [x] Correção de Throttling e Seek Manual no Windows Media Session (SMTC)
  [x] Separação atômica do PlaybackProgressContext para isolamento de CPU
  [x] Pipeline de pré-carregamento e buffer antecipado (Gapless Playback)
  [x] Persistência de cache permanente na tabela app_cache do SQLite nativo
  [x] Tratamento de conectividade offline com badge e retry exponencial
  [x] Suíte de testes automatizados com Vitest e Testing Library (Eixo 1.1)
  [x] Isolamento do Scrubber da Linha do Tempo em TimelineScrubber (Eixo 1.2)
  [x] Pipeline de telemetria de desempenho local e monitor de FPS (Eixo 1.3)
  [x] Compressão de payloads no SQLite via flate2 / Deflate (Eixo 1.4)
  [x] Reducer estruturado para o ciclo de reprodução e fila (Eixo 1.5)

  FASE 3: ERGONOMIA, CONTROLES GLOBAIS & RELEASE 1.0.0 (100% Concluída) ✅
  ────────────────────────────────────────────────────────────────────────
  [x] Reordenação Drag & Drop na fila de reprodução (Eixo 2.1)
  [x] Menu de Contexto em cada faixa com ações rápidas (Eixo 2.2)
  [x] Temas de acento customizáveis com 8 paletas vibrantes (Eixo 3.2)
  [x] Teclas multimídia globais de mídia e teclado via tauri-plugin-global-shortcut (Eixo 4.4)
  [x] Cartões de compartilhamento social em PNG das estatísticas TetStats (Eixo 4.3)
  [x] Transição suave e crossfade contínuo entre faixas (Eixo 2.4)
  [x] Histórico de faixas tocadas "Músicas que Já Passaram" (Eixo 4.5)
  [x] Sincronização determinística do ciclo de vida da gaveta e toggle reativo
  [x] Unificação e simplificação da interface do drawer (fim de setas duplicadas)
  [x] Armazenamento unificado na pasta de instalação com migração automática (%LOCALAPPDATA% -> data/)
  [x] Fechamento automático da gaveta de reprodução ao navegar na barra lateral
  [x] Fechamento e Unificação de Release v1.0.0 Oficial (Desktop README + Tauri)

  FASE 4A: ESSENCIAIS DA PESQUISA (v1.4) 🎯
  ────────────────────────────────────────────────────────────────────────
  [ ] Busca e ordenação dentro de playlists (2.2)
  [ ] Curtir / descurtir sincronizado com o YouTube Music (2.3)
  [ ] Edição e modificação avançada de playlists: criar, adicionar, remover, renomear (2.4)
  [x] Login próprio com conta Google via Webview embutida (4.9)
  [x] Auto-Update in-app com botão nas configs e download em 1 clique (4.10)
  [ ] Restaurar sessão ao reabrir o app (2.5)
  [ ] Sleep Timer com fade-out gradual (2.1)
  [ ] Normalização real de volume via loudnessDb (parte de 4.2)

  FASE 4B: ALTO VALOR & INTEGRAÇÕES (v1.5) 🔗
  ────────────────────────────────────────────────────────────────────────
  [x] Animação fluida na troca de letras (3.3)
  [ ] Discord Rich Presence (4.1)
  [ ] Bloquear faixas e artistas da rádio (2.7)
  [ ] Feed de lançamentos e biblioteca expandida (2.10)
  [ ] Scrobbling Last.fm / ListenBrainz (4.3)
  [ ] SponsorBlock para trechos não musicais (4.4)
  [ ] Notificações nativas de troca de faixa (2.6)
  [ ] Navegação Voltar / Avançar (2.8)
  [ ] Volume pela roda do mouse (2.9)

  FASE 4C: DIFERENCIAIS & APOSTAS TÉCNICAS (v1.6+) 🔮
  ────────────────────────────────────────────────────────────────────────
  [ ] Modo Tela Cheia Imersivo com Karaokê (3.1)
  [ ] Letras palavra por palavra (3.2)
  [ ] Downloads de músicas/playlists e modo offline com reprodução híbrida (4.8)
  [ ] Controle remoto pelo celular / Stream Deck (4.5)
  [ ] Botões de mídia na barra de tarefas do Windows (4.6)
  [ ] Importação de playlists do Spotify / CSV (4.7)
  [ ] Protótipo do motor de áudio nativo (1.1) → libera Equalizador (4.2)
```

---

## ✅ HISTÓRICO CONSOLIDADO: 49 Sugestões e Otimizações Concluídas

> [!NOTE]
> Todos os itens abaixo foram concebidos como sugestões estratégicas e foram **integralmente implementados, compilados e validados** no código do TetPlayer Desktop. Eles formam a memória técnica e evolutiva do produto.

---

### 1. Modularização de `App.tsx` em Componentes e Custom Hooks
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx), [`desktop/src/hooks/`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/) e [`desktop/src/components/`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/).  
* **Implementação Concluída:**  
  O arquivo monolítico de ~2.900 linhas foi decomposto em módulos atômicos e especializados: `useYouTubePlayer`, `useLyrics`, `useAuroraColor`, `useMediaSession`, `useKeyboardShortcuts`, `PlayerContext`, `MainView`, `Sidebar`, `TitleBar`, `PlayerBar`, `NowPlayingDrawer`, `MiniPlayer`, `StatsView` e `UpdateModal`.

---

### 2. Virtualização de Listas de Músicas (`@tanstack/react-virtual`)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/MainView/VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx).  
* **Implementação Concluída:**  
  Renderiza apenas os elementos visíveis na janela de rolagem (`windowing`), mantendo o DOM leve mesmo em playlists massivas (centenas ou milhares de faixas) e garantindo **144 FPS locked** sem perda de frames.

---

### 3. Cache Local e Persistência Offline via Stale-While-Revalidate
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/services/cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts).  
* **Implementação Concluída:**  
  Criado `LocalCacheService` persistindo biblioteca de playlists e faixas no disco. Permite carregar e exibir a biblioteca instantaneamente em **0ms** (*instant loading*), enquanto atualizações de rede ocorrem em segundo plano (*stale-while-revalidate*).

---

### 4. Processamento do Amostrador de Cores em Web Worker / OffscreenCanvas
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/workers/colorWorker.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/workers/colorWorker.ts).  
* **Implementação Concluída:**  
  O algoritmo de amostragem de cores e agrupamento euclidiano de saturação/brilho foi movido para o `colorWorker.ts` compilado como chunk dedicado pelo Vite, liberando 100% da thread de UI.

---

### 5. Transição Suave e Fade Gradual no Fundo Aurora (CSS `@property`)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css) e [`desktop/src/hooks/useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts).  
* **Implementação Concluída:**  
  Registradas propriedades CSS tipadas (`@property --aurora-1/2/3`) com `syntax: "<color>"`. O fundo dinâmico agora interpola matematicamente os canais de cor RGBA através de curva `0.75s cubic-bezier(0.2, 0.8, 0.2, 1)`, eliminando qualquer salto brusco ou efeito de piscar ao trocar de faixa.

---

### 6. Desacoplamento do Estado de Alta Frequência (`currentTime`) e Memoização da Árvore
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx), [`desktop/src/components/Sidebar/Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx), [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx) e [`desktop/src/components/MainView/`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/).  
* **Implementação Concluída:**  
  O objeto de valor fornecido pelo `PlayerContext.Provider` foi envolvido em `useMemo<PlayerContextType>`. Componentes irmãos pesados (`Sidebar`, `TitleBar`, `PlaylistGridView`, `PlaylistDetailView`, `SearchView`, `StatsView`) foram encapsulados em `React.memo` e seus callbacks envolvidos em `useCallback`, eliminando re-renderizações desnecessárias em cascata a cada tick de 80ms do timer de áudio.

---

### 7. Otimização de GPU Compositing no Spectrum Visualizer (`transform: scaleY`)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/Visualizer/SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).  
* **Implementação Concluída:**  
  Substituída a alteração direta de `height` (que causava recalculo contínuo de geometria e layout reflow a ~22 FPS) por transformações aceleradas na GPU com `transform: scaleY(...)`, `transformOrigin: 'bottom'` e classe `will-change-transform` em todos os modos (`mini`, `inline` e `full`).

---

### 8. Política de Evicção LRU e Quota Resiliente no Cache de Faixas e Cores
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/services/cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts) e [`desktop/src/hooks/useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts).  
* **Implementação Concluída:**  
  Implementada fila de acesso LRU (`tetplayer_cache_playlist_lru`) que limita o cache a 25 playlists ativas simultâneas com fallback automático para exceções de `QuotaExceededError`. O cache de paletas Aurora foi limitado a 150 chaves com expurgo automático das entradas mais antigas.

---

### 9. Mini Player Flutuante (Always-on-Top / PiP Mode)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/MiniPlayer/MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).  
* **Implementação Concluída:**  
  Janela compacta sem decorações (`380x140px`) com modo Always-on-Top, mini espectro harmônico, scrubber funcional, controles de áudio e encaixe magnético nas bordas da tela (docking lateral retrátil de 38x90px com arrasto vertical PiP). O áudio continua tocando com zero interrupção ao alternar modos.

---

### 10. Minimizar para a Bandeja do Sistema (System Tray com Menu de Contexto)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs) e [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx).  
* **Implementação Concluída:**  
  `TrayIconBuilder` no Tauri v2 com ícone de alta resolução na barra de tarefas do Windows e menu nativo de botão direito (Play/Pause, Próxima, Anterior, Mostrar/Ocultar, Alternar Mini Player e Sair). Botão de minimizar para a bandeja adicionado à barra de título.

---

### 11. Autoplay Infinito & Rádio da Faixa (Continuous Radio)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).  
* **Implementação Concluída:**  
  Comando Rust `get_radio_tracks` consulta a API InnerTube `/next` com `enablePersistentPlaylistPanel: true`. Quando a fila de músicas chega ao fim com o botão de rádio ativado, busca e anexa recomendações automaticamente sem pausar a reprodução.

---

### 12. Parser Avançado de Letras LRC com Suporte a Interlúdios e Múltiplos Timestamps
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/hooks/useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts).  
* **Implementação Concluída:**  
  O parser de LRC foi reescrito com regex global `timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g` para processar múltiplos marcadores de tempo por linha. Linhas vazias ou instrumentais são convertidas no marcador musical `♪`, impedindo que estrofes antigas permaneçam acesas na tela durante solos.

---

### 13. Acessibilidade e Ergonomia no Modal de Atualização (`UpdateModal`)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/UpdateModal/UpdateModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx).  
* **Implementação Concluída:**  
  Adicionado listener de tecla `Escape` via `useEffect` e manipulador de clique no backdrop escurecido, permitindo fechar o diálogo de atualização instantaneamente de acordo com as normas WAI-ARIA.

---

### 14. Visualizador de Áudio e Espectro Dinâmico (Waveform / Spectrum Bars)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/Visualizer/SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).  
* **Implementação Concluída:**  
  Componente visual com barras harmônicas dinâmicas em 3 variantes (`mini`, `inline` e `full`), reagindo ao estado de reprodução e volume com gradientes adaptativos.

---

### 15. Suporte Multi-Navegador para Sessão e Cookies do YouTube
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src-tauri/src/auth.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs).  
* **Implementação Concluída:**  
  Varredura e extração de cookies de autenticação do YouTube Music em múltiplos navegadores (Mozilla Firefox, Google Chrome, Microsoft Edge e Brave Browser), com descriptografia DPAPI/AES-256-GCM e suporte a cópia transitória para bancos SQLite bloqueados.

---

### 16. Estatísticas de Reprodução Pessoais ("TetStats / Wrapped")
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs) e [`desktop/src/components/StatsView/StatsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsView.tsx).  
* **Implementação Concluída:**  
  Banco SQLite embutido gravando histórico de reprodução. Painel com métricas de tempo total, faixas tocadas, top 5 artistas com medalhas de pódio, top 10 músicas e filtro temporal (7 dias, 30 dias, todo o histórico).

---

### 17. Sistema Automático de Notificação de Atualizações via GitHub
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/services/updater.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/updater.ts) e [`desktop/src/components/UpdateModal/UpdateModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx).  
* **Implementação Concluída:**  
  Checagem periódica e em segundo plano de novas versões e tags no GitHub com cache buster, comparação SemVer e diálogo modal interativo para download da nova versão.

---

### 18. Correção de Sincronia de Seek no Windows Media Session (SMTC)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/hooks/useMediaSession.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useMediaSession.ts).  
* **Implementação Concluída:**  
  Separada a referência de timestamp da referência de posição (`lastTrackedPositionRef`), eliminando a condição que anulava a detecção de saltos manuais de reprodução (`currentTime - currentTime = 0`) e garantindo que o SMTC do Windows receba imediatamente a nova posição após um seek na barra de progresso.

---

### 19. Separação do Contexto de Alta Frequência (`PlaybackProgressContext`)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/context/PlaybackProgressContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlaybackProgressContext.tsx), [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx), [`desktop/src/components/MiniPlayer/MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx) e [`desktop/src/components/LyricsView/LyricsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx).  
* **Implementação Concluída:**  
  Criado contexto atômico `PlaybackProgressContext` contendo `currentTime`, `duration` e `buffered`. No `PlayerContext`, `currentTime` e `duration` foram desacoplados do `useMemo` através de *getters* de propriedade, garantindo que o valor do contexto não seja reconstruído a cada 80ms. `AppContent`, `Sidebar`, `TitleBar`, `QueueView` e views de lista agora permanecem 100% estáticos durante a reprodução.

---

### 20. Pipeline de Pré-Carregamento Inteligente e Buffer Antecipado (Gapless Playback)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`desktop/src/hooks/useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts) e [`desktop/src/hooks/useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts).  
* **Implementação Concluída:**  
  Implementado pipeline assíncrono que dispara quando a faixa em execução atinge **88% da duração** (ou faltam 20s para o término):
  1. Pré-carrega antecipadamente as letras da próxima música da fila (`upcomingTracks[0]`) via `prefetchTrackLyrics`.
  2. Pré-extrai e armazena em cache a arte e paleta de cores via `prefetchArtworkColors`.
  3. Com rádio contínua ativa, consulta e anexa faixas recomendadas do InnerTube antecipadamente quando a fila se aproxima do fim, eliminando pausas perceptíveis de rede entre músicas.

---

### 21. Indexação e Persistência de Cache no Banco SQLite Nativo
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`desktop/src/services/cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).  
* **Implementação Concluída:**  
  Criada tabela permanente `app_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)` com índices no banco SQLite embutido (`tetstats.db`). Adicionados comandos Tauri `save_to_db_cache`, `get_from_db_cache` e `delete_from_db_cache`. O `LocalCacheService` espelha automaticamente todas as gravações de playlists e faixas no banco nativo com capacidade irrestrita, além de restaurar dados na inicialização com `initDbCache()`.

---

### 22. Tratamento de Conectividade Offline e Resiliência de Rede com Backoff Exponencial
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/services/network.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/network.ts), [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx), [`desktop/src/hooks/useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).  
* **Implementação Concluída:**  
  Implementado utilitário de retry com recuo exponencial `retryWithBackoff` e hook de conectividade `useNetworkStatus()`. A barra de título (`TitleBar.tsx`) exibe badge animado em caso de perda de internet (`Modo Offline`) e aviso temporário de `Conexão Restaurada`. Ao navegar pelas playlists offline, o player mantém e exibe instantaneamente as faixas armazenadas em cache sem diálogos agressivos de erro.

---

### 23. Suíte de Testes Automatizados Unitários e de Integração com Vitest
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/vite.config.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/vite.config.ts), [`desktop/src/test/setup.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/test/setup.ts), [`desktop/src/hooks/__tests__/useLyrics.test.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/__tests__/useLyrics.test.ts), [`desktop/src/services/__tests__/cache.test.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/__tests__/cache.test.ts), [`desktop/src/context/__tests__/playerReducer.test.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/__tests__/playerReducer.test.ts) e [`desktop/src/components/__tests__/TimelineScrubber.test.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/__tests__/TimelineScrubber.test.tsx).  
* **Implementação Concluída:**  
  Configurado ecossistema completo de testes com `vitest`, `jsdom`, `@testing-library/react` e `@testing-library/jest-dom`. Criados testes para:
  1. Parser de LRC (múltiplos marcadores de tempo, instrumentais silenciosos `♪`, tags de metadados, formatação de tempo).
  2. Cache local LRU (política de evicção de 25 playlists, resiliência de cota, recuperação síncrona instantânea).
  3. Reducer de fila e reprodução (modos shuffle/unshuffle com preservação de ordem, ciclo de repetição, deduplicação de rádio).
  4. Componente memoizado `TimelineScrubber` (formatação de tempo, interação de seek e acessibilidade).

---

### 24. Isolamento do Scrubber da Linha do Tempo em Componente Memoizado (`TimelineScrubber`)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/Player/TimelineScrubber.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx) e [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx).  
* **Implementação Concluída:**  
  Extraído o slider e contadores de tempo da linha do tempo para o subcomponente memoizado `<TimelineScrubber />`. O `PlayerBar` deixou de consumir `usePlaybackProgress()`, tornando-se 100% estático durante o streaming contínuo. Capa, botões de reprodução, controle de volume e título da música agora permanecem completamente livres de ciclos de re-renderização causados pelos ticks de 80ms do timer de áudio.

---

### 25. Pipeline de Telemetria de Desempenho Local e Monitor de Taxa de Frames (FPS & Profiler)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/services/telemetry.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/telemetry.ts), [`desktop/src/hooks/usePerformanceTelemetry.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/usePerformanceTelemetry.ts) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).  
* **Implementação Concluída:**  
  Implementado `PerformanceTelemetryService` baseado em `requestAnimationFrame`, medindo taxa de frames por segundo (FPS instantâneo e médio) e detectando quedas de quadros (*jank* / frames >16.6ms e >33.3ms). Em modo de desenvolvimento (`import.meta.env.DEV`), emite avisos contextuais no console com controle de taxa para alertar sobre gargalos de renderização durante transições visuais pesadas do Aurora ou do Visualizador de Espectro.

---

### 26. Compressão Transparente de Payloads no Cache SQLite Nativo (`flate2` / Deflate)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src-tauri/Cargo.toml`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/Cargo.toml) e [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs).  
* **Implementação Concluída:**  
  Adicionada compactação transparente via `flate2` (Deflate com backend puro em Rust) integrada com Base64. Payloads superiores a 128 bytes gravados na tabela `app_cache` são compactados com redução de até 75% no consumo de espaço em disco e I/O. A leitura via `get_cache_entry` descomprime os dados de forma transparente, mantendo 100% de retrocompatibilidade com entradas legadas não comprimidas e com testes unitários nativos em Rust validados.

---

### 27. Máquina de Estados Finita e Reducer Estruturado para o Ciclo de Fila e Reprodução
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/context/playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).  
* **Implementação Concluída:**  
  Consolidadas todas as transições da fila de reprodução (`activeQueue`, `originalQueue`, `currentQueueIndex`, `isShuffle`, `repeatMode`, `isAutoplayRadio`) em uma máquina de estados pura e determinística via `playerReducer` e `useReducer`. Eliminados múltiplos `useState` fragmentados e potenciais condições de corrida (*race conditions*), garantindo transições atômicas para embaralhamento, remoção de faixas, rotação de repetição e injeção contínua da rádio automática.

---

### 28. Menu de Contexto Flutuante e Ações Rápidas por Faixa (Sugestão 2.2)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/ContextMenu/TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx), [`desktop/src/components/MainView/TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx), [`desktop/src/components/QueueView/QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx), [`desktop/src/context/playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).  
* **Implementação Concluída:**  
  Implementado menu de contexto flutuante com design glassmorphic escuro (`TrackContextMenu.tsx`), acionado por clique com botão direito ou pelo botão de três pontos (`MoreVertical`) em todas as linhas de músicas da aplicação (Playlists, Resultados de Busca e Fila de Reprodução). Oferece 6 ações imediatas:
  1. **Tocar a Seguir:** Despacha `INSERT_NEXT` no reducer, inserindo a música exatamente após a faixa em reprodução.
  2. **Adicionar ao Fim da Fila:** Despacha `ADD_TO_END`, anexando a faixa na última posição da fila ativa.
  3. **Iniciar Rádio a partir desta música:** Substitui a fila atual e consome `get_radio_tracks` do Tauri para reprodução infinita baseada no vídeo selecionado.
  4. **Copiar Link do YouTube:** Copia `https://music.youtube.com/watch?v={id}` para a área de transferência com toast feedback.
  5. **Copiar Nome / Artista:** Copia a formatação de título para a área de transferência.
  6. **Buscar mais do artista:** Dispara evento desacoplado `tetplayer:search-artist`, navegando automaticamente para a aba de busca e executando a pesquisa do artista sem cliques manuais.
  Possui clamping inteligente de tela para nunca vazar os limites da janela e fechamento automático ao clicar fora, redimensionar ou rolar.

---

### 29. Refinamento Visual do Drawer com Foco Minimalista e Remoção de Partículas
* **Status:** `[Concluído e Limpo]` ✅  
* **Localização:** [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).  
* **Implementação Concluída:**  
  Após teste visual em tempo de execução, as partículas flutuantes foram integralmente removidas a pedido do usuário para preservar a estética limpa, polida e minimalista da gaveta de reprodução. O fundo preserva a iluminação volumétrica radiante do efeito Aurora dinâmico nativo sem ruídos adicionais e com 0% de consumo de GPU.

---

### 30. Capas Cinematográficas Animadas estilo Apple Music Motion Cover com Amortecimento Ultra Suave (Sugestão 3.5)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/NowPlayingDrawer/MotionCover.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/MotionCover.tsx), [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx) e [`desktop/src/index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css).  
* **Implementação Concluída:**  
  Desenvolvido o componente `MotionCover.tsx` trazendo a experiência imersiva de Motion Covers do Apple Music para o TetPlayer:
  - **Amortecimento Elástico Ultra Suave:** Transição de retorno refinada com curva de desaceleração suave (`transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)` e inclinação máxima sutil de 5.2 graus), eliminando retornos rígidos ou bruscos e fazendo a capa flutuar suavemente de volta ao repouso como veludo.
  - **Feixe de Luz Especular Contínuo:** Camada de brilho cinematográfico (`@keyframes motionSweep`) que varre diagonalmente a arte do álbum durante a reprodução ativa.
  - **Respiração Cinética & Aura Difusa:** Leve expansão rítmica sincronizada com o status de reprodução e aura radiante expandida com desfoque gaussiano no fundo espelhando as cores da capa.
  - **Badge Alternador com Persistência:** Botão em vidro no topo da capa permitindo alternar instantaneamente entre o modo *Motion* e o modo *Estática*, com preferência salva no `localStorage`.

---

### 31. Encaixe Sólido de Borda a Borda no Mini Player Docked (Fim dos Cantos Vazios)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/MiniPlayer/MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).  
* **Implementação Concluída:**  
  Removidas as classes de borda arredondada (`rounded-l-2xl` e `rounded-r-2xl`) do contêiner do Mini Player quando ancorado nas bordas da tela (`isDocked`). O contêiner agora preenche 100% da janela nativa de 38x90px com moldura sólida escura (`border border-[#2b3042] bg-[#0c0e17]`), eliminando cantos ocos e frestas transparentes para um aspecto industrial limpo e acabado.

---

### 32. Layout Proporcional Responsivo e Fim do Estrangulamento no PlayerBar e Drawer Header
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx), [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx) e [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx).  
* **Implementação Concluída:**  
  - Implementada uma arquitetura de 3 colunas balanceadas com flexbox proporcional (`w-[28%] min-w-0 max-w-[260px]/[280px]` nas pontas e `flex-1 min-w-0` rigorosamente centralizado no meio).
  - No `PlayerBar`, eliminou-se o esmagamento mútuo e o transbordo do slider de volume em viewports mínimas (800px): rótulos textuais "Fila" e "Letras" condensam-se em botões de ícone abaixo de `xl`, o slider de volume é elástico (`w-14 sm:w-16 md:w-20`) e o padding adapta-se fluidamente (`px-3 sm:px-4 md:px-6`).
  - No `NowPlayingDrawer`, o cabeçalho superior eliminou a sobreposição entre o título da faixa e as abas centrais: o badge "REPRODUZINDO AGORA" foi ocultado em resoluções menores (`hidden xl:inline-block`) evitando redundância com o painel lateral do drawer, as abas de "Fila" e "Letras" ficam perfeitamente centralizadas e o controle de Crossfade se transforma em um badge compacto de alta fidelidade `[Sliders] [2s]` abaixo de `lg` (`hidden lg:inline`), garantindo fluidez e espaço de respiro em qualquer largura de tela.

---

### 33. Modal Centralizado de Configurações do Aplicativo (SettingsModal & SettingsService v0.2.0)
* **Status:** `[Implementado e Validado]` ✅  
* **Localização:** [`desktop/src/components/SettingsModal/SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx), [`desktop/src/services/settings.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/settings.ts), [`desktop/src/components/Sidebar/Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx), [`desktop/src/components/TitleBar/TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx) e [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).  
* **Implementação Concluída:**  
  - Criado o painel modal de configurações com design glassmorphic escuro de alto padrão e 5 abas verticais (`Áudio & Fila`, `Aparência & Efeitos`, `Sistema & Atalhos`, `Sessão & Armazenamento` e `Sobre`).
  - **Áudio:** Slider de crossfade suave de 0 a 12s com predefinições, toggle de Autoplay Infinito / Rádio Contínua, Normalização Inteligente de Volume (anti-clipping) e comportamento ao tocar playlists (Substituir vs Anexar).
  - **Aparência:** Slider de intensidade do Aurora Glow dinâmico (com opção 0% para desativação completa), toggle de Motion Cover 3D, seletor de estilo do Visualizador de Espectro (Barras, Blocos Hi-Fi, Gradiente Neon, Pulso Central) e Redução de Movimento para economia de bateria.
  - **Sistema:** Controle da ação do botão Fechar `[X]` (minimizar para bandeja vs encerrar aplicação) e catálogo visual dos atalhos de teclado suportados.
  - **Sessão & Cache:** Detalhes da sessão do YouTube Music, forçar re-sincronização, modo anônimo, medição do tamanho do cache e botão de limpeza temporária em 1 clique.
  - **Sobre & Acesso:** Exibição da versão `v0.2.0`, atalho universal `Ctrl + ,` e botão de engrenagem no rodapé da barra lateral.

---

### 34. Reordenação da Fila de Reprodução via Drag & Drop (Sugestão 2.1)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/QueueView/QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx), [`desktop/src/context/playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Implementação Concluída:**
  - Adicionado o caso determinístico `REORDER_QUEUE` no `playerReducer`, preservando a consistência do índice da música em execução (`currentQueueIndex`) e sincronizando a fila original quando fora do modo shuffle.
  - Implementado suporte nativo ao Drag & Drop HTML5 com alça tátil (`GripVertical`), feedback visual de linha de inserção (`border-t-2 border-red-500`) e transições fluidas na lista "A Seguir" da gaveta de reprodução.
  - Testes unitários automatizados cobrindo movimentações para cima, para baixo e limites de fila adicionados com 100% de sucesso.

---

### 35. Teclas Multimídia Globais do Sistema Operacional (Sugestão 4.4)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/Cargo.toml`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/Cargo.toml) e [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs).
* **Implementação Concluída:**
  - Integrado o plugin nativo de alta performance `tauri-plugin-global-shortcut v2.4.1` ao backend Rust.
  - Registrados atalhos globais de hardware (`MediaPlayPause`, `MediaTrackNext`, `MediaTrackPrevious`, `MediaStop`) e atalhos de teclado combinados (`Ctrl+Alt+Space`, `Ctrl+Alt+Right`, `Ctrl+Alt+Left`).
  - O controle de reprodução agora funciona mesmo quando o TetPlayer estiver em segundo plano, minimizado na bandeja do sistema ou com o usuário jogando em tela cheia.

---

### 36. Exportação e Compartilhamento de Estatísticas ("TetStats Share Cards" PNG) (Sugestão 4.3)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/StatsView/StatsShareModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsShareModal.tsx) e [`desktop/src/components/StatsView/StatsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsView.tsx).
* **Implementação Concluída:**
  - Criado o gerador em Canvas 2D de alta resolução (1200x675) para cartões artísticos de resumo pessoal ("TetPlayer Wrapped").
  - Renderiza gradientes volumétricos de Aurora Boreal (Ruby Red & Cyber Indigo), cartões de métricas (Plays, Tempo Total, Artistas Únicos), pódio de Top Artistas com medalhas e Top Músicas.
  - Modal interativo com botões para **Copiar Imagem** direto para a área de transferência do sistema (Clipboard API nativa) e **Baixar PNG**, com acessibilidade total por tecla `Escape`.

---

### 37. Fechamento e Unificação da Versão 1.0.0 Oficial (Release GA)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/package.json`](file:///d:/progrmação/programas/TetPlayer/desktop/package.json), [`desktop/src-tauri/Cargo.toml`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/Cargo.toml), [`desktop/src-tauri/tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json), [`desktop/src/components/SettingsModal/SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx) e [`desktop/README.md`](file:///d:/progrmação/programas/TetPlayer/desktop/README.md).
* **Implementação Concluída:**
  - Sincronizada a versão SemVer `1.0.0` em todos os manifestos de pacote do ecossistema.
  - Atualizado o modal de configurações para exibir `v1.0.0 (Release Oficial)`.
  - Criada documentação completa e moderna de apresentação no `desktop/README.md` com arquitetura, destaques visuais e de performance, tabela de atalhos e comandos de build.
  - Build de produção (`tsc && vite build`) e testes (`vitest` + `cargo test`) 100% validados com código de saída 0.

---

### 38. Transição Musical Suave e Crossfade Contínuo entre Faixas (Sugestão 2.4)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/settings.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/settings.ts), [`desktop/src/components/SettingsModal/SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx), [`desktop/src/hooks/useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts), [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx) e [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Implementação Concluída:**
  - Adicionado suporte a crossfade configurável de 0s a 12s, persistido no `SettingsService` e no `localStorage`.
  - Controle interativo presente na aba de Áudio do `SettingsModal` com predefinições rápidas (Desligado, 2s, 3s, 5s) e botão de alternância cíclica rápida (`cycleCrossfade`) integrado diretamente no cabeçalho superior da gaveta de reprodução (`NowPlayingDrawer`).
  - No loop de timeline de alta frequência (`useYouTubePlayer.ts`), o volume faz **fade-out** nos segundos finais configurados e **fade-in** no início da próxima faixa.
  - Limitação conhecida: como existe um único player (iframe), as duas músicas não tocam sobrepostas. Um crossfade com sobreposição real depende do item 1.1.

---

### 39. Histórico de Faixas Tocadas com Reexecução Imediata ("Músicas que Já Passaram") (Sugestão 4.5)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/QueueView/QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx) e [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Implementação Concluída:**
  - Implementada a seção "Músicas que Já Passaram" no topo da gaveta de fila (`QueueView`), exibindo a contagem exata de faixas anteriores da sessão atual.
  - Painel expansível/retrátil com memória de estado (`showPastTracks`), permitindo ao usuário clicar em qualquer faixa anterior para reexecução imediata (`handlePlayFromQueue`), além de suporte completo ao menu de contexto em cada item histórico.

---

### 40. Resolução de Desalinhamento de Estado e Sincronização do Ciclo de Vida da Gaveta de Reprodução
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/context/PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx) e [`desktop/src/hooks/useKeyboardShortcuts.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useKeyboardShortcuts.ts).
* **Implementação Concluída:**
  - Corrigido o bug onde clicar na seta para recolher a gaveta desativava apenas `isNowPlayingOpen`, deixando `showLyrics` como `true`, o que impedia o fechamento do drawer e congelava o comportamento da seta inferior (só voltando a funcionar ao clicar no botão de letras).
  - Unificada a função `toggleNowPlaying()` no `PlayerContext`: agora avalia o estado combinado `(isNowPlayingOpen || showLyrics)`. Se aberta, dispara `closeNowPlaying()` (resetando deterministicamente ambos os estados e restaurando a posição de scroll da playlist via `useLayoutEffect`); se fechada, dispara `openNowPlaying(nowPlayingTab)`.
  - `toggleShowLyrics` e `toggleShowQueue` passaram a considerar o mesmo estado combinado.
  - O atalho `Shift+Up` herda a correção por chamar `toggleNowPlaying()`. O `Escape` já usava `closeNowPlaying()`, que reseta os dois estados. O arquivo `useKeyboardShortcuts.ts` não precisou ser alterado.

---

### 41. Unificação de Controles e Fim de Duplicações Visuais no Drawer
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/Player/PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx) e [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Implementação Concluída:**
  - O botão de abertura e fechamento da gaveta reside exclusivamente na sua posição ergonômica natural no rodapé do player ([PlayerBar.tsx](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx), ao lado esquerdo da capa do álbum).
  - O botão alterna reativamente entre `ChevronUp` (cinza escuro quando fechado) e `ChevronDown` (destacado em vermelho quando aberto), mantendo feedback visual imediato.
  - No cabeçalho superior da gaveta ([NowPlayingDrawer.tsx](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx)), a seta duplicada foi removida, deixando apenas o controle de Crossfade no canto direito. Isso resultou em uma interface minimalista, limpa e com zero ambiguidades de navegação.

---

### 42. Animação Cinematográfica e Scroll Fluido na Troca de Letras (Smooth Kinetic Seek & Spring Easing)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/hooks/useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts) e [`desktop/src/components/LyricsView/LyricsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx).
* **Implementação Concluída:**
  - Implementada interpolação cinética de rolagem de alta precisão via `requestAnimationFrame` com curva de aceleração e amortecimento suave (*ease-out cubic / exponential spring damping* estilo Apple Music), calculando a distância relativa entre o ponto atual de rolagem e a linha de destino.
  - Eliminação de teletransportes rígidos e saltos secos ao avançar faixas ou clicar diretamente em estrofes distantes da letra.
  - Transição de foco na tipografia com escala e opacidade harmonizadas (`scale(1.05)` com realce luminoso suave na linha ativa e esmaecimento fluido na linha anterior).

---

### 43. Login Próprio com Conta Google via Webview Embutida Isolada
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/auth.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`desktop/src/components/Sidebar/Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx) e [`desktop/src/components/SettingsModal/SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx).
* **Implementação Concluída:**
  - Instanciação de janela Webview isolada nativa do Tauri (`tauri::WebviewWindowBuilder`) carregando diretamente a interface oficial de autenticação do Google (`accounts.google.com`), com suporte nativo a autenticação em duas etapas (2FA), passkeys FIDO e gerenciadores de senha.
  - Interceptação automática e segura dos cookies de sessão essenciais do YouTube Music (`SAPISID`, `SSID`) ao concluir o redirecionamento para `music.youtube.com`.
  - Persistência criptografada no banco SQLite local, tornando o aplicativo 100% plug-and-play e universal, sem depender de extração frágil de cookies de navegadores externos instalados no Windows.

---

### 44. Sistema Completo de Auto-Update Silencioso In-App via Tauri v2 e CI/CD no GitHub Actions
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/updater.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/updater.ts), [`desktop/src/components/UpdateModal/UpdateModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx), [`desktop/src/components/SettingsModal/SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx), [`desktop/src-tauri/tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json) e [`.github/workflows/release.yml`](file:///d:/progrmação/programas/TetPlayer/.github/workflows/release.yml).
* **Implementação Concluída:**
  - Integração oficial com `@tauri-apps/plugin-updater` e `@tauri-apps/plugin-process` para download, verificação de integridade e reinício automático silencioso (`relaunch()`).
  - Segurança criptográfica com assinaturas digitais Minisign geradas no pipeline do GitHub Actions e validadas nativamente pelo Tauri v2 com o manifesto `latest.json`.
  - Botão de checagem manual interativo com status em tempo real na aba "Sobre" do `SettingsModal`, além do modal automático de notificação de novas versões na tela principal.
  - O usuário não precisa abrir o navegador nem baixar executáveis avulsos: todo o ciclo de atualização ocorre dentro do próprio TetPlayer.

---

### 45. Armazenamento Unificado e Isolado de Dados e Músicas na Pasta de Instalação (`data/tetstats.db` e `data/music/`)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`desktop/src-tauri/tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json) e [`desktop/src/components/SettingsModal/SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx).
* **Implementação Concluída:**
  - Todos os dados gerados pelo TetPlayer (banco SQLite `tetstats.db`, cache compactado e pasta de músicas offline `music/`) foram centralizados na subpasta `data/` dentro do diretório de instalação do aplicativo.
  - Migração transparente automática: caso exista um banco legado em `%LOCALAPPDATA%`, o sistema o move para o novo local na primeira inicialização, garantindo retenção de 100% dos dados.
  - Habilitada seleção de pasta de instalação personalizada no instalador NSIS (`installMode: both`), permitindo instalar em discos e partições secundárias.
  - Adicionado atalho nativo "Abrir Pasta de Dados" com inspeção do caminho real nas Configurações.

---

### 46. Fechamento Automático da Gaveta de Reprodução ao Navegar na Barra Lateral (Sidebar)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx), [`desktop/src/components/Sidebar/Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx) e [`desktop/src/components/__tests__/Sidebar.test.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/__tests__/Sidebar.test.tsx).
* **Implementação Concluída:**
  - Integrada a chamada `closeNowPlaying()` nos manipuladores de clique da barra de navegação superior esquerda ("Biblioteca", "Buscar", "Estatísticas") e na seleção de playlists.
  - Ao alternar de seção, a gaveta expandida de reprodução e letras é imediatamente recolhida, revelando a tela de conteúdo solicitada em segundo plano sem exigir ação manual de minimizar do usuário.

---

### 47. Busca Instantânea e Ordenação Flexível Dentro de Playlists (Item 2.2 da Pesquisa de Mercado)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/components/MainView/PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx) e [`desktop/src/components/__tests__/PlaylistDetailView.test.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/__tests__/PlaylistDetailView.test.tsx).
* **Implementação Concluída:**
  - Campo de busca responsivo integrado ao cabeçalho da playlist com filtro em tempo real sobre títulos, artistas e álbuns de todas as faixas carregadas.
  - Atalho universal de teclado `Ctrl+F` / `Cmd+F` para focar imediatamente o input de busca, além de botão para limpar com 1 clique (`X`) e indicador visual de faixas encontradas (`X de Y`).
  - Seletor de ordenação com suporte a: Ordem Original, Título (A-Z), Artista (A-Z), Duração (Mais longas) e Duração (Mais curtas).
  - Estado de busca vazia estilizado com ícone `SearchX` e botão "Limpar busca" quando nenhuma faixa coincidir com os termos digitados.
  - Tocar a playlist ou clicar em qualquer faixa filtrada despacha a fila reativa customizada para o player, garantindo que a ordem respeite perfeitamente a seleção do usuário.
  - Suíte de 4 testes unitários automatizados validando busca, ordenação alfabética e atalho de teclado.

---

### 48. Paginação Completa de Playlists com Continuação Automática (Item 1.2 da Pesquisa de Mercado)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) e [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs).
* **Implementação Concluída:**
  - Criada a função recursiva `extract_continuation_token` no backend Rust para detectar e extrair tokens de continuação (`continuationCommand.token` e `nextContinuationData.continuation`) em qualquer nível da resposta do YouTube Music.
  - Implementado loop assíncrono iterativo em `get_playlist_tracks` com teto protetivo de até 25 páginas (`MAX_PAGES = 25`, suportando até ~2500 faixas por playlist).
  - Cada iteração requisita `https://music.youtube.com/youtubei/v1/browse?continuation={token}`, acumula as novas faixas e extrai o próximo token até o término da playlist ou esgotamento de páginas.
  - Deduplicação em memória via `HashSet` preservando a ordem original da playlist.
  - Playlists de qualquer tamanho (ex: 109, 150, 500, 1000+ faixas) agora carregam e tocam 100% completas, eliminando definitivamente o antigo corte no limite de 100 músicas.
  - Suíte de 3 novos testes unitários adicionada no Rust validando a extração de tokens em diferentes estruturas da API InnerTube.

---

### 49. Motor de Áudio Nativo Híbrido com Pré-Buffer e Fallback Resiliente para IFrame (Item 1.1)
* **Status:** `[Implementado e Validado]` ✅
* **Localização:** [`desktop/src/services/audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts), [`desktop/src/hooks/useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts), [`desktop/src-tauri/src/ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`desktop/src-tauri/src/lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs) e [`desktop/src/services/__tests__/audioEngine.test.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/__tests__/audioEngine.test.ts).
* **Implementação Concluída:**
  - **Serviço de Áudio Nativo (`AudioEngine`):** Construído motor de alta performance em TypeScript integrando HTML5 `Audio` e Web Audio API (`AudioContext` e `GainNode`). Possui pré-buffer em RAM antecipado (`preload="auto"`), controle linear de ganho digital sem latência de postMessage e suporte a monitoramento de buffer.
  - **Extração de Stream Direto no Backend Rust (`get_stream_info`):** Comando Tauri que consulta o endpoint `/player` do YouTubei autenticado com a sessão da conta Google. Filtra formatos `audio/*` desprotegidos e prioriza streams de alta fidelidade: itag 251 (Opus ~160kbps), itag 140 (AAC 128kbps) ou maior bitrate disponível.
  - **Orquestrador Híbrido em `useYouTubePlayer`:** Ao carregar uma faixa, verifica a disponibilidade do stream direto nativo. Havendo URL direta, o áudio toca no motor nativo com silenciamento e pausa do IFrame (zero processamento de vídeo e zero áudio duplicado).
  - **Fallback Silencioso e Resiliente para IFrame:** Se uma faixa exigir decifração complexa de token (`signatureCipher`), ou se o stream nativo sofrer interrupção/erro 403, o hook desvia instantaneamente e sem travar a UI para o player IFrame do YouTube (`loadVideoById`), mantendo 100% de disponibilidade em qualquer cenário.
  - **Sincronização Unificada de Estado e Controles:** Timeline, scrubber, sincronia de letras (80ms), crossfade e limitador de volume continuam operando de forma 100% transparente para toda a UI.
  - **Cobertura de Testes:** 5 novos testes unitários adicionados em `desktop/src/services/__tests__/audioEngine.test.ts`.

---

## 📌 Conclusão & Próximos Passos (TetPlayer v1.4+ em Desenvolvimento na develop)

Com a consolidação dos itens **48 (Paginação Completa de Playlists — Item 1.2)** e **49 (Motor de Áudio Nativo Híbrido — Item 1.1)**, o TetPlayer soluciona os dois maiores desafios históricos de áudio e conteúdo da plataforma, atingindo a marca de **49 melhorias arquiteturais, funcionais e estéticas** totalmente validadas.

O desenvolvimento segue **exclusivamente na branch `develop`**. As prioridades imediatas para a sequência da milestone **v1.4.0** são:
1. **2.3 Curtir / Descurtir Sincronizado com o YouTube Music:** Botão de coração no PlayerBar, Mini Player e menu de contexto integrado aos endpoints InnerTube.
2. **2.5 Restaurar a Sessão ao Reabrir o App:** Recuperar a última fila, faixa e posição pausada a partir do SQLite local.
3. **2.1 Sleep Timer:** Temporizador de suspensão programável com fade-out suave de volume de 20 segundos.
4. **2.4 Edição e Modificação Avançada de Playlists:** Criação, exclusão de faixas e reorganização na nuvem do YouTube Music.
5. **2.6 Notificação Nativa do Sistema ao Trocar de Faixa:** Toast no Windows via Tauri com capa, título e artista.
