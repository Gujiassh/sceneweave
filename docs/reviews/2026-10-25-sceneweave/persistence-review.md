# 保存安全独立审查：R1 / R2

## 结论与版本范围

**限定 persistence-safety 产品源码、存储合同与已记录验证通过。** 历史 R1 撤销新模型导入后无法保存、R2 陈旧及等 revision 分叉覆盖均已修复。独审新发现的卸载最终 flush 回归经过返工和独立红绿验证关闭，当前没有未解决的 P0/P1 保存安全发现。

该结论不是全仓无风险保证；其后的独立可见保存/冲突恢复证据支持有界本地接受，见[浏览器报告](browser-verification.md)。工程 headful Chrome 两项流程的日志、spec 和截图已被独审检查，源码审查本身没有另开浏览器重走。

基线为 `main@0c5de5d`，审查范围为十八个保存产品/测试/E2E 配置文件及 OpenSpec，并追踪快照、历史、转换、初始化和保存状态消费者。审查时十八路径逐项身份一致；[pre-format 审查身份记录](evidence/persistence-reviewed-files-pre-format.json)保存这次证据。随后格式增量独审已确认五文件严格等于实际 Prettier 3.9.5 对已审旧字节的转换、十三文件不变。最终十八文件摘要为 `24f7ef5ec704d45eb5a7806a91a57b75aaeecb22a0928562a6c7b23cd118fe33`，算法为 `SHA256(UTF8(JSON.stringify(files)))`；[最终清单](evidence/persistence-reviewed-files.json)取代格式前身份用于交付。

## 独审发现与返工闭环

首轮实现的 cleanup 先清 `authorityRef.current` 再调用 autosave.close。close 会 drain 不足 500 ms 的 pending snapshot，但 save callback 此时从已清 ref 取不到 authority，冲突被 close 清理路径吞掉。

独立真实 React workspace/fake-indexeddb 探针在改名 `Pending must survive` 后立即卸载，await close 后得到 `Saved basis`、revision 0，期望 pending、revision 1。此 P1 来自本轮实现，未列作历史架构审查第七风险。它在初轮五十五个 focused 及组合全仓 905 测试均绿色之后被发现，说明原测试选择缺少卸载边界。

返工在该 repository 生命周期 closure 捕获 closingAuthority：active save 使用当前 authority，cleanup 后 drain 使用被关闭生命周期的 authority；UI completion 仍受 active/对象身份保护。它不借用 StrictMode 新 activation 的 token。独立重跑得到：

```json
{
  "scenario": "unmount-pending-edit",
  "expectedName": "Pending must survive",
  "storedName": "Pending must survive",
  "storedRevision": 1
}
```

另补真实 debounce-before-unmount 和 StrictMode/Activity effect 重新激活测试。旧 close 只使用旧生命周期权威、最终 flush 仍发生、旧结果不提升新 token 或回写新 UI，均通过。未屏蔽 console 或放宽 save，act 警告通过正确等待实际 initialize/listRecent/close 与导出 gate 清除。

## R1：保存引用与历史资源池

`projectForPersistence` 只过滤保存输入，不改原 pool、Blob 或历史。autosave 与导入提交经同一 authority 投影；成功保存只合并 record 元数据，不把精简返回 assets 安装回活动池。导入和副本成功继续保留完整 pending/current pool。

仓储对未引用输入、缺失字节与 SHA 的严格检查不变。新建无历史池，文件导入使用正常 codec 生成匹配的新 snapshot，新 ID 不带旧 token。没有为撤销放松 schema/archive/asset 规则。

真实 workspace 与独立探针覆盖 import→undo→autosave/manual save→redo→save→undo 后继续编辑。独立复核还实际生成并解码 undo 下的 ZIP/JSON、切 B 再开 A：下载和存储没有已撤销实体/引用，切换前活动池仍保留一个 Blob，redo 模型仍可从仓储解析。

## R2：事务 CAS、legacy 和创建

保存在同一个 projects/assets/settings readwrite transaction 内读 existing 并先 CAS，随后才可写资产、项目、recency 和 LAST_PROJECT_KEY。拒绝会 abort，没有先写资源后报冲突。

