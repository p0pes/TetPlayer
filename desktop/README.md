# 🎧 TetPlayer Desktop — v2.0.2 (Release Oficial)

> **O Reprodutor de Música Ultraleve de Alta Fidelidade para Windows.**  
> Desenvolvido com **Tauri v2 (Rust)**, **React 19**, **TypeScript** e **Tailwind CSS v4**.

---

## 🌟 Visão Geral

O **TetPlayer Desktop** foi concebido para resolver o problema clássico de reprodutores pesados e navegadores web consumindo centenas de megabytes de memória RAM apenas para tocar música em segundo plano.

Combinando um backend compilado nativo em **Rust** com o motor de interface acelerado por GPU do WebView2 no Windows, o TetPlayer oferece a fidelidade estética e o catálogo infinito do YouTube Music consumindo uma fração mínima dos recursos de sistema (`< 50MB de RAM`).

---

## 🚀 Principais Funcionalidades

### 🎨 Experiência Visual & Design System
* **Dynamic Aurora Glow:** Fundo atmosférico tridimensional gerado via CSS `@property` interpolando suavemente em 60/144 FPS as paletas de cores da arte do álbum.
* **Capas Animadas 3D (Motion Cover estilo Apple Music):** Efeito cinemático com perspectiva tridimensional reativa ao mouse, feixe de luz especular contínuo e retorno com curva de amortecimento sedosa (`cubic-bezier`).
* **Visualizador de Espectro Harmônico:** 4 estilos visuais selecionáveis (Barras de Estúdio, Blocos Hi-Fi em matriz de LEDs segmentados, Gradiente Neon e Pulso Central).
* **8 Temas de Cores Vibrantes:** TetPlayer Ruby, Neon Rose, Solar Gold, Sunset Orange, Cyber Lime, Emerald Wave, Ocean Blue e Cyber Indigo.

### ⚡ Performance & Arquitetura de Ponta
* **Virtualização de Listas de Alta Frequência:** Integração com `@tanstack/react-virtual` para rolagem fluida travada a **144 FPS** mesmo em bibliotecas com milhares de faixas.
* **Persistência em SQLite com Compressão Deflate (`flate2`):** Histórico de reprodução e cache permanente indexados localmente no arquivo nativo `tetstats.db` com compactação transparente reduzindo o uso de disco em até 75%.
* **Desacoplamento de Alta Frequência:** Linha do tempo de áudio (`TimelineScrubber`) isolada em `PlaybackProgressContext`, mantendo a interface principal 100% estática durante a reprodução.
* **Pipeline de Pré-Carregamento Antecipado (Gapless):** Ao atingir 88% da faixa atual, pré-carrega letras e paletas da próxima música da fila.

### 🎮 Ergonomia de Reprodução & Desktop
* **Reordenação da Fila via Drag & Drop:** Arraste e solte qualquer música da lista "A Seguir" na gaveta de reprodução com alça tátil e feedback visual suave.
* **Mini Player Flutuante (Always-on-Top / PiP):** Janela compacta de 380x140px com controles essenciais, espectro e **encaixe magnético retrátil de 38x90px** nas bordas da tela.
* **Minimizar para a Bandeja do Sistema (System Tray):** Ícone na barra de tarefas com menu nativo completo de atalhos rápidos e reprodução ininterrupta em segundo plano.
* **Teclas Multimídia Globais do Sistema Operacional:** Suporte nativo via `tauri-plugin-global-shortcut` para controlar músicas (`Play/Pause`, `Próxima`, `Anterior`) mesmo enquanto joga ou trabalha em outra janela.
* **Menu de Contexto Flutuante por Faixa:** Ações de *Tocar a Seguir*, *Adicionar ao Fim da Fila*, *Iniciar Rádio Contínua*, *Copiar Link do YouTube* e *Buscar Artista*.
* **Rádio Contínua & Autoplay Infinito:** Ao término da fila, consulta automaticamente o endpoint `/next` do InnerTube e anexa recomendações sem pausar o som.

### 📊 Painel de Estatísticas TetStats & Compartilhamento Social
* **Resumo Musical Completo:** Contagem de reproduções, horas totais ouvidas, artistas únicos e pódio dos top artistas e músicas com filtros por período (7 dias, 30 dias, todo o histórico).
* **Gerador de Cartão Artístico (Share Card PNG):** Renderizador em Canvas 2D exportando imagens em alta resolução (1200x675) prontas para compartilhar no Discord, Twitter/X ou Instagram, com botão de cópia direta para a área de transferência.

---

## ⌨️ Tabela de Atalhos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Espaço` / `MediaPlayPause` | Reproduzir / Pausar |
| `K` / `MediaTrackNext` / `Ctrl+Alt+Right` | Próxima Faixa |
| `J` / `MediaTrackPrevious` / `Ctrl+Alt+Left` | Faixa Anterior |
| `Seta Esquerda` / `Seta Direita` | Retroceder / Avançar 5 segundos |
| `Seta Cima` / `Seta Baixo` | Aumentar / Diminuir Volume (5%) |
| `M` | Alternar Mudo (Mute) |
| `S` | Alternar Modo Aleatório (Shuffle) |
| `R` | Ciclar Repetição (Desativado → Tudo → Uma) |
| `Shift + Seta Cima` | Abrir / Fechar Gaveta de Reprodução |
| `Ctrl + ,` | Abrir Modal de Configurações |
| `Arrastar & Soltar` | Reordenar sequência da fila na gaveta |

---

## 🛠️ Stack Tecnológica

* **Runtime de Sistema:** [Tauri v2](https://v2.tauri.app/) (Rust 2024 Edition)
* **Frontend:** React 19, TypeScript, [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
* **Componentes & Ícones:** [Lucide React](https://lucide.dev/)
* **Virtualização de DOM:** [@tanstack/react-virtual](https://tanstack.com/virtual/latest)
* **Banco de Dados Local:** SQLite embutido via `rusqlite` com compressão `flate2` (Deflate)
* **Autenticação Segura:** Login próprio nativo com Conta Google via Webview isolada + SAPISIDHASH
* **Testes Automatizados:** [Vitest](https://vitest.dev/), Testing Library, `cargo test`

---

## 📦 Como Executar e Compilar

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 20 ou superior)
* [Rust & Cargo](https://rustup.rs/) (ferramentas de compilação C++ do Visual Studio no Windows)

### Desenvolvimento Local
```bash
# Entrar no diretório desktop
cd desktop

# Instalar dependências
npm install

# Iniciar ambiente de desenvolvimento (Vite + Tauri)
npm run tauri dev
```

### Executar Testes Automatizados
```bash
# Testes do Frontend (Vitest)
npm test

# Testes do Backend (Rust)
cd src-tauri && cargo test
```

### Gerar Pacote de Produção (.msi / .exe)
```bash
npm run tauri build
```

---

## 📄 Licença e Uso Pessoal
Desenvolvido como projeto de engenharia de software para reprodução de áudio pessoal integrada. Todos os direitos reservados.
