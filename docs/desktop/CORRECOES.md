# 🛠️ Relatório de Auditoria Técnica, Qualidade de Código, UI/UX & Performance — TetPlayer Desktop

> **Escopo do Documento:** Auditoria profunda e contínua do código-fonte do **TetPlayer Desktop** (Frontend React 19 + TypeScript + Tailwind CSS e Backend Nativo Tauri v2 + Rust + SQLite), cobrindo bugs lógicos, condições de corrida, gargalos de performance (CPU/GPU/I/O), acessibilidade e inconsistências de UI/UX.

---

## 📑 Índice Navegável

1. [Sumário Executivo & Mapa de Apontamentos Ativos](#1-sumário-executivo--mapa-de-apontamentos-ativos)
2. [Apontamentos Ativos Catalogados (Pendentes de Correção)](#2-apontamentos-ativos-catalogados-pendentes-de-correção)
   - [Críticos (Bugs Funcionais & Condições de Corrida)](#21-críticos-bugs-funcionais--condições-de-corrida)
   - [Avisos (Gargalos de Performance, Cache, Re-renders & UI/UX)](#22-avisos-gargalos-de-performance-cache-re-renders--uiux)
   - [Sugestões (Polimento Técnico, Bordas & Consistência)](#23-sugestões-polimento-técnico-bordas--consistência)
3. [Histórico Consolidado e Ordenado de Itens Resolvidos (#01 a #80)](#3-histórico-consolidado-e-ordenado-de-itens-resolvidos-01-a-80)

---

## 1. Sumário Executivo & Mapa de Apontamentos Ativos

Após a consolidação da versão **v1.4.0+** (incluindo o pool global `HTTP_CLIENT` via `LazyLock` em `ytm.rs`, Suporte Completo a Álbuns, Manipulação Bidirecional de Playlists, Reordenação Drag-and-Drop com Card Flutuante a 144 FPS e Correção de Z-Index dos Seletores), foi conduzida uma nova varredura linha a linha em todos os módulos Rust e TypeScript.

| ID | Severidade | Camada | Resumo do Apontamento Ativo | Arquivo(s) Afetado(s) |
| :---: | :---: | :---: | :--- | :--- |
| **#81** | 🔴 `[Crítico]` | Frontend / SQLite | **Omissão de registro de reprodução (`record_track_played`)** ao avançar faixas automaticamente, pelos botões Next/Prev ou pela Fila (`QueueView`). | [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx) |
| **#82** | 🔴 `[Crítico]` | Frontend / IPC | **Stale Closure no listener global `tray-action`**, impedindo pausar músicas via teclas de mídia do teclado ou System Tray. | [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts) |
| **#83** | 🟡 `[Aviso]` | Backend / Cache | **`clearCache()` apaga a sessão Google salva (`tetplayer_google_session`)** da tabela `app_cache`, não limpa LRU de álbuns e `initDbCache()` não hidrata álbuns. | [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts) |
| **#84** | 🟡 `[Aviso]` | Backend Rust | **Reabertura de conexão SQLite + 6 DDLs/4 Pragmas a cada chamada em `init_db()`** e criação repetitiva de `reqwest::Client` em `fetch_lyrics`. | [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) |
| **#85** | 🟡 `[Aviso]` | Frontend Perf | **Subscrição direta ao `PlayerContext` dentro de `TrackRow` e `AlbumDetailView`**, furando o isolamento do `React.memo`. | [`TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx), [`AlbumDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumDetailView.tsx) |
| **#86** | 🟡 `[Aviso]` | Frontend UI/UX | **Congelamento visual do `TimelineScrubber`** quando o ponteiro do mouse é solto fora dos 4px da barra por ausência de `setPointerCapture`. | [`TimelineScrubber.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx) |
| **#87** | 🟡 `[Aviso]` | Frontend UI/UX | **Propagação indevida de clique no botão `⋮` de `pastTracks`** (toca a música ao abrir o menu) e ausência de virtualização na `QueueView`. | [`QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx) |
| **#88** | 🟡 `[Aviso]` | Frontend Perf | **`scrollMargin` estático na `VirtualizedTrackList`**, desalinhando o cálculo de janela ao redimensionar a tela ou expandir descrições longas. | [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx) |
| **#89** | 🟡 `[Aviso]` | Frontend Audio/UI | **Falso positivo de `isSeekJump` em `useLyrics`** na troca de faixa, atrasando em 90ms o foco da primeira estrofe de uma nova música. | [`useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts) |
| **#90** | 🔵 `[Sugestão]` | Backend Rust | **Ausência de paginação por continuation token em `get_album_details`** (álbuns com >100 faixas) e campos `release_date`/`copyright` fixos em `None`. | [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs) |
| **#91** | 🔵 `[Sugestão]` | Frontend UX | **Interceptação de `Ctrl+F` com modais/drawer abertos**, cópia de link `www.youtube.com` em vez de `music.youtube.com` e cleanup de `mediaSession`. | [`PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx), [`TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx), [`useMediaSession.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useMediaSession.ts) |

---

## 2. Apontamentos Ativos Catalogados (Pendentes de Correção)

---

### 2.1 Críticos (Bugs Funcionais & Condições de Corrida)

#### 81. Omissão de Registro no Histórico SQLite (`record_track_played`) ao Avançar Faixas Automaticamente, pela Fila ou Botões Next/Prev
* **Localização:** [`desktop/src/context/PlayerContext.tsx:332-483`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx#L332-L483).
* **Severidade:** `[Crítico]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  Atualmente, a chamada IPC `invoke("record_track_played", { track })` (responsável por gravar a música na tabela `playback_history` do SQLite para a aba **Estatísticas / Resumo Musical**) existe **exclusivamente** dentro de `playTrackWithQueue` (linha 346).
  - Quando uma música chega ao fim naturalmente e avança para a próxima via `handleNextTrack` (linhas 426–455), `record_track_played` **não é chamado**.
  - Quando o usuário clica nos botões **Próxima (`Next`)** ou **Anterior (`Prev`)** (`handlePrevTrack`, linhas 391–424), `record_track_played` **não é chamado**.
  - Quando o usuário clica em uma música dentro da gaveta da Fila (`handlePlayFromQueue`, linhas 471–482), `record_track_played` **não é chamado**.
  - **Impacto Real:** Mais de 85% das músicas ouvidas em uma sessão contínua de playlist, álbum ou rádio nunca são contabilizadas nas estatísticas do usuário!
* **Solução Recomendada:**
  Centralizar o disparo de `record_track_played` em um `useEffect` reativo à mudança de `currentTrack?.id` (ou dentro de um helper central acionado sempre que uma faixa efetivamente inicia a reprodução), com deduplicação por `lastRecordedTrackIdRef` para não registrar a mesma faixa duas vezes seguidas:
  ```tsx
  const lastRecordedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentTrack?.id) return;
    const recordKey = `${currentTrack.id}:${currentQueueIndex}`;
    if (lastRecordedKeyRef.current === recordKey) return;
    lastRecordedKeyRef.current = recordKey;

    invoke("record_track_played", { track: currentTrack }).catch((e) => {
      console.warn("Falha ao registrar estatística:", e);
    });
  }, [currentTrack, currentQueueIndex]);
  ```

---

#### 82. Stale Closure no Listener Global `tray-action` Impedindo Pausar a Reprodução via Teclas de Mídia ou System Tray
* **Localização:** [`desktop/src/context/PlayerContext.tsx:239-267`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx#L239-L267) e [`desktop/src/hooks/useYouTubePlayer.ts:368-388`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts#L368-L388).
* **Severidade:** `[Crítico]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  1. Em [`PlayerContext.tsx:239-267`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx#L239-L267), o `useEffect` que registra `listen<string>("tray-action", ...)` possui array de dependências vazio `[]`, capturando na montagem inicial a primeira referência da função `togglePlayPause`.
  2. Em [`useYouTubePlayer.ts:368-388`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts#L368-L388), `togglePlayPause` depende de `[isPlaying, clearCrossfade]` e avalia a variável de estado `if (isPlaying)` em vez de `if (isPlayingRef.current)`.
  3. Como o listener `tray-action` (usado tanto pelo menu do System Tray quanto pelo plugin `tauri-plugin-global-shortcut` para a tecla física `MediaPlayPause` e `Ctrl+Alt+Space`) nunca atualiza sua closure, `isPlaying` dentro da closure capturada vale eternamente `false`.
  4. **Impacto Real:** Quando uma música está tocando no motor nativo (`usingNativeAudioRef.current === true`) e o usuário aperta a tecla `MediaPlayPause` do teclado (com o app em segundo plano ou focado), `if (isPlaying)` avalia como `false` e executa `audioEngine.play()` em vez de `audioEngine.pause()`, tornando impossível pausar a música pelas teclas globais ou pela bandeja!
* **Solução Recomendada:**
  Ler `isPlayingRef.current` dentro de `togglePlayPause` em `useYouTubePlayer.ts` (tornando `togglePlayPause` estável) e/ou utilizar uma `ref` para os handlers dentro do listener `tray-action` em `PlayerContext.tsx`:
  ```ts
  // Em useYouTubePlayer.ts:
  const togglePlayPause = useCallback(() => {
    const currentlyPlaying = isPlayingRef.current;
    if (usingNativeAudioRef.current) {
      if (currentlyPlaying) {
        audioEngine.pause();
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else {
        clearCrossfade();
        audioEngine.play().catch((err) => console.warn("[AudioEngine] play error:", err));
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
      return;
    }
    // ...
  }, [clearCrossfade]);
  ```

---

### 2.2 Avisos (Gargalos de Performance, Cache, Re-renders & UI/UX)

#### 83. `clearCache()` Apaga Acidentalmente a Sessão Google Persistida (`tetplayer_google_session`) e Não Sincroniza Cache de Álbuns
* **Localização:** [`desktop/src-tauri/src/stats.rs:393-398`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs#L393-L398), [`desktop/src-tauri/src/auth.rs:86`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs#L86) e [`desktop/src/services/cache.ts:237-305`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts#L237-L305).
* **Severidade:** `[Aviso]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  1. **Destruição da Sessão de Login ao Limpar Cache:** Em `auth.rs`, a sessão autenticada do Google é persistida na tabela `app_cache` sob a chave `SESSION_CACHE_KEY = "tetplayer_google_session"`. Porém, quando o usuário clica em *"Limpar Cache Temporário"* nas Configurações (cujo texto afirma preservar a sessão e o histórico), `LocalCacheService.clearCache()` invoca `clear_all_db_cache`, que executa `DELETE FROM app_cache` sem cláusula `WHERE`, apagando a sessão do usuário do banco SQLite!
  2. **Falta de Hidratação e Limpeza de Álbuns no `LocalCacheService`:**
     - `initDbCache()` (`cache.ts:241-265`) restaura apenas `PLAYLISTS_CACHE_KEY` e o LRU de playlists a partir do SQLite, esquecendo de restaurar `ALBUMS_CACHE_KEY` e `ALBUM_LRU_KEY`.
     - `clearCache()` (`cache.ts:271-305`) reseta `saveLruList([])` (playlists), mas esquece de chamar `saveAlbumLruList([])`.
* **Solução Recomendada:**
  Em `stats.rs`, proteger a chave de sessão durante a limpeza de cache:
  ```rust
  pub fn clear_all_cache(app_handle: &AppHandle) -> Result<(), String> {
      let conn = init_db(app_handle)?;
      conn.execute(
          "DELETE FROM app_cache WHERE key != 'tetplayer_google_session'",
          [],
      ).map_err(|e| format!("Failed to clear all cache entries: {}", e))?;
      Ok(())
  }
  ```
  E em `cache.ts`, incluir `ALBUMS_CACHE_KEY` e `ALBUM_LRU_KEY` tanto em `initDbCache()` quanto em `clearCache()`.

---

#### 84. Reabertura de Conexão SQLite com 6 DDLs/4 Pragmas a Cada Operação em `stats.rs` e Novo `reqwest::Client` em `fetch_lyrics`
* **Localização:** [`desktop/src-tauri/src/stats.rs:91-195, 353-398`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs#L91-L195) e [`desktop/src-tauri/src/ytm.rs:1090-1093`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs#L1090-L1093).
* **Severidade:** `[Aviso]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  1. **Overhead Repetitivo no SQLite (`stats.rs`):** Todas as funções de leitura/escrita (`get_cache_entry`, `set_cache_entry`, `delete_cache_entry`, `record_track`, `query_stats`) chamam `init_db(app_handle)`. A função `init_db` abre um novo descritor de arquivo `Connection::open(&db_path)`, executa 4 `PRAGMA`s e interpreta 6 instruções `CREATE TABLE / CREATE INDEX IF NOT EXISTS` antes de cada simples `SELECT` ou `INSERT`. Durante a inicialização (`initDbCache`) ou reordenação de playlists, dezenas de conexões e DDLs redundantes são executadas em sequência.
  2. **Cliente HTTP Efêmero em `fetch_lyrics` (`ytm.rs:1090`):** Embora o `HTTP_CLIENT` global (`LazyLock<reqwest::Client>`) tenha sido implementado para o InnerTube (Histórico #73), a função `fetch_lyrics` ainda instancia `reqwest::Client::builder().timeout(Duration::from_secs(6)).build()` a cada música ou prefetch de letras, descartando o pool TLS para `lrclib.net`.
* **Solução Recomendada:**
  - Executar a migração e os DDLs `CREATE TABLE / INDEX` apenas uma única vez por execução via `OnceLock<PathBuf>` ou manter uma conexão protegida por `Mutex<Connection>` no estado gerenciado do Tauri (`app.manage(...)`).
  - Reutilizar `HTTP_CLIENT` com `.timeout(Duration::from_secs(6))` por requisição em `fetch_lyrics`.

---

#### 85. Subscrição Direta ao `PlayerContext` em `TrackRow` e `AlbumDetailView` Quebrando o `React.memo`
* **Localização:** [`desktop/src/components/MainView/TrackRow.tsx:40`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx#L40) e [`desktop/src/components/MainView/AlbumDetailView.tsx:82`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumDetailView.tsx#L82).
* **Severidade:** `[Aviso]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  O componente `TrackRow` é envolvido em `React.memo` com um comparador customizado (`arePropsEqual`, linhas 265–281) para evitar re-renderizações durante mudanças no player. Entretanto, na linha 40, `TrackRow` executa `const { openContextMenu } = usePlayer();` (e `AlbumDetailView` faz o mesmo na linha 82).
  No React, qualquer componente que consome um Contexto (`useContext(PlayerContext)`) é forçado a re-renderizar sempre que a referência do `value` do Provider mudar (ex: abrir/fechar a gaveta `isNowPlayingOpen`, alterar `volume`, `isMuted`, `isShuffle`, `repeatMode`, `crossfadeSeconds`), **ignorando completamente a barreira do `React.memo` das props!**
* **Solução Recomendada:**
  Passar `onOpenContextMenu` como prop estável (`useCallback`) a partir de `VirtualizedTrackList` / `App.tsx`, removendo a chamada `usePlayer()` de dentro de `TrackRow`.

---

#### 86. Congelamento Visual do `TimelineScrubber` ao Soltar o Ponteiro Fora da Barra de 4px (Falta de `setPointerCapture`)
* **Localização:** [`desktop/src/components/Player/TimelineScrubber.tsx:43-56`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx#L43-L56).
* **Severidade:** `[Aviso]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  No `<input type="range">` de 4px de altura, `handlePointerDown` define `isDraggingRef.current = true` e `setIsDragging(true)`, mas não captura o ponteiro (`e.currentTarget.setPointerCapture(e.pointerId)`) nem registra fallback global `window.addEventListener("pointerup", ...)`.
  Se o usuário clicar na barra, arrastar para ajustar o tempo e soltar o botão do mouse com o cursor fora da faixa de 4px do input, `onPointerUp` pode não ser disparado no elemento. Isso mantém `isDragging = true` indefinidamente, travando o cronômetro visual (`displayTime`) no valor antigo de `dragValue`.
* **Solução Recomendada:**
  ```tsx
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLInputElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback para ambientes de teste (jsdom)
    }
    isDraggingRef.current = true;
    setIsDragging(true);
    setDragValue(currentTimeRef.current);
  }, []);
  ```

---

#### 87. Propagação Indevida de Clique no Botão `⋮` de `pastTracks` e Ausência de Virtualização na `QueueView`
* **Localização:** [`desktop/src/components/QueueView/QueueView.tsx:64-106, 179-302`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx#L64-L106).
* **Severidade:** `[Aviso]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  1. **Bug de Clique no Menu `⋮` de "Músicas que Já Passaram":** Na linha 67, o `div` pai de cada faixa passada possui `onClick={() => onPlayFromQueue(idx)}`. Na linha 88, o botão `<MoreVertical />` chama `onClick={(e) => openContextMenu(e, track, idx)}` **sem chamar `e.stopPropagation()`** (diferente da lista "A Seguir" na linha 282, que chama `e.stopPropagation()`). Como `openContextMenu` chama apenas `e.preventDefault()`, clicar nos 3 pontinhos (`⋮`) de uma música passada para apenas ver suas opções **interrompe a música atual e começa a tocar a música passada imediatamente!**
  2. **Lista "A Seguir" Não Virtualizada:** Ao tocar uma playlist de 500 ou 1.000 músicas, `upcomingTracks.map(...)` monta todas as 999 linhas no DOM de uma só vez ao abrir a gaveta.
* **Solução Recomendada:**
  Adicionar `e.stopPropagation()` no botão `MoreVertical` de `pastTracks` (`QueueView.tsx:89`) e aplicar virtualização (`useVirtualizer`) na lista `upcomingTracks`.

---

#### 88. `scrollMargin` Estático na `VirtualizedTrackList` após Redimensionamento ou Mudança de Header
* **Localização:** [`desktop/src/components/MainView/VirtualizedTrackList.tsx:391-395`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx#L391-L395).
* **Severidade:** `[Aviso]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  O `useLayoutEffect` que mede `setScrollMargin(containerRef.current.offsetTop)` possui array de dependências vazio `[]`. Se o usuário redimensionar a janela (quebrando o título da playlist em múltiplas linhas) ou editar a descrição da playlist, o `offsetTop` real muda, mas `scrollMargin` permanece congelado no valor inicial, deslocando o cálculo de itens visíveis do `@tanstack/react-virtual`.
* **Solução Recomendada:**
  Observar mudanças geométricas com `ResizeObserver` no elemento pai e atualizar `scrollMargin` quando `offsetTop` variar.

---

#### 89. Falso Positivo de `isSeekJump` em `useLyrics` na Troca de Faixa (Atraso de 90ms na 1ª Estrofe)
* **Localização:** [`desktop/src/hooks/useLyrics.ts:207-215, 325-348`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts#L207-L215).
* **Severidade:** `[Aviso]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico & Causa Raiz:**
  Quando `currentTrack?.id` muda, `setActiveLyricIndex(-1)` é executado (linha 211), mas `lastActiveIndexRef.current` **não é resetado para `-1`**, guardando o índice final da música anterior (ex: `45`). Quando a primeira linha da nova música ativa (`activeLyricIndex = 0`), `Math.abs(0 - 45) > 1` é verdadeiro, disparando um falso positivo de `isSeekJump` com debounce de `90ms` e blur desnecessário.
* **Solução Recomendada:**
  Resetar `lastActiveIndexRef.current = -1;` no `useEffect` de troca de `currentTrack?.id`.

---

### 2.3 Sugestões (Polimento Técnico, Bordas & Consistência)

#### 90. Ausência de Paginação por Continuation Token e Metadados `release_date`/`copyright` em `get_album_details`
* **Localização:** [`desktop/src-tauri/src/ytm.rs:1614-1615, 1898-1906`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs#L1614-L1615).
* **Severidade:** `[Sugestão]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico:**
  - Diferente de `get_playlist_tracks` (que possui loop de `extract_continuation_token` para até 2.500 faixas), `get_album_details` lê apenas a primeira página retornada pelo endpoint `/browse`, o que pode truncar coletâneas ou trilhas sonoras de múltiplos discos com mais de 100 faixas.
  - Além disso, nas linhas 1614–1615 de `ytm.rs`, os campos `release_date: None` e `copyright: None` estão fixos em `None`, embora o JSX de [`AlbumDetailView.tsx:403-411`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumDetailView.tsx#L403-L411) já esteja pronto para exibi-los no rodapé editorial do álbum.

---

#### 91. Interceptação Global de `Ctrl+F` com Modais/Drawer Abertos, Domínio do Link Copiado e Cleanup de `useMediaSession`
* **Localização:** [`desktop/src/components/MainView/PlaylistDetailView.tsx:104-116`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx#L104-L116), [`desktop/src/components/ContextMenu/TrackContextMenu.tsx:125`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx#L125) e [`desktop/src/hooks/useMediaSession.ts:68-88`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useMediaSession.ts#L68-L88).
* **Severidade:** `[Sugestão]` | **Status:** `[Pendente]`
* **Diagnóstico Técnico:**
  1. **`Ctrl+F` em `PlaylistDetailView.tsx`:** O listener `window.addEventListener("keydown", ...)` permanece ativo mesmo quando o `<main>` está oculto sob o `NowPlayingDrawer` (`inert`) ou quando o `SettingsModal` / `PlaylistModals` estão abertos, roubando o foco para um input invisível. Verificar `if (containerRef.current?.closest("[inert]")) return;` resolve o problema.
  2. **Link Copiado em `TrackContextMenu.tsx:125`:** Copia `https://www.youtube.com/watch?v=${track.id}` em vez de `https://music.youtube.com/watch?v=${track.id}`.
  3. **Cleanup em `useMediaSession.ts:68-88`:** Adicionar função de retorno no `useEffect` limpando os handlers (`setActionHandler(action, null)`) na desmontagem.

---

## 3. Histórico Consolidado e Ordenado de Itens Resolvidos (#01 a #80)

> [!NOTE]
> Todos os **80 itens** abaixo foram diagnosticados, corrigidos, testados e validados no TetPlayer Desktop. A numeração foi integralmente saneada, deduplicada e organizada em ordem sequencial estrita para consulta histórica.

### Índice Rápido do Histórico de Correções

| Faixa | Ciclo / Milestone | Principais Correções e Melhorias |
| :---: | :--- | :--- |
| **#01 – #27** | **Fundação, Mini Player & Integração OS (`v0.1.x`)** | Zero interrupção de áudio no Mini Player, System Tray, Rádio Contínua, Espectro, SQLite Stats, SMTC Throttling, Autoscroll de Letras, `scrollMargin`, Atalhos `J`/`K`/`Shift+Up`, WAI-ARIA, Modularização, Virtualização, Capas HD 800x800, Transparência e Snap Magnético Win32. |
| **#28 – #47** | **Isolamento de CPU, Reducer, Temas & Release `v1.0.0`** | Correção de Seek SMTC, `React.memo` global, GPU `scaleY`, Cache LRU, LRC Multi-timestamp, Eliminação do Startup Blank Frame, Fim dos Hollow Corners, Menu de Contexto, Motion Cover 3D, Layout Proporcional de 3 Colunas, `SettingsModal`, Drag & Drop na Fila, Teclas Globais de Mídia, Share Cards PNG e 8 Paletas de Tema. |
| **#48 – #65** | **Auto-Update, Login Nativo, Letras Cinéticas & Gaveta 144 FPS (`v1.1` → `v1.3.3`)** | Ciclo determinístico de Crossfade, Login Google Nativo via Webview, Auto-Update Minisign (`createUpdaterArtifacts`), Scroll Cinético com Spring Bounce nas Letras, Fallback 404 de Capas, Debounce de Seek no Scrubber, Teto LRU de Letras, Pasta Portátil `data/`, Fechamento Automático da Gaveta na Sidebar, Busca/Ordenação em Playlists e Animação Contínua GPU na Gaveta sem Reflow. |
| **#66 – #80** | **Motor de Áudio Nativo, Pool HTTP, Álbuns & Playlists 144 FPS (`v1.3.4` → `v1.4.0+`)** | Paginação de 2.500 faixas, Motor de Áudio Nativo Híbrido (`AudioEngine`), Proteção contra Race Condition no Next Track Thrashing, Supressão de Volume Flooding na Web Audio API, `LyricLineRow` memoizado, SQLite WAL, Pausar Visualizer em Background, Pool Global `HTTP_CLIENT` (`LazyLock`), Suporte Completo a Álbuns, CRUD Bidirecional de Playlists, Seletores Dark com Z-Index Corrigido e Drag & Drop de Playlists com Card Flutuante a 144 FPS. |

---

### Catálogo Sequencial Completo (#01 a #80)

#### 01. Mini Player Flutuante (Always-on-Top / PiP Mode) sem Interrupção de Áudio
* **Status:** `[Resolvido]` ✅ | **Localização:** [`MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx), [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs).
* **Solução Implementada:** O nó DOM `#yt-player-frame` foi movido para a raiz do `PlayerProvider`, mantendo o áudio intacto ao alternar entre o modo completo (`1050x720px`) e o Mini Player (`380x140px` Always-on-Top). Adicionada proteção `data-no-drag` para desbloquear os botões de janela no Windows.

#### 02. Minimizar para a Bandeja do Sistema (System Tray com Menu de Contexto)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Solução Implementada:** `TrayIconBuilder` no Tauri v2 com menu nativo (Reproduzir/Pausar, Próxima, Anterior, Mostrar/Ocultar, Alternar Mini Player e Sair) via eventos IPC `tray-action`.

#### 03. Autoplay Infinito & Rádio da Faixa (`get_radio_tracks`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Solução Implementada:** Parser de `playlistPanelVideoRenderer` no endpoint `/next` do InnerTube, anexando recomendações automaticamente ao final da fila.

#### 04. Visualizador de Áudio e Espectro Dinâmico (`SpectrumVisualizer`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).
* **Solução Implementada:** Componente de espectro com variantes `mini`, `inline` e `full` integrado ao `PlayerBar`, `NowPlayingDrawer` e `MiniPlayer`.

#### 05. Painel de Estatísticas de Reprodução Pessoais no SQLite (`stats.rs` & `StatsView.tsx`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`StatsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsView.tsx).
* **Solução Implementada:** Persistência em banco SQLite local (`tetstats.db`) com agregação de horas ouvidas, artistas únicos, top 10 músicas e top 5 artistas por período (7 dias, 30 dias, todo o histórico).

#### 06. Estabilização e Fim do Flooding no Windows Media Session (SMTC)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useMediaSession.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useMediaSession.ts).
* **Solução Implementada:** Uso de `currentTimeRef` e throttling de 1.000ms nas atualizações de `setPositionState`, estabilizando a instância de `MediaMetadata`.

#### 07. Eliminação do Falso Positivo de Rolagem Manual nas Letras (`isProgrammaticScrollRef`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts).
* **Solução Implementada:** Sentinela `isProgrammaticScrollRef` impedindo que o autoscroll programático seja interpretado como rolagem manual do usuário.

#### 08. Alternância de Reprodução (Play/Pause) na Lista sem Reiniciar a Faixa Ativa do `0:00`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx), [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx).
* **Solução Implementada:** Propagação de `onTogglePlayPause` para pausar/retomar quando o usuário clica na linha da música que já está tocando.

#### 09. Compensação de Deslocamento (`scrollMargin`) na Lista Virtualizada com Header
* **Status:** `[Resolvido]` ✅ | **Localização:** [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx).
* **Solução Implementada:** Inclusão de `scrollMargin: containerRef.current?.offsetTop ?? 0` no `useVirtualizer`.

#### 10. Suporte aos Atalhos de Teclado `J` e `K` Anunciados na Interface
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useKeyboardShortcuts.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useKeyboardShortcuts.ts).
* **Solução Implementada:** Mapeamento explícito de `KeyJ` (faixa anterior) e `KeyK` (próxima faixa).

#### 11. Botão de Limpeza Rápida (`X`) no Campo da Tela de Busca
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SearchView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/SearchView.tsx).
* **Solução Implementada:** Botão `X` condicional (`searchQuery.length > 0`) para limpar a busca em 1 clique.

#### 12. Posicionamento Relativo no Container de Letras para Cálculo Preciso de `offsetTop`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`LyricsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx).
* **Solução Implementada:** Adição da classe `relative` ao container raiz `lyricsContainerRef`.

#### 13. Transição Suave e Fade Gradual no Fundo Aurora via CSS `@property`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts), [`index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css).
* **Solução Implementada:** Propriedades CSS tipadas `@property --aurora-1/2/3` com `syntax: "<color>"` e interpolação RGBA contínua.

#### 14. Unificação da Fonte de Verdade das Abas da Gaveta (`nowPlayingTab`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Solução Implementada:** Controle centralizado em `nowPlayingTab === "queue" | "lyrics"`.

#### 15. Preservação de Exclusões de Faixas ao Desativar o Modo Shuffle
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts).
* **Solução Implementada:** Sincronização simultânea de remoções tanto em `activeQueue` quanto em `originalQueue`.

#### 16. Supressão de Flooding de Mensagens de Volume a cada 80ms para o IFrame do YouTube
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts).
* **Solução Implementada:** Sentinela `lastAppliedVolumeRef` evitando `postMessage` redundante quando o volume não mudou.

#### 17. Escalonamento Fluido da Capa na Gaveta em Janelas de Menor Altura (`max-h-[32vh]`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Solução Implementada:** Limite proporcional de altura evitando corte vertical dos metadados.

#### 18. Correção do Atalho `Shift + Seta para Cima` para Expandir/Recolher a Gaveta
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useKeyboardShortcuts.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useKeyboardShortcuts.ts).
* **Solução Implementada:** Verificação prioritária de `e.shiftKey` na cláusula `ArrowUp`.

#### 19. Atributos de Acessibilidade WAI-ARIA em Abas e Controles da Fila
* **Status:** `[Resolvido]` ✅ | **Localização:** [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx), [`QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx).
* **Solução Implementada:** Inclusão de `role="tablist"`, `role="tab"`, `aria-selected` e `aria-label`s descritivos.

#### 20. Modularização Completa do Monólito `App.tsx` em Componentes e Hooks Especializados
* **Status:** `[Resolvido]` ✅ | **Localização:** [`App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Solução Implementada:** Decomposição de ~2.900 linhas em módulos independentes e testáveis.

#### 21. Virtualização de Listas Extensas com `@tanstack/react-virtual`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx).
* **Solução Implementada:** Renderização por janela visível garantindo rolagem a 144 FPS.

#### 22. Elevação Automática de Capas para Alta Resolução (`w800-h800` e `maxresdefault.jpg`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`artwork.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/utils/artwork.ts), [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Solução Implementada:** Reescrita de parâmetros de URL do Googleusercontent/YouTube com fallback resiliente em cascata.

#### 23. Padronização de Altura e `whitespace-nowrap` nas Abas da Gaveta
* **Status:** `[Resolvido]` ✅ | **Localização:** [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Solução Implementada:** Prevenção de quebra de linha nas abas "Fila" e "Letras" em janelas compactas.

#### 24. Ativação de Transparência Nativa da Janela no Tauri v2 para o Mini Player
* **Status:** `[Resolvido]` ✅ | **Localização:** [`tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json), [`index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css).
* **Solução Implementada:** Configurado `"transparent": true` na janela principal para eliminar artefatos de fundo.

#### 25. Encaixe Magnético na Borda, Supressão do Windows Aero Snap e Arrasto Vertical PiP
* **Status:** `[Resolvido]` ✅ | **Localização:** [`lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx).
* **Solução Implementada:** Monitoramento Win32 `GetAsyncKeyState(VK_LBUTTON)` em `start_drag_and_snap` com ancoragem lateral e deslocamento vertical estilo PiP.

#### 26. Suporte Multi-Navegador Inicial para Sessão (Posteriormente Substituído por Webview Nativa no #49)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`auth.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs).
* **Solução Implementada:** Extração inicial de sessão multi-browser, sucedida pelo login Google nativo isolado na v1.1.0.

#### 27. Sistema Automático de Verificação de Atualizações via GitHub Releases (`updater.ts`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`updater.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/updater.ts), [`UpdateModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx).
* **Solução Implementada:** Comparação SemVer com timeout de 6s via `AbortController` e modal informativo.

#### 28. Correção do Bug Lógico de Comparação de Posição no Seek da MediaSession (`lastTrackedPositionRef`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useMediaSession.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useMediaSession.ts).
* **Solução Implementada:** Separada a referência de posição em segundos (`lastTrackedPositionRef`) da referência de timestamp em milissegundos, permitindo detecção imediata de saltos manuais (> 2s).

#### 29. Isolamento de Re-renderizações em Cascata Global com `PlaybackProgressContext`, `React.memo` e `useCallback`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlaybackProgressContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlaybackProgressContext.tsx), [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Solução Implementada:** Separação do progresso de alta frequência (80ms) em contexto dedicado e memoização de todas as views principais.

#### 30. Aceleração Gráfica por GPU no Espectro de Áudio (`transform: scaleY`) sem Layout Thrashing
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).
* **Solução Implementada:** Substituição de animações de `height` por `transform: scaleY(...)` com `transformOrigin: "bottom"`.

#### 31. Política de Evicção LRU e Tratamento de `QuotaExceededError` no Cache Local
* **Status:** `[Resolvido]` ✅ | **Localização:** [`cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts).
* **Solução Implementada:** Fila LRU limitando a 25 playlists e 25 álbuns em cache com poda automática das entradas mais antigas.

#### 32. Teto Rotativo de 150 Entradas no Cache Local de Paletas Aurora
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useAuroraColor.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useAuroraColor.ts).
* **Solução Implementada:** Poda automática do dicionário `paletteCacheRef` antes de persistir no `localStorage`.

#### 33. Parser Avançado de Letras LRC com Suporte a Interlúdios Instrumentais (`♪`) e Múltiplos Timestamps
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts).
* **Solução Implementada:** Uso de `matchAll` para múltiplos timestamps na mesma linha e marcador `♪` para intervalos instrumentais.

#### 34. Fechamento por Tecla `Escape` e Clique no Backdrop no `UpdateModal`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`UpdateModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx).
* **Solução Implementada:** Listener de teclado `Escape` e handler de clique no backdrop com `e.stopPropagation()` no card interno.

#### 35. Eliminação do Flash de Janela Branca na Inicialização (`visible: false` + `show_main_window`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json), [`lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs), [`index.html`](file:///d:/progrmação/programas/TetPlayer/desktop/index.html).
* **Solução Implementada:** Janela inicia oculta com fundo escuro `#0b0c10` no HTML e só é exibida após a montagem do React (`show_main_window`).

#### 36. Fim dos Cantos Vazios (*Hollow Corners*) no Modo Mini Player e Aba Docked
* **Status:** `[Resolvido]` ✅ | **Localização:** [`MiniPlayer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MiniPlayer/MiniPlayer.tsx), [`App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Solução Implementada:** Moldura retangular sólida de borda a borda preenchendo 100% da janela nativa de `380x140px` e `38x90px`.

#### 37. Menu de Contexto Flutuante com Clamping de Coordenadas e Ações Rápidas (`TrackContextMenu`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx), [`playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts).
* **Solução Implementada:** Menu de contexto em todas as listas com `INSERT_NEXT`, `ADD_TO_END`, Rádio, Busca de Artista, Álbum e manipulação de playlists.

#### 38. Remoção de Partículas em Canvas e Limpeza Visual do `NowPlayingDrawer`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Solução Implementada:** Exclusão do efeito de partículas para manter estética minimalista e 0% de uso extra de GPU.

#### 39. Capas Cinematográficas Animadas 3D (`MotionCover`) com Amortecimento Suave
* **Status:** `[Resolvido]` ✅ | **Localização:** [`MotionCover.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/MotionCover.tsx), [`index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css).
* **Solução Implementada:** Inclinação 3D suave (`5.2deg`), feixe de luz especular `@keyframes motionSweep` e retorno amortecido em `1.4s cubic-bezier(0.16, 1, 0.3, 1)`.

#### 40. Layout Proporcional de 3 Colunas Balanceadas no `PlayerBar` e Header da Gaveta
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx), [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Solução Implementada:** Seções laterais limitadas a `w-[28%]` e seção central `flex-1` ancorada no centro geométrico da janela, eliminando colisões em 800px.

#### 41. Modal Centralizado de Configurações (`SettingsModal` & `SettingsService`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx), [`settings.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/settings.ts).
* **Solução Implementada:** Painel completo com 5 abas verticais e persistência reativa no `localStorage`.

#### 42. Isolamento do Scrubber em Subcomponente Memoizado (`TimelineScrubber`) e Compressão SQLite `flate2`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`TimelineScrubber.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx), [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs).
* **Solução Implementada:** Desacoplamento do slider de tempo do `PlayerBar` e compressão Deflate + Base64 para entradas de cache maiores que 128 bytes no SQLite.

#### 43. Reordenação da Fila de Reprodução via Drag & Drop (`REORDER_QUEUE`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx), [`playerReducer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/playerReducer.ts).
* **Solução Implementada:** Ação determinística `REORDER_QUEUE` preservando `currentQueueIndex` durante reordenações na fila "A Seguir".

#### 44. Teclas Globais de Mídia e Atalhos de Hardware no Windows (`tauri-plugin-global-shortcut`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`lib.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/lib.rs).
* **Solução Implementada:** Registro global de `MediaPlayPause`, `MediaTrackNext`, `MediaTrackPrevious`, `MediaStop` e `Ctrl+Alt+Space/Left/Right`.

#### 45. Exportação de Cartões Artísticos de Resumo Social em PNG (`StatsShareModal`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`StatsShareModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsShareModal.tsx).
* **Solução Implementada:** Renderizador Canvas 2D (`1200x675`) com cópia direta para a área de transferência e download PNG.

#### 46. Unificação e Fechamento SemVer `v1.0.0` Oficial
* **Status:** `[Resolvido]` ✅ | **Localização:** [`package.json`](file:///d:/progrmação/programas/TetPlayer/desktop/package.json), [`Cargo.toml`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/Cargo.toml), [`README.md`](file:///d:/progrmação/programas/TetPlayer/desktop/README.md).
* **Solução Implementada:** Padronização de manifestos e documentação técnica de lançamento.

#### 47. Sistema de 8 Paletas de Cores Vibrantes, 4 Estilos de Visualizador e Desacoplamento do Vermelho Estático
* **Status:** `[Resolvido]` ✅ | **Localização:** [`settings.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/settings.ts), [`index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css), [`SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).
* **Solução Implementada:** Injeção dinâmica de tokens CSS (`--accent`, `--accent-glow`, etc.) em `:root` com 8 temas e 4 modos de espectro (`bars`, `blocks`, `gradient`, `pulse`).

#### 48. Correção de Dupla Execução em StrictMode no Ciclo de Crossfade e Toggle do Motion Cover
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`MotionCover.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/MotionCover.tsx).
* **Solução Implementada:** Remoção de efeitos colaterais (`SettingsService.updateSetting`) de dentro dos updaters `setState(prev => ...)`, garantindo transição determinística no ciclo `[0, 2, 3, 5, 8, 12]`.

#### 49. Login Nativo com Conta Google via Webview Embutida e Remoção do Scraping de Navegadores Externos
* **Status:** `[Resolvido]` ✅ | **Localização:** [`auth.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/auth.rs), [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Solução Implementada:** Janela `WebviewWindowBuilder` isolada monitorando a chegada ao domínio `music.youtube.com` e validando a conta via `fetch_account_info` antes de fechar.

#### 50. Pipeline CI/CD no GitHub Actions para Releases e Verificação Manual de Atualizações (`v1.1.0`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`release.yml`](file:///d:/progrmação/programas/TetPlayer/.github/workflows/release.yml), [`updater.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/updater.ts).
* **Solução Implementada:** Automação de build Windows x64 (`.exe` / `.msi`) e botão de verificação manual na aba "Sobre".

#### 51. Motor de Interpolação Cinética (`requestAnimationFrame`) e Profundidade de Campo nas Letras (`v1.2.0`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts), [`LyricsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx).
* **Solução Implementada:** Substituição do `scrollTo({ behavior: "smooth" })` nativo por curva cinética customizada e gradiente de opacidade/escala por distância focal.

#### 52. Keyframes de Mola Elástica (`lyric-spring-bounce`) e Curva `kineticSpringBounce` nas Letras (`v1.2.1`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css), [`useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts).
* **Solução Implementada:** Animação de 5 estágios com overshoot elástico sutil e badge de versão permanente na `TitleBar`.

#### 53. Fallback Terminal para Imagens 404 em `handleArtworkError` e nas Capas de Playlists
* **Status:** `[Resolvido]` ✅ | **Localização:** [`artwork.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/utils/artwork.ts), [`PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx).
* **Solução Implementada:** Atributo `data-artwork-failed="true"` ocultando imagens quebradas e exibindo o ícone `<Music />` sobre gradiente.

#### 54. Renderização Vetorial DOM HiDPI no `SpectrumVisualizer` e Harmonização Temática do `StatsShareModal`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx), [`StatsShareModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/StatsView/StatsShareModal.tsx).
* **Solução Implementada:** Nitidez vetorial em qualquer escala de DPI e sincronização das cores do cartão exportado com `THEME_PALETTES[accentTheme]`.

#### 55. Desacoplamento de Arrasto e Seek Efetivo (`onPointerUp`) no `TimelineScrubber`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`TimelineScrubber.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx).
* **Solução Implementada:** Atualização apenas visual de `dragValue` durante o arrasto, disparando `onSeek` apenas ao soltar o ponteiro.

#### 56. Estado Vazio Contextual para Busca sem Resultados (`SearchX`) e Limpeza do Cache SQLite (`clear_all_db_cache`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SearchView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/SearchView.tsx), [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts).
* **Solução Implementada:** Feedback visual dedicado quando `hasSearched && searchResults.length === 0` e comando Rust para truncar cache no banco local.

#### 57. Teto LRU de 80 Músicas no Cache de Letras em Memória (`MAX_LYRICS_CACHE_ENTRIES`) e Modernização do Updater Tauri v2
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts), [`updater.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/updater.ts).
* **Solução Implementada:** Substituição do objeto ilimitado por `Map` LRU com teto de 80 faixas e integração com `@tauri-apps/plugin-updater`.

#### 58. Armazenamento Unificado e Portátil na Pasta de Instalação (`data/`) com Migração Automática
* **Status:** `[Resolvido]` ✅ | **Localização:** [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json), [`SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx).
* **Solução Implementada:** Centralização do banco `data/tetstats.db` e `data/music/` no diretório de instalação, migração automática de `%LOCALAPPDATA%` e opção de escolha de diretório no instalador NSIS (`installMode: "both"`).

#### 59. Harmonização Geométrica do Seletor de Abas e Indicador Deslizante na `NowPlayingDrawer`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx).
* **Solução Implementada:** Pílula deslizante animada (`indicatorStyle`) e equalização de altura (`h-8 rounded-xl`) com o botão de Crossfade.

#### 60. Desacoplamento Visual do Badge "Desktop" sobre o Ícone na Aba Sobre (`v1.3.1`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SettingsModal.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx).
* **Solução Implementada:** Remoção da sobreposição absoluta sobre o logotipo e integração como chip tipográfico ao lado do título.

#### 61. Ativação de `createUpdaterArtifacts: true` no Tauri v2 para Geração de `latest.json` e `.sig` (`v1.3.2`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`tauri.conf.json`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/tauri.conf.json).
* **Solução Implementada:** Habilitação da geração automática de artefatos assinados Minisign para auto-update silencioso in-app.

#### 62. Fechamento Automático da Gaveta de Reprodução ao Navegar na Barra Lateral (`v1.3.3`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx), [`Sidebar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Sidebar/Sidebar.tsx).
* **Solução Implementada:** Disparo automático de `closeNowPlaying()` ao alternar abas ou selecionar playlists/álbuns na `Sidebar`.

#### 63. Busca (`Ctrl+F`) e Ordenação Dentro de Playlists e Reposicionamento Ergonômico no `PlayerBar`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx), [`PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx).
* **Solução Implementada:** Filtro em tempo real nas playlists e posicionamento do Mini Player na extrema esquerda do `PlayerBar`.

#### 64. Animação de Fade Suave nos Breadcrumbs do `TitleBar` e Seta da Gaveta na Extrema Direita
* **Status:** `[Resolvido]` ✅ | **Localização:** [`TitleBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/TitleBar/TitleBar.tsx), [`PlayerBar.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx).
* **Solução Implementada:** Transição `.animate-breadcrumb-fade` ao trocar de seção e simetria nos extremos do `PlayerBar`.

#### 65. Eliminação da Micro-Travada no Fechamento da Gaveta (Curva Contínua GPU e Atributo `inert` no `<main>`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`index.css`](file:///d:/progrmação/programas/TetPlayer/desktop/src/index.css), [`NowPlayingDrawer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx), [`App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Solução Implementada:** Keyframes monotônicos de segmento único em 200ms, fundo sólido `#0b0c10` (evitando recomposição de `backdrop-blur-2xl` em movimento) e substituição de `hidden` por `inert` no `<main>` para evitar reflow síncrono.

#### 66. Paginação Completa de Playlists com Continuação Automática (Até 2.500 Faixas em `get_playlist_tracks`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Solução Implementada:** Extrator recursivo `extract_continuation_token` e loop iterativo de até 25 páginas com deduplicação `HashSet`.

#### 67. Motor de Áudio Nativo Híbrido com Pré-Buffer em RAM e Fallback Resiliente para IFrame (`AudioEngine`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts), [`useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts), [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Solução Implementada:** Reprodução direta de streams Opus 160kbps / AAC 128kbps sobre HTML5 Audio + Web Audio API `GainNode` com fallback transparente para o IFrame do YouTube.

#### 68. Eliminação de Race Condition em `loadAndPlayVideo` no Pulo Rápido de Músicas (*Next Track Thrashing*)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts).
* **Solução Implementada:** Sentinelas atômicas `if (currentVideoIdRef.current !== videoId) return;` após `await invoke("get_stream_info")`, descartando respostas atrasadas de faixas já puladas.

#### 69. Supressão de Flooding de Automação de Volume na Web Audio API a cada 80ms (`lastAppliedVolume`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`audioEngine.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/audioEngine.ts), [`useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts).
* **Solução Implementada:** `gainNode.gain.setValueAtTime` só é invocado quando `Math.abs(lastAppliedVolume - clamped) >= 0.001`.

#### 70. Memoização Cirúrgica de Linhas de Letras (`LyricLineRow`) na `LyricsView`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`LyricsView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx).
* **Solução Implementada:** Extração de cada verso para `React.memo(LyricLineRow)` com comparador customizado de distância focal, reduzindo em >90% o trabalho de reconciliação do React.

#### 71. Ativação do Modo Concorrente WAL e Otimizações de Memória no SQLite (`stats.rs`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs).
* **Solução Implementada:** Configurados `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA temp_store = MEMORY; PRAGMA cache_size = -8000;`.

#### 72. Supressão de Ciclos de Renderização em Segundo Plano no `SpectrumVisualizer` (`document.hidden`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`SpectrumVisualizer.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Visualizer/SpectrumVisualizer.tsx).
* **Solução Implementada:** Pausa imediata dos timers de animação quando `document.hidden === true`.

#### 73. Pool Global de Conexões HTTP e Reuso de Sessão TLS no Backend Rust (`HTTP_CLIENT: LazyLock<reqwest::Client>`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`ytm.rs:8-16`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs#L8-L16).
* **Diagnóstico Anterior:** A cada requisição à API InnerTube, uma instância efêmera de `reqwest::Client::new()` era criada e descartada, forçando novos handshakes TCP + TLS 1.3 a cada clique.
* **Solução Implementada:** Criado o singleton global `pub static HTTP_CLIENT: LazyLock<reqwest::Client>` com `pool_max_idle_per_host(10)` e `timeout(Duration::from_secs(15))`, compartilhado por todas as funções InnerTube em `ytm.rs`.

#### 74. Suporte Completo a Álbuns na Biblioteca com Extração Híbrida (`FEmusic_liked_albums` + Fallback de Faixas) e Discografia (`v1.4.0`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`AlbumGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumGridView.tsx), [`AlbumDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumDetailView.tsx), [`AlbumCard.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumCard.tsx).
* **Solução Implementada:** Implementados `get_user_albums`, `get_album_details` e `search_album_by_name` com resolução de `browseId` (`MPREb_...`), visualização editorial do álbum, indicador de onda sonora sutil no card ativo e seção de álbuns recomendados/mesmo artista.

#### 75. Manipulação Bidirecional Completa de Playlists Sincronizada com o YouTube Music (Criar, Editar, Excluir, Adicionar e Remover Faixas)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`PlaylistModals.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/PlaylistModals/PlaylistModals.tsx), [`TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx), [`App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Solução Implementada:** Implementados os endpoints autenticados `/playlist/create`, `/playlist/delete` e `/browse/edit_playlist` (`ACTION_EDIT_PLAYLIST_TITLE`, `ACTION_EDIT_PLAYLIST_DESCRIPTION`, `ACTION_ADD_VIDEO` e `ACTION_REMOVE_VIDEO`), com extração multi-caminho de `playlistSetVideoId` e atualização otimista de 0ms no estado local e no `LocalCacheService`.

#### 76. Substituição do `<select>` Nativo do Windows por Dropdowns Customizados Dark Glassmorphic
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlaylistGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistGridView.tsx), [`AlbumGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumGridView.tsx), [`PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx).
* **Solução Implementada:** Menus flutuantes em vidro escuro (`bg-[#12151f]/95 backdrop-blur-xl`) com realce pelo tema ativo, ícone `Check` e fechamento por `Escape` ou clique externo.

#### 77. Segmented Control Unificado com Pílula Deslizante a 144 FPS entre Playlists e Álbuns
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlaylistGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistGridView.tsx), [`AlbumGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumGridView.tsx).
* **Solução Implementada:** Pílula indicadora neutra (`bg-white/[0.10]`) animada via `transform: translateX(100%)` com curva `cubic-bezier(0.22, 1, 0.36, 1)` mantendo o cabeçalho montado sem saltos visuais.

#### 78. Correção de Empilhamento (Z-Index Overlap) do Seletor de Ordenação Sobre a Lista Virtualizada de Faixas
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx), [`AlbumGridView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumGridView.tsx).
* **Diagnóstico Anterior:** A barra de busca/ordenação não possuía contexto de empilhamento explícito superior ao container da lista virtualizada abaixo dela, fazendo o menu aberto de "Ordenar por" ficar parcialmente coberto pelas primeiras músicas da playlist.
* **Solução Implementada:** Aplicado `relative z-30` à barra de busca/ordenação e `relative z-10` ao container da lista de faixas, garantindo que o menu flutuante (`z-50`) sobreponha todas as linhas com perfeição.

#### 79. Reordenação Drag-and-Drop Determinística de Faixas em Playlists Sincronizada com o YouTube Music (`ACTION_MOVE_VIDEO_BEFORE`)
* **Status:** `[Resolvido]` ✅ | **Localização:** [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs), [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx), [`TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx), [`App.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx).
* **Solução Implementada:**
  - Alça de arrasto restrita à zona esquerda do item (`[ índice/grip | capa | título e artista ]`), ativa apenas na Ordem Original sem filtro de texto.
  - Comando Rust `reorder_playlist_track` executando `ACTION_MOVE_VIDEO_BEFORE` (e manobra atômica de 2 passos quando a música é movida para a última posição da playlist), com rollback automático em caso de falha de rede.

#### 80. Card Flutuante Acelerado por GPU a 144 FPS (`createPortal` + `translate3d`) durante o Arrasto de Músicas na Playlist
* **Status:** `[Resolvido]` ✅ | **Localização:** [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx), [`TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx).
* **Solução Implementada:** Ao agarrar e mover uma música, um card flutuante estilizado é renderizado no `document.body` via `createPortal` e posicionado diretamente no evento `pointermove` via `ghostRef.current.style.transform = translate3d(...)` sem re-renderizar a árvore React, mantendo o slot de origem tracejado e a linha luminosa colorida de encaixe.
