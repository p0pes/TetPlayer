# 📚 Central de Documentação Técnica — TetPlayer

Bem-vindo à documentação oficial do ecossistema **TetPlayer**, um reprodutor e hub multimídia ultra-leve e integrado, projetado para alta performance, fidelidade visual de nível comercial e consumo mínimo de recursos de hardware.

---

## 🗂️ Estrutura da Documentação

A documentação do projeto está dividida por plataformas e domínios de arquitetura para facilitar a manutenção e o desenvolvimento independente:

```
docs/
├── README.md                  <- Índice geral e guia da documentação (este arquivo)
├── ARQUITETURA.md             <- Especificação técnica e arquitetura do ecossistema (Desktop + Mobile)
├── mockup_preview.html        <- Protótipo visual e estudo de design da interface
│
├── desktop/                   <- Documentação específica do TetPlayer Desktop (Tauri v2 + React 19)
│   ├── SUGESTOES.md           <- Roadmap estratégico, pesquisa de mercado, 41 itens concluídos e sugestões v1.1+
│   └── CORRECOES.md           <- Relatório de auditoria técnica contínua, histórico de bugs e débitos técnicos
│
└── mobile/                    <- [Planejado] Documentação do TetPlayer Mobile (Android Nativo / Jetpack Compose)
    ├── SUGESTOES.md           <- Roadmap e features planejadas para o app móvel
    └── CORRECOES.md           <- Auditorias e correções da versão mobile
```

---

## 🖥️ 1. Módulo Desktop (`desktop/`)

O **TetPlayer Desktop** é a aplicação principal para computador, desenvolvida em **Tauri v2 (Rust)** com frontend em **React 19 + TypeScript + Tailwind CSS v4**.

* 🚀 **[Roadmap Estratégico e Sugestões Desktop](file:///d:/progrmação/programas/TetPlayer/docs/desktop/SUGESTOES.md):**  
  Contém o diagnóstico da versão atual, pesquisa de mercado, lista de sugestões ativas em aberto (Login Google Webview, Downloads offline, edição avançada de playlists, equalizador, etc.) e o histórico consolidado de 41 otimizações entregues na Release v1.0.0.
* 🛡️ **[Relatório de Auditoria e Correções Desktop](file:///d:/progrmação/programas/TetPlayer/docs/desktop/CORRECOES.md):**  
  Histórico e registro técnico de todas as auditorias de código realizadas, cobrindo segurança, bugs, memory leaks, acessibilidade e performance visual.

---

## 📱 2. Módulo Mobile (`mobile/`) *(Próxima Fase)*

O **TetPlayer Mobile** será o cliente complementar desenvolvido em **Kotlin nativo com Jetpack Compose e AndroidX Media3 (ExoPlayer)**, funcionando como receptor de áudio em segundo plano com tela apagada e sincronização local via WebSocket.

* Documentos dedicados de sugestões e correções mobile serão alocados em `docs/mobile/` conforme o desenvolvimento avançar.

---

## 🏛️ 3. Arquitetura Global do Ecossistema

* 📐 **[Especificações Técnicas de Arquitetura (`ARQUITETURA.md`)](file:///d:/progrmação/programas/TetPlayer/docs/ARQUITETURA.md):**  
  Explica o fluxo de comunicação entre PC Hub e Smartphone Receptor, autenticação segura, tokens de sessão e decisão de stacks tecnológicas.

---

## 🤖 4. Governança e Regras de Desenvolvimento (`.agents/`)

O desenvolvimento e a manutenção contínua do TetPlayer são orquestrados por diretrizes avançadas configuradas em `.agents/`:
* ✍️ **Code Writer (`.agents/rules/code_writer.md`):** Regra permanente e inegociável de engenharia de software sênior (zero regressões, tipagem estrita, tratamento de erro resiliente e fidelidade ao design system).
* 🔍 **Reviewer (`.agents/skills/reviewer/SKILL.md`):** Habilidade automática especializada em inspeção de segurança, auditoria de performance, UX/UI e atualização do relatório `CORRECOES.md`.
