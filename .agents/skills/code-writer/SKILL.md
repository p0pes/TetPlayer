---
name: code-writer
description: Diretrizes avançadas de engenharia de software sênior para implementação, refatoração de código e arquitetura sem regressões no TetPlayer.
---

# 🚀 Skill: Code Writer Sênior (Engenharia de Software de Alta Performance)

Esta skill define as diretrizes rigorosas para escrita de código em todo o ecossistema **TetPlayer** (Desktop Tauri v2/React e futuro Mobile Android).

Consulte o documento normativo completo em:
👉 [`.agents/rules/code_writer.md`](file:///d:/progrmação/programas/TetPlayer/.agents/rules/code_writer.md)

### Resumo Operacional:
1. **Zero Regressões:** O código em produção nunca é quebrado.
2. **Resiliência Assíncrona:** Toda promise possui `try/catch` e fallback gracioso; zero memory leaks com cleanups pontuais em `useEffect`.
3. **Isolamento de Alta Frequência:** Atualizações contínuas de áudio/progresso não re-renderizam a árvore da UI.
4. **Fidelidade ao Design System:** Paleta dark profunda, glow Aurora acelerado por GPU e suporte obrigatório aos 4 estados de UI (*Loading*, *Empty*, *Error*, *Success*).
5. **Acessibilidade Universal:** Navegação por teclado com tecla `Escape`, `Tab` e atributos ARIA semânticos.
6. **Backend Rust Seguro:** Zero `.unwrap()` em dados externos; concorrência sem deadlocks com escopos mínimos de Mutex.
7. **Pergunte Antes de Decisões Críticas:** Alinhe opções arquiteturais conflitantes com o desenvolvedor antes de implementar.
