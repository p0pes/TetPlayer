# 🤖 TetPlayer — Diretriz Operacional & Protocolo para Agentes de IA (`AGENTS.md`)

> **Propósito do Documento:** Este arquivo é o contrato operacional definitivo e o manual de conduta técnica para qualquer assistente ou agente autônomo de inteligência artificial (Antigravity, Cursor, Claude Code, GitHub Copilot, Codex, etc.) atuando no repositório **TetPlayer**.  
> **Hierarquia:** As diretrizes deste arquivo são de cumprimento estrito e mandatário.

---

## 🧭 1. Visão Geral do Projeto e Escopo de Atuação

O **TetPlayer** é um reprodutor de música desktop de alta fidelidade e consumo ultraleve (`< 50MB de RAM`, `< 1% de CPU`), desenvolvido para Windows com o catálogo e identidade visual dark inspirada no YouTube Music Premium.

* **Stack Principal:**
  - **Backend Nativo:** Tauri v2 + Rust (`desktop/src-tauri/`) — Tokio, SQLite (`flate2`), Web Audio DSP, InnerTube API e atalhos globais de hardware do Windows.
  - **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Vite (`desktop/src/`) — Virtualização a 144 FPS (`@tanstack/react-virtual`), isolamento atômico de progresso (`PlaybackProgressContext`) e fundo dinâmico Aurora (`CSS @property`).
* **Escopo de Atuação dos Agentes:**
  - 🟢 **100% focado no Desktop:** Todas as alterações devem ocorrer estritamente em `desktop/` e `desktop/src-tauri/`.
  - 🔴 **Mobile fora de escopo:** O diretório `mobile/` está reservado e **não** deve ser alterado pelos agentes.

---

## ⛔ 2. Mandamentos Inegociáveis (Red Lines)

1. **Inviolabilidade de Arquivos Protegidos:**
   - O arquivo `docs/desktop/anotacoes.md` é **privado e de uso pessoal do desenvolvedor**.
   - É **terminantemente proibido** ler, alterar, adicionar ao stage (`git add`) ou commitar `docs/desktop/anotacoes.md` em qualquer circunstância.
   - Antes de qualquer commit, valide sempre com `git status` que esse arquivo permanece como `Untracked`.

2. **Zero Regressões de Performance (Filosofia "Clean, Simples e Leve"):**
   - O aplicativo prioriza leveza extrema. Efeitos e animações pesadas são expressamente descartados.
   - Animações devem ser **sutis, leves e não-intrusivas** (slides simples e fades com GPU acceleration).
   - É **proibido** animar propriedades que provoquem recálculo de geometria e layout thrashing (`width`, `height`, `margin`, `padding`, `top`). Utilize exclusivamente `transform` (`translate3d`, `scale`) e `opacity`.
   - Mantenha a interface travada a **144 FPS**.

3. **Isolamento de Alta Frequência:**
   - O avanço do tempo de áudio (`currentTime` a cada 80ms) **jamais** deve forçar a re-renderização de componentes irmãos ou da `PlayerBar`.
   - Sempre isole componentes de tick contínuo usando `PlaybackProgressContext` ou referências em nós DOM.

4. **Resiliência do Motor de Áudio:**
   - Chamadas ao stream nativo (`AudioEngine`) devem conter fallback resiliente e transparente para o IFrame (`useYouTubePlayer`) sem interromper a reprodução e sem emitir logs de erro ruidosos na UI.

---

## 🌿 3. Política de Branches, Commits e Releases

### 3.1 Branches de Trabalho
* **`develop`:** Branch de desenvolvimento ativo. **Todas as tarefas cotidianas, correções de bugs e novas features devem ser implementadas e commitadas diretamente na `develop`**.
* **`main`:** Branch de produção e releases oficiais. **Nunca desenvolva diretamente na `main`**. A `main` só recebe código via merge fast-forward da `develop` no momento exato do lançamento de uma nova versão.

### 3.2 Padrão de Mensagens de Commit (Conventional Commits)
Use mensagens concisas em português seguindo o padrão:
* `feat(escopo): descrição da nova funcionalidade`
* `fix(escopo): descrição da correção de bug`
* `perf(escopo): otimização de performance ou memória`
* `chore(release): bump vX.Y.Z com descrição resumida`
* `docs(escopo): atualização de documentação`

