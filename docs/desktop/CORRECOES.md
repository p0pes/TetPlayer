# 🛠️ Relatório de Auditoria Técnica, Qualidade de Código, UI/UX & Performance — TetPlayer Desktop

> **Escopo do Documento:** Auditoria profunda e contínua do código-fonte do **TetPlayer Desktop** (Frontend React 19 + TypeScript + Tailwind CSS e Backend Nativo Tauri v2 + Rust + SQLite), cobrindo bugs lógicos, condições de corrida, gargalos de performance (CPU/GPU/I/O), acessibilidade e inconsistências de UI/UX.

---

## 📑 Índice Navegável

1. [Sumário Executivo & Status Atual da Base de Código](#1-sumário-executivo--status-atual-da-base-de-código)
2. [Apontamentos Ativos Catalogados (Pendentes de Correção)](#2-apontamentos-ativos-catalogados-pendentes-de-correção)
3. [Histórico Consolidado e Ordenado de Itens Resolvidos (#01 a #91)](#3-histórico-consolidado-e-ordenado-de-itens-resolvidos-01-a-91)

---

## 1. Sumário Executivo & Status Atual da Base de Código

Uma nova auditoria técnica profunda foi realizada em todo o ecossistema desktop do **TetPlayer** (Frontend React 19 + TypeScript + Tailwind CSS e Backend Tauri v2 + Rust), com ênfase especial em **fluidez de interface, ausência de animações de transição, saltos visuais bruscos de layout (CLS), lacunas de UX/UI, estabilidade lógica e consistência de performance**.

Foram catalogados **15 novos apontamentos técnicos ativos (#92 a #106)** para correção e refinamento prioritário.

| Severidade | Pendentes Ativos | Resolvidos no Histórico | Status da Build & Testes |
| :--- | :---: | :---: | :--- |
| 🔴 **Críticos** | `1` (#104) | **91 Resolvidos** | ✅ `tsc && vite build` (0 erros) |
| 🟡 **Avisos** | `8` (#92-#95, #97, #100, #105, #106) | **91 Resolvidos** | ✅ `vitest` (83/83 testes passando) |
| 🔵 **Sugestões** | `6` (#96, #98, #99, #101-#103) | **91 Resolvidos** | ✅ `cargo test` (14/14 testes passando) |
| **Total Geral** | **`15 Pendentes`** | **`91 Itens Resolvidos`** | 🟡 **Auditoria Ativa — Refinamento de Animações & UX** |

---

## 2. Apontamentos Ativos Catalogados (Pendentes de Correção)

> [!IMPORTANT]
> **Foco da Rodada de Auditoria:** Eliminação de transições secas, implementação de animações de saída (*exit animations*), preservação ergonômica de scroll, polimento de micro-interações táteis e higienização resiliente de falhas de rede.

### 92. Ausência de Animação de Saída (Exit Animation) e Desmontagem Abrupta em Todos os Modais
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/components/Modals/ConfirmDeleteModal.tsx:41`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Modals/ConfirmDeleteModal.tsx#L41), [`desktop/src/components/Modals/CreatePlaylistModal.tsx:45`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Modals/CreatePlaylistModal.tsx#L45), [`desktop/src/components/Modals/EditPlaylistModal.tsx:41`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Modals/EditPlaylistModal.tsx#L41), [`desktop/src/components/Modals/AddToPlaylistModal.tsx:64`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Modals/AddToPlaylistModal.tsx#L64), [`desktop/src/components/SettingsModal/SettingsModal.tsx:177`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx#L177), [`desktop/src/components/UpdateModal/UpdateModal.tsx:47`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/UpdateModal/UpdateModal.tsx#L47)
* **Diagnóstico Técnico da Causa-Raiz:**
  Todos os modais da aplicação utilizam a regra antecipada `if (!isOpen) return null;`. Embora possuam animação de entrada com classes Tailwind CSS (`animate-in fade-in zoom-in-95 duration-150`), no momento em que o usuário fecha a caixa de diálogo (pelo botão de fechar, clique no backdrop ou tecla `Escape`), o componente é sumariamente desmontado da árvore DOM em 0ms. Isso provoca o desaparecimento repentino do backdrop escurecido e do diálogo, cortando a experiência visual de forma seca e não polida.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Implementar um estado interno de transição de fechamento (`isClosing`) ou usar um wrapper genérico de modal animado com atraso de unmount de 150ms. Ao solicitar o fechamento, aplicar classes de saída `animate-out fade-out zoom-out-95 duration-150` antes de invocar a remoção definitiva do componente.
  ```tsx
  // Exemplo ilustrativo de transição de saída para Modais:
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const handleRequestClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  }, [onClose]);
  ```

---

### 93. Transição Seca de Telas Principais (Álbum, Playlist, Artista e Abas) sem Crossfade ou Slide
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/App.tsx:1367-1813`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx#L1367-L1813)
* **Diagnóstico Técnico da Causa-Raiz:**
  No contêiner `<main>`, as visões de detalhe (`ArtistDetailView`, `PlaylistDetailView`, `AlbumDetailView`, `LibraryOverview`, `SearchView`, `StatsView`) são alternadas por ternários diretos. Quando o usuário clica em um card de álbum ou no nome de um artista, o layout atual é imediatamente substituído pelo novo. A ausência de um efeito de fade ou slide sutil faz com que os blocos saltem na tela, dando a sensação de um reload rígido.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Envolver os componentes centrais de visão em contêineres identificados com chaves determinísticas (`key={viewKey}`) com classes de entrada `animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out` ou transições suaves de opacidade entre trocas de visualização.
  ```tsx
  <div key={selectedArtist?.id || selectedAlbum?.id || selectedPlaylist?.id || activeTab} className="animate-in fade-in slide-in-from-bottom-1.5 duration-200 ease-out">
    {/* Visão de detalhe ativa */}
  </div>
  ```

---

### 94. Perda Brusca da Posição de Rolagem (Scroll Jump) ao Navegar de Volta para a Biblioteca
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/App.tsx:452, 492, 994, 1001, 1008`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx#L452)
* **Diagnóstico Técnico da Causa-Raiz:**
  Nos métodos de retorno (`handleBackToPlaylists`, `handleBackToAlbums`, `handleBackFromArtist`), o código executa `mainScrollRef.current.scrollTop = 0; playlistScrollPosRef.current = 0;`. Se o usuário rolou a grade da biblioteca até a 50ª playlist ou álbum, clicou para visualizar os detalhes e depois clicou no botão "Voltar", ele é abruptamente jogado para o topo da biblioteca. Essa perda de contexto de rolagem quebra o fluxo de navegação e obriga o usuário a rolar toda a lista novamente.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Manter uma referência dedicada `libraryScrollPosRef` que registra o `scrollTop` antes de entrar em qualquer detalhe (Álbum/Playlist/Artista). Ao voltar para a biblioteca (`selectedPlaylist = null`, etc.), restaurar o valor previamente salvo em `libraryScrollPosRef.current`.
  ```tsx
  // Armazena antes de navegar para o detalhe:
  libraryScrollPosRef.current = mainScrollRef.current?.scrollTop || 0;
  // Ao voltar:
  if (mainScrollRef.current) mainScrollRef.current.scrollTop = libraryScrollPosRef.current;
  ```

---

### 95. Troca Instantânea de Faixa no PlayerBar e NowPlayingDrawer sem Transição Suave de Metadados
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/components/Player/PlayerBar.tsx:74-122`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx#L74-L122), [`desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx:165-208`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/NowPlayingDrawer/NowPlayingDrawer.tsx#L165-L208)
* **Diagnóstico Técnico da Causa-Raiz:**
  Quando a faixa atual é alternada (`currentTrack` muda), os elementos de texto (título, artista e álbum) e a imagem da capa do player inferior são substituídos instantaneamente. Em reprodutores modernos de áudio (Spotify, Apple Music), há um leve slide/fade horizontal ou vertical nos textos e um suave crossfade na capa para evitar que a troca de faixa produza um corte seco no olhar do usuário.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Atribuir `key={currentTrack?.id}` nos contêineres de texto com classes CSS de transição (`animate-in fade-in duration-250 slide-in-from-right-1`) e usar um componente de imagem com camada dupla de transição de opacidade para a arte da capa.

---

### 96. Desmontagem Instantânea sem Animação de Saída nos Menus de Contexto e Dropdown de Ordenação
* **Severidade:** `[Sugestão]`
* **Localização:** [`desktop/src/components/ContextMenu/TrackContextMenu.tsx:68`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx#L68), [`desktop/src/components/ContextMenu/CollectionContextMenu.tsx:94`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/CollectionContextMenu.tsx#L94), [`desktop/src/App.tsx:1603-1642`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx#L1603-L1642)
* **Diagnóstico Técnico da Causa-Raiz:**
  Os menus de contexto e o seletor de ordenação da biblioteca entram com classe `animate-in fade-in zoom-in-95 duration-100`. No entanto, ao clicar fora ou pressionar `Escape`, os componentes são destruídos imediatamente por retorno de `null` ou flag booleana direta, sem qualquer animação de saída. O menu simplesmente desaparece no ar sem fade-out.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Adicionar um pequeno delay de fechamento com classe de saída `animate-out fade-out zoom-out-95 duration-100` acionada antes da desativação do estado no componente pai.

---

### 97. Flash Visual e Pop-In Abrupto no Carregamento de Capas na Grade da Biblioteca
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/components/MainView/AlbumCard.tsx:110-124`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumCard.tsx#L110-L124), [`desktop/src/components/MainView/PlaylistGridView.tsx:252-263`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistGridView.tsx#L252-L263)
* **Diagnóstico Técnico da Causa-Raiz:**
  As tags `<img>` dos cards de álbuns e playlists utilizam `loading="lazy"`, mas são renderizadas sem controle de opacidade progressiva durante o download. Assim que a rede conclui a requisição da imagem, a capa é estalada diretamente sobre a tela, gerando uma sensação de cintilação (*image flicker*) durante a rolagem de listas densas.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Incluir controle de estado `isLoaded` via evento `onLoad`, iniciando a imagem com `opacity-0` e transitando para `opacity-100 transition-opacity duration-300 ease-out` assim que estiver completamente desenhada na memória gráfica.
  ```tsx
  const [isLoaded, setIsLoaded] = useState(false);
  <img
    onLoad={() => setIsLoaded(true)}
    className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
  />
  ```

---

### 98. Expansão Repentina da Biografia do Artista sem Transição de Altura Suave (Accordion)
* **Severidade:** `[Sugestão]`
* **Localização:** [`desktop/src/components/MainView/ArtistDetailView.tsx:343-360`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/ArtistDetailView.tsx#L343-L360)
* **Diagnóstico Técnico da Causa-Raiz:**
  Ao clicar em "Ler biografia completa", o estado `isBioExpanded` é alternado, trocando o estilo do texto entre a classe `line-clamp-2` e texto completo sem corte. Como a propriedade `line-clamp` é binária, a altura do cabeçalho do artista salta bruscamente de ~40px para 200px+, causando um solavanco de layout (*layout shift*) desconfortável.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Substituir a alternância direta de classes por um contêiner animado usando CSS Grid (`grid-template-rows: 0fr` para `1fr`) com `transition: grid-template-rows 300ms ease-out`, permitindo que a biografia se expanda e recolha com amortecimento suave.

---

### 99. Alternância Brusca do Accordion de Músicas Anteriores na Fila de Reprodução
* **Severidade:** `[Sugestão]`
* **Localização:** [`desktop/src/components/QueueView/QueueView.tsx:34-48`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx#L34-L48)
* **Diagnóstico Técnico da Causa-Raiz:**
  A seção "Músicas que Já Passaram" é renderizada condicionalmente via `{showPastTracks && <div className="space-y-1 ...">}`. Ao expandir ou recolher a lista de músicas anteriores, o bloco é inserido/removido subitamente do DOM sem animação de colapso, deslocando a música atual e as próximas faixas de forma instantânea.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Implementar um contêiner colapsável animado com transição de altura e opacidade (`transition-[max-height,opacity] duration-300 ease-in-out`), garantindo abertura e fechamento fluidos ao clicar no cabeçalho de faixas passadas.

---

### 100. Transição Seca entre Estados de Carregamento, Vazio e Exibição de Letras
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/components/LyricsView/LyricsView.tsx:129-170`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/LyricsView/LyricsView.tsx#L129-L170)
* **Diagnóstico Técnico da Causa-Raiz:**
  A visão de letras transita entre o indicador de busca (`isLoadingLyrics`), estado vazio de letra não encontrada e a folha de estrofes sincronizadas através de operadores ternários. No instante em que as letras são retornadas da API, o spinner desaparece e dezenas de versos surgem de uma vez só sem qualquer transição de fade-in, gerando um impacto visual desagradável.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Aplicar animações de entrada com fade suave (`animate-in fade-in duration-300 ease-out`) no bloco que contém as linhas da letra e no bloco de estado vazio.

---

### 101. Scrubber da Linha do Tempo Estático sem Expansão no Hover e sem Tooltip de Pré-Visualização Temporal
* **Severidade:** `[Sugestão]`
* **Localização:** [`desktop/src/components/Player/TimelineScrubber.tsx:84-108`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx#L84-L108)
* **Diagnóstico Técnico da Causa-Raiz:**
  A barra de progresso da música utiliza um `<input type="range">` com altura fixa e visual estático (`h-1`). Ao passar o mouse sobre ela, a trilha não aumenta de espessura para facilitar o clique, não emite brilho de destaque e não exibe um balão flutuante (tooltip) informando qual timestamp (ex: `02:45`) o usuário alcançará se clicar ou arrastar naquele ponto.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Adicionar efeito de hover suave que expanda a altura da barra (`group-hover:h-2 transition-all duration-150`) e calcular a posição do cursor via `onPointerMove` para exibir um tooltip flutuante animado com a minutagem exata da posição sob o mouse.

---

### 102. Botão de Play/Pause Alternando Ícones de Forma Brusca sem Micro-Animação de Transição ou Escala
* **Severidade:** `[Sugestão]`
* **Localização:** [`desktop/src/components/Player/PlayerBar.tsx:165-170`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/PlayerBar.tsx#L165-L170), [`desktop/src/components/MainView/AlbumCard.tsx:185-189`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumCard.tsx#L185-L189)
* **Diagnóstico Técnico da Causa-Raiz:**
  Ao pausar ou retomar a reprodução, o botão central substitui imediatamente o elemento `<Play />` por `<Pause />`. A troca seca de ícone carece de micro-animação (como uma breve redução de escala seguida de expansão elástica `scale-90 -> scale-100` ou leve rotação/morfismo), resultando em uma interface que parece rígida aos comandos do usuário.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Adicionar uma chave animada nos ícones de reprodução (`key={isPlaying ? 'pause' : 'play'}`) com classe `animate-in zoom-in-75 duration-150`, conferindo feedback elástico e agradável ao toque.

---

### 103. Troca Brusca de Abas no Modal de Configurações sem Transição de Conteúdo entre Seções
* **Severidade:** `[Sugestão]`
* **Localização:** [`desktop/src/components/SettingsModal/SettingsModal.tsx:210-245`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/SettingsModal/SettingsModal.tsx#L210-L245)
* **Diagnóstico Técnico da Causa-Raiz:**
  Dentro do `SettingsModal`, a alternância entre abas verticais (*Áudio*, *Aparência*, *Sistema*, *Armazenamento*, *Sobre*) substitui o painel direito instantaneamente. Não há transição de fade ou deslocamento horizontal sutil, dando a impressão de cortes bruscos ao navegar pelas preferências do aplicativo.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Aplicar `key={activeTab}` com classe `animate-in fade-in slide-in-from-right-1 duration-150 ease-out` no contêiner de opções da aba selecionada.

---

### 104. Exposição de Erros Técnicos Crús e Strings JSON de Status 403 na Interface do Usuário
* **Severidade:** `[Crítico]`
* **Localização:** [`desktop/src/components/Modals/ConfirmDeleteModal.tsx:50, 95`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Modals/ConfirmDeleteModal.tsx#L50), [`desktop/src/App.tsx:1346-1355`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx#L1346-L1355)
* **Diagnóstico Técnico da Causa-Raiz:**
  Quando operações assíncronas do backend falham (ex: tentativa de exclusão de playlist com permissão negada no YouTube Music), mensagens técnicas do protocolo HTTP ou estruturas JSON completas como `YouTube Music retornou status 403 Forbidden ao excluir playlist: { "error": { "code": 403, "message": "The caller does not have permission" ... } }` são expostas integralmente ao usuário final no modal e no banner de erro do topo. Isso degrada a experiência do usuário, expõe detalhes internos de API e quebra a harmonia visual da UI.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Criar um sanitizador e tradutor de erros centralizado no frontend (`humanizeApiError(error)`), interceptando erros com códigos 403, 404 ou payloads JSON e traduzindo-os para mensagens elegantes e compreensíveis (ex: *"Permissão negada: esta playlist pertence a outro canal e só pode ser removida da sua biblioteca pelo YouTube Music."*).
  ```typescript
  export function humanizeApiError(rawError: unknown): string {
    const errStr = String(rawError || '');
    if (errStr.includes('403') || errStr.includes('PERMISSION_DENIED')) {
      return 'Você não possui permissão para executar esta ação nesta playlist.';
    }
    return 'Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.';
  }
  ```

---

### 105. Drag & Drop na Fila de Reprodução com Fantasma Translúcido Nativo HTML5 e Baixa Fluidez
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/components/QueueView/QueueView.tsx:198-231`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx#L198-L231)
* **Diagnóstico Técnico da Causa-Raiz:**
  A fila de reprodução ainda utiliza o mecanismo clássico `draggable` do HTML5. Nos navegadores e no WebKit do Tauri, o drag nativo do HTML5 gera uma miniatura estática semitransparente, com taxa de amostragem truncada e sem feedback tátil moderno. Isso contrasta diretamente com as listas de playlists (`VirtualizedTrackList.tsx`) e da barra lateral (`Sidebar.tsx`), que já utilizam arrasto fluido por Pointer Events a 144 FPS com card flutuante acelerado por GPU.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Substituir o drag HTML5 em `QueueView.tsx` pelo padrão determinístico de Pointer Events (`onPointerDown`, `setPointerCapture`, `onPointerMove`), renderizando um card flutuante via `createPortal` com `transform: translate3d(...)` para garantir consistência de 144 FPS em todas as listas reordenáveis do player.

---

### 106. Potencial Race Condition ao Selecionar Rapidamente Múltiplos Artistas ou Álbuns Consecutivos
* **Severidade:** `[Aviso]`
* **Localização:** [`desktop/src/App.tsx:511-539, 564-580`](file:///d:/progrmação/programas/TetPlayer/desktop/src/App.tsx#L511-L539)
* **Diagnóstico Técnico da Causa-Raiz:**
  Em `handleSelectAlbum` e `handleSelectArtist`, o código dispara `invoke<AlbumDetail>("get_album_details")` e `invoke<ArtistDetail>("get_artist_details")` de forma assíncrona. Caso o usuário clique em um artista e rapidamente clique em outro antes que a primeira resposta retorne, a resposta do primeiro artista (se demorar mais) pode resolver depois e sobrescrever o estado `artistDetail`, fazendo com que a tela do Artista B exiba as músicas do Artista A.
* **Diretriz de Correção (Instrução ao Desenvolvedor):**
  Utilizar um contador de versão ou identificador único de requisição (`activeRequestRef.current = targetId`) e verificar se o ID retornado pela Promise ainda coincide com o item atualmente selecionado antes de atualizar o estado do React.
  ```typescript
  const currentRequestId = artist.id || artist.name;
  activeArtistRequestIdRef.current = currentRequestId;
  const detail = await invoke<ArtistDetail>('get_artist_details', { ... });
  if (activeArtistRequestIdRef.current === currentRequestId) {
    setArtistDetail(detail);
  }
  ```

---

## 3. Histórico Consolidado e Ordenado de Itens Resolvidos (#01 a #91)

> [!NOTE]
> Todos os **91 itens** abaixo foram diagnosticados, corrigidos, testados e validados no TetPlayer Desktop. A numeração foi integralmente saneada, deduplicada e organizada em ordem sequencial estrita para consulta histórica.

### Índice Rápido do Histórico de Correções

| Faixa | Ciclo / Milestone | Principais Correções e Melhorias |
| :---: | :--- | :--- |
| **#01 – #27** | **Fundação, Mini Player & Integração OS (`v0.1.x`)** | Zero interrupção de áudio no Mini Player, System Tray, Rádio Contínua, Espectro, SQLite Stats, SMTC Throttling, Autoscroll de Letras, `scrollMargin`, Atalhos `J`/`K`/`Shift+Up`, WAI-ARIA, Modularização, Virtualização, Capas HD 800x800, Transparência e Snap Magnético Win32. |
| **#28 – #47** | **Isolamento de CPU, Reducer, Temas & Release `v1.0.0`** | Correção de Seek SMTC, `React.memo` global, GPU `scaleY`, Cache LRU, LRC Multi-timestamp, Eliminação do Startup Blank Frame, Fim dos Hollow Corners, Menu de Contexto, Motion Cover 3D, Layout Proporcional de 3 Colunas, `SettingsModal`, Drag & Drop na Fila, Teclas Globais de Mídia, Share Cards PNG e 8 Paletas de Tema. |
| **#48 – #65** | **Auto-Update, Login Nativo, Letras Cinéticas & Gaveta 144 FPS (`v1.1` → `v1.3.3`)** | Ciclo determinístico de Crossfade, Login Google Nativo via Webview, Auto-Update Minisign (`createUpdaterArtifacts`), Scroll Cinético com Spring Bounce nas Letras, Fallback 404 de Capas, Debounce de Seek no Scrubber, Teto LRU de Letras, Pasta Portátil `data/`, Fechamento Automático da Gaveta na Sidebar, Busca/Ordenação em Playlists e Animação Contínua GPU na Gaveta sem Reflow. |
| **#66 – #91** | **Motor de Áudio Nativo, Pool HTTP, Álbuns, Playlists 144 FPS & Saneamento Completo (`v1.3.4` → `v1.4.0+`)** | Paginação de 2.500 faixas, Motor de Áudio Nativo Híbrido (`AudioEngine`), Proteção contra Race Condition no Next Track Thrashing, Supressão de Volume Flooding na Web Audio API, `LyricLineRow` memoizado, SQLite WAL + `OnceLock`, Pausar Visualizer em Background, Pool Global `HTTP_CLIENT` (`LazyLock`), Suporte Completo a Álbuns + Paginação, CRUD Bidirecional de Playlists, Drag & Drop a 144 FPS com Card Flutuante, Telemetria Completa no SQLite (`recordTrackPlayed`), Fim de Stale Closure no System Tray/Media Keys, Preservação de Sessão no `clearCache` e Desacoplamento de Contexto (`triggerTrackContextMenu`). |

---

### Catálogo Sequencial Completo (#01 a #91)

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

#### 81. Registro Completo no Histórico SQLite (`recordTrackPlayed`) ao Avançar Faixas Automaticamente, pela Fila ou Botões Next/Prev
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx).
* **Diagnóstico Anterior:** `invoke("record_track_played", { track })` era chamado apenas em `playTrackWithQueue`, omitindo faixas avançadas automaticamente (`handleNextTrack`), pelos botões Next/Prev (`handlePrevTrack`) ou pela gaveta da fila (`handlePlayFromQueue`).
* **Solução Implementada:** Criado o helper central `recordTrackPlayed(track)` e integrado em todas as transições de reprodução (`playTrackWithQueue`, `handlePlayFromQueue`, `handleNextTrack` incluindo repeat-one/repeat-all/rádio e `handlePrevTrack`), garantindo 100% de precisão no Resumo Musical.

#### 82. Eliminação de Stale Closure no Listener Global `tray-action` e Estabilização de `togglePlayPause`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`useYouTubePlayer.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useYouTubePlayer.ts).
* **Diagnóstico Anterior:** `togglePlayPause` lia `isPlaying` diretamente do estado dentro de uma closure estática capturada por `listen("tray-action", ..., [])`, avaliando `isPlaying` sempre como `false` ao usar teclas globais de mídia (`MediaPlayPause`).
* **Solução Implementada:** Refatorado `togglePlayPause` com `useCallback` lendo e atualizando `isPlayingRef.current` sincronamente, além de `trayHandlersRef` em `PlayerContext.tsx` e `isMiniPlayerRef` puro em `toggleMiniPlayer`.

#### 83. Preservação da Sessão Google (`tetplayer_google_session`) em `clear_all_cache` e Hidratação de Álbuns no `LocalCacheService`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`cache.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/services/cache.ts).
* **Solução Implementada:** Adicionada cláusula `WHERE key != 'tetplayer_google_session'` em `clear_all_cache()` (validada com teste unitário em Rust), hidratação de `ALBUMS_CACHE_KEY` em `initDbCache()` e limpeza de `saveAlbumLruList([])` em `clearCache()`.

#### 84. Inicialização Única de Schema SQLite via `OnceLock<PathBuf>` em `stats.rs` e Reuso de `HTTP_CLIENT` em `fetch_lyrics`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`stats.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/stats.rs), [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Solução Implementada:** `DB_SCHEMA_INIT: OnceLock<PathBuf>` garante que a criação de diretórios e as 6 instruções DDL `CREATE TABLE / INDEX IF NOT EXISTS` executem apenas uma vez por ciclo de vida do processo. Em `ytm.rs`, `fetch_lyrics` passou a reutilizar o singleton `HTTP_CLIENT` com `.timeout(Duration::from_secs(6))` por requisição.

#### 85. Desacoplamento de Contexto em `TrackRow` e `AlbumDetailView` (`triggerTrackContextMenu`) Preservando `React.memo`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlayerContext.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/context/PlayerContext.tsx), [`TrackRow.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/TrackRow.tsx), [`AlbumDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/AlbumDetailView.tsx).
* **Solução Implementada:** Criado o dispatcher estático `triggerTrackContextMenu` conectado ao `PlayerProvider`, removendo `usePlayer()` de dentro de `TrackRow` e `AlbumDetailView` para que mudanças em `volume`, `isNowPlayingOpen`, `isShuffle` ou `repeatMode` nunca forcem re-render das linhas.

#### 86. Captura de Ponteiro (`setPointerCapture`) e Listener Global de Soltura no `TimelineScrubber`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`TimelineScrubber.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/Player/TimelineScrubber.tsx).
* **Solução Implementada:** Adicionado `e.currentTarget.setPointerCapture(e.pointerId)` no `handlePointerDown` e listeners globais `pointerup` / `pointercancel` em `window` enquanto `isDragging === true`, impedindo travamento do cronômetro ao soltar o clique fora da barra de 4px.

#### 87. Isolamento de Clique (`e.stopPropagation()`) no Botão `⋮` de `pastTracks` e Otimização de Viewport na `QueueView`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`QueueView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/QueueView/QueueView.tsx).
* **Solução Implementada:** Adicionado `e.stopPropagation()` ao botão `MoreVertical` das faixas passadas (impedindo que abrir o menu de contexto inicie a música) e aplicado `[content-visibility:auto]` + `loading="lazy"` nos itens da fila para renderização instantânea mesmo em filas com centenas de músicas.

#### 88. Atualização Dinâmica de `scrollMargin` via `ResizeObserver` na `VirtualizedTrackList`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`VirtualizedTrackList.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/VirtualizedTrackList.tsx).
* **Solução Implementada:** Integrado `ResizeObserver` e listener de `resize` no `useLayoutEffect` da lista virtualizada para recalcular `scrollMargin` automaticamente sempre que o cabeçalho da playlist/busca mudar de altura.

#### 89. Eliminação do Falso Positivo de `isSeekJump` na Troca de Faixa em `useLyrics`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`useLyrics.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useLyrics.ts).
* **Solução Implementada:** Resetado `lastActiveIndexRef.current = -1` e `setActiveLyricIndex(-1)` no início do efeito de troca de `currentTrack?.id`, fazendo a primeira estrofe da nova música focar a 0ms sem debounce de seek.

#### 90. Paginação por Continuation Token e Extração de `release_date`/`copyright` em `get_album_details`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`ytm.rs`](file:///d:/progrmação/programas/TetPlayer/desktop/src-tauri/src/ytm.rs).
* **Solução Implementada:** Adicionado loop de paginação (`extract_continuation_token`, até 10 páginas) em `get_album_details` para álbuns extensos/multi-disco e extração de `publishDate`/`uploadDate` e linhas de copyright (`℗`/`©`) no `extract_album_header`.

#### 91. Guarda de `inert`/Modais no Atalho `Ctrl+F`, Link `music.youtube.com` e Cleanup em `useMediaSession`
* **Status:** `[Resolvido]` ✅ | **Localização:** [`PlaylistDetailView.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/MainView/PlaylistDetailView.tsx), [`TrackContextMenu.tsx`](file:///d:/progrmação/programas/TetPlayer/desktop/src/components/ContextMenu/TrackContextMenu.tsx), [`useMediaSession.ts`](file:///d:/progrmação/programas/TetPlayer/desktop/src/hooks/useMediaSession.ts).
* **Solução Implementada:** Ignorado o atalho `Ctrl+F` quando a view está `inert` (gaveta aberta) ou há um modal `[role='dialog']` aberto; atualizado o link copiado para `https://music.youtube.com/watch?v=${track.id}`; e adicionado cleanup de todos os action handlers da `navigator.mediaSession` na desmontagem.
