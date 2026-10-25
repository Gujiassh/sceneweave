# 运行时独立审查：R5 / R6

## 结论与源码范围

**限定运行时源码与 CPU/生命周期证据通过，无 P0/P1 返工项。** 组合自动化、实际可见 Edit 子项与单次 headless Run/Edit 补测支持本地有界接受；完整 headful Run 和 GPU 性能不在已完成范围。本审查没有重新接受输入安全或并行保存改动。

基线为 `main@0c5de5d`，审查未提交工作区中的二十个所属文件，逐项哈希与工程交接一致。准确快照和另行读取的支持调用方见 [runtime-reviewed-files.json](evidence/runtime-reviewed-files.json)。审查没有修改产品或公开文档。

目标是可靠 teardown，以及不重新解析未变模型的普通编辑。[OpenSpec 设计](../../../openspec/changes/runtime-edit-lifecycle/design.md)限制 Edit、data runtime disabled、闭合字段集合；资源、拓扑或运行规则变化完整回退。稳定 node/material/target 与相机身份、取消后失去提交权是验收不变量。不需要全局缓存或全面拆分 viewport。

## 独立验证结果

在仓库根目录执行：

```powershell
node node_modules/vitest/vitest.mjs run packages/runtime/src --reporter dot
node node_modules/typescript/bin/tsc --noEmit -p packages/runtime/tsconfig.json
node node_modules/vitest/vitest.mjs run --config benchmarks/runtime-edit-profile/vitest.config.mjs
```

- Runtime 二十九文件、328 测试通过。选择中包括共享工作区已有的输入测试，其通过是集成支持，不能再算一次独立输入安全审查。
- Runtime 类型检查通过。
- 真实 starter 为 1,045,464 字节、49 资产描述、71 实例；实际 GLTFLoader/几何，fake renderer。十二个 rename/transform 样本均为零新增 resolve 与 parse。独审 CPU 中位值为 rename 3.644 ms、transform 2.800 ms；工程首次 after 分别为 2.78、2.73 ms，波动如实保留。历史 before 数据被阅读，独审没有再次切回旧源码复跑 baseline。
- 额外真实 GLB 空间探针让父组移动 `[3,4,5]`，已存在热点锚点的世界位置恰好同向移动 `[3,4,5]`；node/material 身份不变，零额外 resolve。metadata 对象键顺序改变可保留更新，reparent 变化被快速路径拒绝。

[可重复 CPU profile 与原始数据](../../../benchmarks/runtime-edit-profile/README.md)记录设备、方法、before/after 和限制。该测试不渲染真实画面，不能证明 FPS、显存或视觉等价。

## R5：公开终态与内部队列分离

`three-scene-viewport.ts` 继续将内部 operation 串在 `loadBarrier`，返回单独 abort-aware 的公开 load，并跟踪公共终态。取消公开承诺不会让后续修改越过适配器顺序。

只有 generation 构建的等待可在取消时脱离，避免不合作 resolver 阻塞新加载。它的成功/失败都有观察者；晚到的 generation 被释放，loader/generation 原有 abort 检查处理部分解析资源。旧构建不能进入 replace-generation、发布 ready 或恢复诊断。

Dispose 先禁用新工作、abort、释放 render/listener/observer/generation，再等当前 active stop 和已记录的公开 load 终态。重复调用保持同一承诺。已排队适配器仍通过 disposed guard，慢 host stop 释放后不能再启动排队 adapter。不能把这项合同解释为浏览器能够物理取消任意宿主 promise；[architecture](../../architecture.md)已精确区分两者。

## R6：允许列表、同步提交与回退

比较器只替换被允许字段，再比较完整文档，保留数组顺序。实体成员/type/ID/order、父链接、资产、Target、source/rule/environment/view/annotation 和 light 都继续检查，不存在只比较身份或已知字段而漏接资源变更的入口。

真正执行前针对当前已接受文档重新分类，yield 后检查 controller、generation、source 与模式。切到 Run 或启用 data runtime 时完整加载。`prepareEntityPropertyUpdate` 先解析所有条目和 baseline，再同步应用 descriptor、TRS、visible 和世界矩阵，提交段不 await。根 target 的作者可见基线更新，collision-only 子节点保持隐藏；节点映射和隔离材质不重建。

热点、data authority、selection overlay 与 TransformControls 按已接受文档同步。父组坐标探针支撑世界坐标关系。同步失败注入验证属性、文档、选择和 data authority 回滚；快速连续更新与完整加载失败回退测试通过。失败注入不是声称正常 Three 操作必然抛错。相机更新不在允许路径内；随后可见改名 ROI 和实际 gizmo 操作支持当前相机连续性，见[浏览器证据](browser-verification.md)。

## 文档与剩余验收

独审发现 design 早期状态段落仍写“draft / no source changes”，与后文 ledger 冲突。它是关闭阶段的文档修正项，不是产品返工或额外功能。本次归档已修正该段落，并补全组合自动化、实际可见 Edit 与单次 headless Run/Edit 记录。

已完成的可见范围包括首屏、选择聚焦、改名、gizmo 平移、undo/redo、显隐/锁定、保存及其他组中的项目切换与导入。完整可见 Run/Edit、移动组最终刷新、旋转/缩放全部操作和热点屏幕位置专项矩阵未全面重走；Run/Edit 只有单次无下载 headless 支持。没有 GPU 内存/帧时间、shader/纹理上传、完整设备矩阵或任意猴补 callback 的保证。