缺失 token 仅创建不存在 ID；null 仅保存已存在且无 token 的旧记录；string 要求精确匹配。open/listRecent 将旧缺失 token 显式映射 null，不提前改文档或建 token。首次合法旧记录保存建随机 token，合法同 canonical 内容保留 token；CAS 在 no-op 判定前，document.revision 不提供授权。

两个真实连接的独立复核确认：旧 token 提交与最新相同 canonical 字节仍拒绝，等 revision 旧 ack 拒绝，缺失 token 撞 ID 和 null 新建不存在 ID 均拒绝，legacy 首次竞争只允许一方。拒绝前后 projects/assets/settings 全量快照相同，新分叉资产也未写入。

## 队列、导出确认与激活身份

每次激活的小型权威对象只存 ID/token/conflicted/短队列，save 和 markExported 串行，token 只由自身成功保存更新。没有 open 胜者后自动 rebase。冲突权威后续请求不能重试覆盖。

Ack 先 CAS 和 revision 校验，仅单调合并 lastExportedRevision；不推进 token，不写文档、saved revision、时间、settings 或 recency。普通保存保留事务内最新 export 最大值。独立测试以 ack/save/ack/save/ack 正反次序证明无同页自冲突，外部插写后旧 authority 的 save/ack 均拒绝。

export 在 await 前捕获 authority，完成与冲突处理比较对象身份而非仅 projectId。真实 A1→B→A2 回归中，旧 A1 成功或冲突都不安装 A2 的保存/导出/session/history，也不清其 pending。只有 A2 自己后续保存会报告应有的外部冲突。

## 冲突、副本和界面

冲突保留当前文档、历史、选择和字节，标记失败/dirty 并停止 pending 重试；clearPending 不取消在途事务，旧 activation 冲突不清新 activation 队列。beforeunload 只提供普通浏览器离开提示，不能保证强行关闭后的内容。

Save a copy 用新本地 ProjectRecord ID，文档 ID/name/revision/内容不变，export 状态重置，不插入清 redo 的 rename。提交时锁变更命令，成功保留原历史/pool 并采用新 token；容量不足失败后仍保留冲突和恢复入口。真实测试先失败后重试成功，随后 undo/save、redo/save、读取模型，赢家文档完整不变。

界面使用本地化 flat notice，普通保存禁用，另存可执行，成功后可显式重命名。已审工程截图中，冲突文字、按钮与模型/编辑区域可见，没有新增遮罩阻断内容。

## 独立执行与判定

```powershell
pnpm exec vitest run apps/studio/src/project apps/studio/src/workspace apps/studio/src/App.scene-settings.test.ts
pnpm exec playwright test --config tests/e2e/save-safety.config.ts
```

- 独审最终运行八文件、57 测试通过：project-name 3、autosave 6、initialize 5、write-authority 1、repository 15、workspace mock 11、App 10、真实 workspace integration 6。不同测试层各自承担合同，未将宽松 mock 当组合保存证明。
- 独立仓储探针三项通过，检查全 store 原子拒绝、legacy/create、stale no-op/ack 和 own/external authority。
- 独立 workspace 探针两项通过，覆盖卸载 pending 及 undo 后真实 ZIP/JSON 解码、切换、重开。
- 最后冻结时再次独立运行六项真实 workspace integration、三项仓储探针、两项 workspace 探针，共十一项通过且无 act 警告。
- 工程可见系统 Chrome 两项通过：新 GLB import/undo/redo/save/export/reload、共享 IDB 双页等 revision 分叉→冲突→copy→reload。仅只读 IDB 观测，未写业务状态替代 UI。独立可见 QA 的实际 R1/R2 路径已另行归档，不把其整体脚本 exit1 改写为 clean PASS。

## 架构与限制

CAS 留在 Studio 仓储，没有向 document/runtime/react/publish 注入浏览器存储含义；持久化投影解决具体输入边界，不增加全局状态库或云协作。

旧已加载、完全不执行 CAS 的应用须刷新后参加新合同；没有承诺约束旧二进制。未实现自动合并、云同步、资产垃圾回收或每标签独立最近项目策略。全仓门禁见[集成检查](integration-verification.md)，最终格式身份与实际可见 R1/R2 已补齐，完整 headful Run/设备矩阵边界见[本地验收说明](release-acceptance.md)。
