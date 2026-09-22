# Topic Plan Contract

## Purpose

`plan/topic-plan-contract.md` 是 repository-wide 的 shared topic-plan contract。
它定義 `plan/<topic>/<topic>.plan.md` 的最小結構合約，讓 creator、reviewer、
prompt 與 workflow consumer 對 required sections、template fallback 與
contract-level blocking semantics 有單一 repo-visible authority。

本檔案是 repo governance artifact，不承載任何單一 topic 的 scope、status、
artifact payload、implementation steps 或 acceptance evidence。

## Authority Boundary

本檔案只負責下列 shared contract 面向：

- canonical required topic-plan sections
- topic-plan template 缺失或不可用時的 fallback behavior
- contract-level blocking semantics
- shared contract 與其他 planning surfaces 的責任分界

本檔案不負責：

- workflow lifecycle、phase routing、allowed transitions 的完整 execution contract
- 單一 topic 的 scope、status、artifact paths、locked decisions 或 release intent
- reviewer verdict payload 的 field-level schema
- correction artifact 的 detailed schema、example payload 或 topic-specific policy

## Canonical Required Sections

每個 `plan/<topic>/<topic>.plan.md` 都必須依下列 canonical order 包含這些章節：

1. `Goal / Outcome`
2. `Scope`
3. `Locked Decisions`
4. `Boundaries / Exclusions`
5. `Status / Allowed Transitions`
6. `Artifact Paths`
7. `Implementation Steps`
8. `Validation / Acceptance Checks`
9. `Reviewer Handoff`
10. `Post-merge / release actions`
11. `Open Questions / Unresolved Items`

若 topic 會影響 stable-library surfaces，例如 `README.md`、`VERSION`、release
timing 或 release notes，必須額外加入 `## Stable library metadata`。

上述 canonical order 只約束上列 required sections 彼此的相對順序。
author 可以為了可讀性、prompt compatibility 或 analysis metadata 承載，在這組
required sections 之前或之後加入額外章節，例如 `Inputs` 或 `Prerequisites`；
但不得因此更名 canonical required sections、移除其 requiredness，或打亂它們
彼此的相對順序。

上列 section names 是 shared contract authority。其他 workflow 或 skill surface
可以為了可讀性重述同一份 canonical list，但不得以不同名稱、不同順序或不同
requiredness 取代本檔案。

## Template Fallback Behavior

預設情況下，topic plan 應從 repository 的 topic-plan template 起稿。

若 template 缺失、不可讀、不可用，或當前執行環境無法安全取用 template，author
必須 fallback 到本檔案定義的 canonical required sections，並直接以這個 section
list 建立 `plan/<topic>/<topic>.plan.md`。

Fallback 規則如下：

- 不得因 template 不可用而發明新的 plan shape。
- 不得把 `plan/agent-handoff-workflow.md` 當成 shared topic-plan contract 的替代品。
- 只要本檔案與 workflow contract 可讀，template absence 本身不是可靜默跳過
  required sections 的理由。
- 若本檔案或 workflow contract 不可讀，則屬 contract-blocking condition，必須
  停止而不是猜測。

## Contract-level Blocking Semantics

contract-level blocking semantics 定義的是：任何會讓 topic plan 無法被合法 author、
review、或推進到下一個 workflow phase 的 shared contract failure。

當 blocking 發生時，行為取決於當前角色：

- creator / planning actor：停止並補齊上下文，或回報 blocked
- reviewer：回傳 `needs-rework` 或等效 blocking verdict，不得批准帶病合約
- Main Agent：不得把仍有 contract-blocking issue 的 topic plan 往後路由

下列情況至少屬於 contract-blocking：

- `plan/topic-plan-contract.md` 或 `plan/agent-handoff-workflow.md` 不可讀
- topic plan 缺少任何 canonical required section
- required sections 名稱錯誤、required sections 彼此相對順序漂移到無法清楚
  比對 canonical contract
- `Status / Allowed Transitions` 使用非 canonical transitions，或與 workflow
  lifecycle contract 直接衝突
- `Artifact Paths` 不精確、不 bounded、不可 repo-visible consumption
- stable-library intent 混合、缺漏，或在需要時未宣告 `Stable library metadata`
- `Reviewer Handoff` 不是 machine-consumable JSON contract
- 以 `TBD`、`later`、`follow normal process` 等 placeholder 取代 workflow 所需
  的明確合約
- scope、artifact paths、stable-library timing、或 analysis priority 無法在不猜測
  的情況下決定

這些 blocking semantics 是 shared contract threshold；更細的角色流程與 verdict
shape 由 workflow contract 與各自 consumer surface 負責。

## Responsibility Split With Workflow Contract

`plan/agent-handoff-workflow.md` 是 workflow lifecycle / routing contract。
它負責 execution status model、allowed transitions、step-tracker completion gate、
review handoff routing 與 post-merge / release flow。

本檔案只負責 topic-plan section contract、template fallback 與 blocking threshold。

責任分界規則：

- 需要知道 topic plan 必須有哪些 section、template 缺失時如何 fallback、什麼情況
  屬 contract-blocking，讀本檔案。
- 需要知道 workflow 如何前進、哪些 transitions 合法、reviewer handoff 如何進入
  後續 phase，讀 `plan/agent-handoff-workflow.md`。
- `plan/agent-handoff-workflow.md` 可以引用或重述 canonical sections 以支援
  workflow consumption，但不能升格為 shared topic-plan contract 的替代品。

## Responsibility Split With Topic-local Plans

`plan/<topic>/<topic>.plan.md` 是 topic-local execution artifact。它必須實例化本檔案
定義的 canonical sections，並填入該 topic 自己的內容，例如：

- goal / outcome
- in-scope 與 out-of-scope boundary
- locked decisions
- status 與 routing notes
- exact artifact paths
- implementation steps
- validation / acceptance checks
- post-merge 或 release action

若 `analysis/<topic>/requirements.md` 與 `analysis/<topic>/technical-spec.md`
已存在，而 prompt 或 skill surface 仍要求明示 analysis metadata，topic-local
plan 可以額外 `Inputs` 或 `Prerequisites` 章節承載該 metadata。這種額外章節
屬 topic-local payload placement，不會把 `Inputs` / `Prerequisites` 升格成
repository-wide canonical required sections。

本檔案不得承載上述 topic-local payload，也不得替任何單一 topic 預先決定 scope、
status、artifact inventory 或 acceptance evidence。

## Governance Position

本檔案是 shared repo governance contract，不是 sample plan，也不是 workflow body。
它補齊的是 repository 對 topic-plan shape 的共用 authority，而不是任何單一 topic
的 execution state。
