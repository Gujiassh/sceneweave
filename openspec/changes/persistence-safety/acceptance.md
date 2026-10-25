# 保存安全验证记录

基线为 `main@0c5de5d92712ffbb76be7330fe54896040d0ad31`。当前实现与限定源码独审已完成，卸载最终保存回归已返工并独立复核；组合自动化检查已通过。本地有界验收已接受，独立可见保存与副本路径已观察通过；完整可见 Run/设备矩阵等未执行边界保留在最终验收说明。

## 问题与修复

真实仓储回归在修改前复现两项故障：新模型导入撤销后保存触发 ASSET_NOT_REFERENCED；两个连接的陈旧/相同 revision 分叉被保存接受。修复把当前引用的保存投影与活动 Blob 池分离，并在原子项目/资产事务中检查独立存储 token。新建、旧无 token 和已版本化记录有明确不同的写入前提。

写入权威仅采用本会话成功事务返回的 token，并串行化本会话 save 与 metadata ack。冲突不读取远端新版本自动重试；本地文档、模型字节和完整历史保留，另存副本创建独立项目。旧导出与异步最近项目结果通过权威对象身份校验，A→B→A 的相同项目 ID 不会代替会话身份。

## 已执行验证

- `pnpm exec vitest run apps/studio/src/project apps/studio/src/workspace apps/studio/src/App.scene-settings.test.ts`：57 tests / 8 files passed，无 act 警告。
- `pnpm exec tsc --noEmit -p apps/studio/tsconfig.json` 与 `pnpm exec tsc --noEmit -p tests/e2e/tsconfig.json`：通过。
- 保存范围 ESLint 与 `pnpm verify:i18n`：通过。
- 启动普通 `pnpm dev`，再执行 `pnpm exec playwright test --config tests/e2e/save-safety.config.ts`：2/2 真实可见系统 Chrome 流程通过，未写测试业务状态或使用测试 starter。

`useStudioWorkspace.integration.test.ts` 使用真实 fake-indexeddb-backed repository，仅读取环境和实际异步操作的完成信号，没有放宽 save。它覆盖撤销后的自动保存、redo 后资源字节、冲突保留模型/历史、真实容量不足导致副本失败后恢复、A→B→A 旧导出成功/冲突均不污染新会话，以及新队列仍能保存或报告自己的冲突。`project-write-authority.test.ts` 使用真实事务验证同会话排队保存/确认与外部写入拒绝。

浏览器第一条路径通过正常文件选择导入官方新 GLB，撤销并等待自动保存，再重做、导出、再次保存和刷新；第二条使用共享 IndexedDB 的两个普通标签页，在相同文档 revision 下创建不同名称分叉，观察胜者保留、失败方冲突提示/保存禁用、本地修改仍在、另存副本成功及刷新恢复。截图与 trace 由 Playwright 生成在 `test-results/save-safety/`。

## 复核与范围

实现与测试文件的相对路径及 SHA-256 见 [implementation-snapshot.json](implementation-snapshot.json)。正式架构审查、保存独审与集成检查见下方仓库内报告。格式增量已独审确认五项严格等于 Prettier 3.9.5 对已审旧字节的转换、十三项未变；十八路径最终组合摘要为 `24f7ef5ec704d45eb5a7806a91a57b75aaeecb22a0928562a6c7b23cd118fe33`，不沿用旧摘要。

旧存储记录兼容不代表升级前、完全不执行 CAS 的旧应用代码也能参与冲突保护；旧标签页需重新载入。副本保留作者文档 ID/名称/revision 和历史，建立新的本地项目 ID；命名可随后显式修改。浏览器全局最近项目策略、自动合并、云同步、模型缓存和归档输入安全不在此保存变更范围。

卸载保护另有真实仓储红绿回归：debounce 前卸载仍保存最后编辑。StrictMode/Activity effect 重新激活时，旧 close 队列仅使用关闭时捕获的权威，不从新 effect 读取同 ID 对象，且不会提升新会话 token 或写回 UI。当前六条 workspace 组合用例均通过且无 act 警告。

## Repository review and integration checkpoint

- Formal scoped review: [persistence-review.md](../../../docs/reviews/2026-10-25-sceneweave/persistence-review.md).
- Combined automatic checks: [integration verification](../../../docs/reviews/2026-10-25-sceneweave/integration-verification.md).
- Decisions, rework and current state: [remediation log](../../../docs/reviews/2026-10-25-sceneweave/remediation-log.md).

The post-rework combined suite passed 907 tests in 132 files. Typecheck, lint, build, localization, topology, docs and asset gates passed. Fourteen unrelated build-generated outputs were checked and restored to HEAD; model bytes were unchanged. The all-repository format check reported 613 warnings and did not pass; the six identified paths received scoped formatting cleanup; five source/test transformations were proved equivalent and thirteen frozen source paths stayed unchanged. Independent visible evidence and the single headless Run/Edit supplement are recorded in the bounded local acceptance below. Complete headful Run and five repeated E2E were not performed; they are not labeled passed.

## Bounded local acceptance

The local working-tree delivery is accepted within the evidence recorded in [release acceptance](../../../docs/reviews/2026-10-25-sceneweave/release-acceptance.md), [browser verification](../../../docs/reviews/2026-10-25-sceneweave/browser-verification.md), and [artifact index](../../../docs/reviews/2026-10-25-sceneweave/artifact-index.md).

Four visible groups and the recorded Edit subflows completed. The original visible runner exited 1 after a Chinese/English Run locator mismatch, and six blank-origin localStorage errors came from the QA preference init script, with controlled-probe support rather than invented original stacks. After download disruption, repeated headful/E2E operations stopped. Exactly one headless fresh/Run/Edit supplement made zero downloads and zero application-path errors; authored JSON, storage version and revision stayed unchanged. It is not labeled visible Run acceptance.

The 596 product/config/test/asset paths matched before and after both sessions. Evidence scene JSON and images retain recorded bytes; `.prettierignore` excludes the review evidence folder so a formatter cannot invalidate actual-download hashes. Git also marks only review evidence JSON as `-text` to preserve archived bytes across checkout. Evidence JSON parse, file hashes and semantic round trips are checked separately. The 596 source-byte identity is an execution snapshot, not a permanent cross-EOL quality rule. The recorded full-repository format check reported 613 warnings and was not passed; scoped cleanup is not a claim of global format success. No commit, push, merge or cherry-pick was performed.