### 3.3 Checklist Oficial de Lançamento de Release (SemVer)
Para promover uma nova versão para a `main`, o agente DEVE executar rigorosamente este checklist de 7 passos:

1. **Atualizar Manifestos de Versão (7 arquivos sincronizados):**
   - `desktop/package.json` (`version: "X.Y.Z"`)
   - `desktop/src-tauri/Cargo.toml` (`version = "X.Y.Z"`)
   - `desktop/src-tauri/tauri.conf.json` (`version: "X.Y.Z"`)
   - `desktop/src/services/updater.ts` (`APP_VERSION = "X.Y.Z"`)
   - `desktop/README.md` (título com a versão atualizada)
   - `desktop/src/services/__tests__/updater.test.ts` (testes de SemVer atualizados para a nova versão)
2. **Sincronizar `Cargo.lock`:** Executar `cargo check --manifest-path desktop/src-tauri/Cargo.toml`.
3. **Executar a Suíte de Validação:**
   - Frontend: `npm test --prefix desktop -- --run` (todos os testes devem passar)
   - Backend: `cargo test --manifest-path desktop/src-tauri/Cargo.toml` (todos os testes devem passar)
   - Build: `npm run build --prefix desktop` (zero erros de TypeScript e bundling)
4. **Commitar o Bump na `develop`:**
   - `git add <arquivos>` (verifique `git status` para garantir que `anotacoes.md` não foi incluído)
   - `git commit -m "chore(release): bump vX.Y.Z com resumo das novidades"`
   - `git push origin develop`
5. **Promover para a `main`:**
   - `git checkout main`
   - `git merge develop`
   - `npm run build --prefix desktop` (validação de sanidade na branch principal)
   - `git push origin main`
6. **Criar e Enviar a Git Tag:**
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z` *(Dispara automaticamente o GitHub Actions `.github/workflows/release.yml` para compilar os instaladores Windows `.exe` e `.msi`)*
7. **Retornar para a `develop`:**
   - `git checkout develop`

---

## 🧭 4. Navegação no Código e Uso do Graphify

Este repositório utiliza um grafo de conhecimento persistente gerenciado pela ferramenta `graphify` em `graphify-out/`:

* **Antes de varrer arquivos cegamente:**
  - Para entender relacionamentos entre módulos: execute `graphify query "<pergunta>"` ou consulte `graphify-out/GRAPH_REPORT.md`.
  - Para caminhos entre componentes/serviços: execute `graphify path "<ComponenteA>" "<ComponenteB>"`.
  - Para conceitos específicos: execute `graphify explain "<Conceito>"`.
* **Após modificar arquivos de código na sessão:**
  - Execute sempre `graphify update .` antes de concluir a demanda para manter o grafo e o AST sincronizados sem custo de tokens.

---

## 🛠️ 5. Comandos Frequentes de Desenvolvimento

| Ação | Comando |
| :--- | :--- |
| **Executar Testes Unitários Frontend** | `npm test --prefix desktop -- --run` |
| **Executar Teste Específico Frontend** | `npm test --prefix desktop -- src/caminho/Arquivo.test.tsx --run` |
| **Executar Testes Backend Rust** | `cargo test --manifest-path desktop/src-tauri/Cargo.toml` |
| **Validar Tipos e Compilar Frontend** | `npm run build --prefix desktop` |
| **Validar Compilação do Rust** | `cargo check --manifest-path desktop/src-tauri/Cargo.toml` |
| **Atualizar Grafo de Conhecimento** | `graphify update .` |
| **Verificar Status do Git** | `git status` |

---

## 📚 6. Documentação Técnica de Referência

* [`docs/desktop/CORRECOES.md`](file:///d:/progrmação/programas/TetPlayer/docs/desktop/CORRECOES.md): **Registro mestre oficial de correções, diagnósticos técnicos e histórico consolidado**. Qualquer problema corrigido deve ser devidamente catalogado e marcado como resolvido neste relatório.
* [`docs/desktop/SUGESTOES.md`](file:///d:/progrmação/programas/TetPlayer/docs/desktop/SUGESTOES.md): **Roadmap arquitetural e catálogo de novas funcionalidades** organizado em 6 eixos estratégicos.
* [`docs/ARQUITETURA.md`](file:///d:/progrmação/programas/TetPlayer/docs/ARQUITETURA.md): Visão geral do ecossistema, diagrama de blocos e especificações de rede.
