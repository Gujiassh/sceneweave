# 跨模块一致性审查

基线为干净的 `main@0c5de5d`，采用真实 import/caller 与定向源码检查。未使用不可用的代码图索引，也未将类型依赖当作运行时依赖。

## R2：双标签页陈旧保存静默覆盖（P1）

两个标签页使用同一 IndexedDB，但每个 workspace 只有实例内 autosave 队列。初始化 Web Lock 仅包围启动，不保护后续编辑。`indexeddb-project-repository.ts` 的 save 在 readwrite 事务内读 existing，却只合并元数据，随后无条件写入传入的 revision 与 documentJson。没有存储基准 CAS、单写入者租约或可见冲突恢复。

两个真实仓储实例共享 fake-indexeddb 的探针中，A/B 均打开 r0。A 连续重命名保存到 r2；B 从 r0 的分支保存 r1 被接受。A 再打开得到 B/r1，无错误。另一组相同 revision 的不同内容也被后写者替换。探针断言通过表示缺陷已复现，不是安全通过。未触及真实项目数据库。

结果是另一标签页已保存的作者内容可能丢失；导出 revision 可能数值上大于回退后的文档，造成状态误导。已有同页导出修复和替换锁没有覆盖这一跨连接写入权威。M1 未承诺云协同，也没有阻止重复标签页，因此应按本地保存安全缺口修复。

建议选择并记录写入政策：存储事务内比较并推进不透明版本，冲突保留可恢复副本；或使用整段编辑会话的单写入者锁与明确只读界面。document.revision 不足以识别等 revision 分叉，无须增加云协同系统。

修复后的永久回归入口：

```powershell
pnpm exec vitest run apps/studio/src/project/indexeddb-project-repository.test.ts apps/studio/src/workspace/project-write-authority.test.ts apps/studio/src/workspace/useStudioWorkspace.integration.test.ts
```

## 应保留的边界

- Document 拥有持久化 schema、语义验证、命令、迁移与归档；Runtime 消费文档，React 适配生命周期，Publish 生成确定性包，Studio 组合。未发现包级循环；publish→runtime 是类型边。
- 文档、UI session、runtime 事件分别定义，选择、连接、实时值和预览不进入保存文档。
- 先前导出修复使用捕获文档生成产物、metadata-only markExported，不在完成时回写旧文档；同页替换序列与导入提交锁有明确所有权，本次未重复报告旧缺陷。
- 历史验证器/迁移有显式链条，当前 schema 存储字节不被无条件重写。已读消费链未发现部分迁移。
- Publish readiness、bundle 和 loader 均验证 canonical document、字节与哈希；Studio 使用公开包入口。

## 未定为缺陷的观察

React 的 assetResolver/pixelRatio/reducedMotion 是挂载选项，未确认当前调用方需要动态更新而被违反。依赖方向已有文档，但未找到相应自动 import 门禁，可补轻量检查。云横扩、多租户、分布式事件总线和 AI 推理对当前无后端本地编辑器不适用。完整原则表见[架构审查](../architecture-risk-audit.md)。

本次定向阅读没有覆盖每个功能和二进制模型，未进行新浏览器测试或依赖漏洞公告检查。保存写入缺口在存储层已证明，真实双页恢复仍须单独验收。
