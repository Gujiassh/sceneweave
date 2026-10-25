# Runtime edit lifecycle delivery ledger

- Source branch and starting commit: `main`, `0c5de5d92712ffbb76be7330fe54896040d0ad31`.
- Repair branch: current `main` checkout; no additional branch or worktree created.
- Symptoms: an entered resolver can keep public load pending beyond dispose; ordinary property edits repeatedly parse every asset instance.
- Root cause: public load lifetime follows uncancellable host work, and source reconciliation has only a light-specific retained path.
- Design: separate public cancellation settlement from serialized internal mutation; abort-aware detached candidate building with late cleanup; conservative Edit-only retained property updates and full-load fallback.
- Changed scope: runtime viewport/generation/comparison helpers and focused tests, ownership architecture documentation, a reproducible CPU profile and this OpenSpec change. No Studio save, document schema, asset loader or archive code edits are included in this slice.
- Verification: see acceptance.md; real-starter before/after measurement is tracked under benchmarks/runtime-edit-profile.
- Review/rework: bounded R5/R6 source review passed; the earlier draft-status wording was corrected. Visible Edit acceptance and a separately labeled headless Run/Edit supplement support bounded local delivery; complete headful Run remains unperformed.
- Commit/push: none for this slice. No merge/cherry-pick or downstream integration performed. The shared persistence/input changes also have scoped independent reviews; the combined bounded local delivery decision is recorded below.

Formal report: [runtime-review.md](../../../docs/reviews/2026-10-25-sceneweave/runtime-review.md); combined checks and generated-output handling: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).

Bounded local delivery: [release acceptance](../../../docs/reviews/2026-10-25-sceneweave/release-acceptance.md) and [artifact index](../../../docs/reviews/2026-10-25-sceneweave/artifact-index.md). The visible runner exit1/QA errors and unperformed complete headful Run/repeated E2E remain explicit limits; no stage claims an overall clean headful pass.

## 推送回执（2026-10-25）

用户明确要求推送后，本批已推送至现有 `https://github.com/Gujiassh/sceneweave.git` 的 `main`，远端成功接受 `0c5de5d..ff284ba` 的正常快进。没有新建仓库、强制推送、合并或 cherry-pick。上文未提交状态为本地验收时的历史快照，由本回执更新。

| 提交      | 内容                                           |
| --------- | ---------------------------------------------- |
| `2c826c4` | 保存投影、写入版本冲突保护、恢复 UI 与回归测试 |
| `2ce6c3f` | glTF 外链政策与有界 ZIP 解码                   |
| `4f8df7b` | runtime dispose 和普通属性编辑增量路径         |
| `ff284ba` | 架构审查、独审、验收与原始证据归档             |

推送前重新核验 28 项归档文件、20 项 JSON、2 项原始下载及 596 项源码身份全部通过；未重新启动浏览器或下载验收。已有 907 测试及其验收边界保持原记录。本回执随单独文档提交同步；其提交身份由 Git 历史提供。
