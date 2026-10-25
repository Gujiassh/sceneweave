# 代码健康审查：历史资源池与保存输入

基线为 `main@0c5de5d`。本审查定位跨模块的可复现失败，不按文件长度或命名偏好计分。九组直接 TypeScript 配置与 ESLint 均通过，这些结果未覆盖保存时的组合合同。

## R1：撤销新模型导入后保存失败（P1）

`apps/studio/src/workspace/useStudioWorkspace.ts` 的导入提交把新 Blob 留在 `project.assets`。撤销调用 `project-name.ts` 的 `withProjectDocument`，只恢复历史文档而保留资源池。`project/indexeddb-project-repository.ts` 的 `save` 要求每个输入 Blob 的 SHA 都被当前 `document.assets` 引用。这两种含义在撤销新资产时冲突。

使用真实 history、快照 helper、autosave 和 fake-indexeddb 仓储的组合探针得到：导入 revision 1 成功；撤销到 revision 2 时文档引用数为 0、快照 Blob 数为 1，手动保存与 autosave.flush 均报资产未引用。数据库仍保留导入后的一个实体。撤销后再改名也不能保存；切换与导出在等待同一 flush 时受阻。Redo 恢复引用后可保存。

现有 `useStudioWorkspace.test.ts` 已检查导入后 undo，但其 save mock 直接复制快照，未执行真实仓储限制；仓储的独立完整性测试也没有覆盖该组合。两类测试各自通过不能反证此失败。

最小修正是在 Studio 保存边界生成当前引用资产的持久化投影，保留活动池供 redo 使用。限定试验中，过滤保存输入可成功保存撤销结果，同时保留一个内存 Blob，随后 redo 仍可保存。此结果支持边界修正，不支持删除完整性校验或直接丢弃历史资源。

修复后的永久回归入口：

```powershell
pnpm exec vitest run apps/studio/src/workspace/useStudioWorkspace.integration.test.ts apps/studio/src/project/indexeddb-project-repository.test.ts
```

## 同步状态重复属于维护观察

execute、undo、redo 分别重复安装 history、projectRef、project、最近项目名称和 session。各分支的编辑锁、返回值和错误处理有合理差异；审查未发现已存在的同步分歧。若修保存边界时提取局部安装函数，可减少重复知识，独立优先级为 P3。它不构成另一个功能风险，也不足以支持拆分整个 workspace。

## 覆盖边界

深入检查 workspace 的导入、切换、保存、导出，快照/仓储/autosave，命令历史，App 组合与 React/viewport 的相关调用。未逐行检查所有热点算法、未进行新浏览器或覆盖率测量。生命周期与重建成本由[安全与性能审查](security-performance.md)处理，避免重复计数。
