# Delivery ledger

- Source branch and starting revision: `main@0c5de5d92712ffbb76be7330fe54896040d0ad31`.
- Repair branch: existing `main` checkout.
- Trigger and root cause: GLB inspection skipped the textual glTF resource policy, and runtime playback did not apply it; ZIP preflight and whole-archive extraction rediscovered entries using different count fields.
- Scope: document ZIP decoder and regressions; private runtime model policy, inspection/loading and corresponding regressions; this OpenSpec change.
- Decision: enforce one model JSON resource policy before parser access, and extract only already validated ZIP slices with bounded deflate output.
- Contract impact: no SceneDocument/manifest version, Target identity, persisted field or public viewer API changes. Damaged GLB JSON is rejected earlier with the existing JSON-invalid error category.
- Verification: focused 108 tests, direct document/runtime type checks and scoped lint/format passed; combined automated gates and actual visible input recovery support bounded local acceptance; see acceptance.md for limits.
- Independent review and rework: bounded R3/R4 source review passed with no required code rework; independent visible input recovery was observed; complete headful coverage remains a stated limit.
- Commit: none. Push: none.
- Downstream integration: shared checkout only; no merge, cherry-pick or secondary repository created.

Formal report: [input-review.md](../../../docs/reviews/2026-10-25-sceneweave/input-review.md); combined checks and generated-output handling: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).

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
