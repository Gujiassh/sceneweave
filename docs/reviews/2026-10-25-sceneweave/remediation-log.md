# 六项风险的改造过程与交付状态

## 基线与当前状态

源基线为 `main@0c5de5d92712ffbb76be7330fe54896040d0ad31`，实际修复仍在 `main` 工作区，当前没有本批修复的 commit/push，也没有向其他分支集成。最初架构审查只读；随后按保存、输入和运行时三个范围实施。SceneDocument 1.4、归档含义、assetHash+nodeIndex 和免费模型内容是保持不变的合同。

| 历史发现                | 方案与主要产出                                           | 当前可成立的结果                                                | 接受范围与边界                               |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| R1 撤销导入后保存失败   | persistence-safety；保存投影、保留活动 Blob 池           | 真实仓储组合已覆盖 undo/save/redo                               | 源码独审与可见保存恢复通过                   |
| R2 双标签陈旧覆盖       | persistence-safety；事务 token CAS、同会话权威、另存副本 | 低/等 revision 分叉拒绝、legacy 与副本恢复已有回归              | 卸载返工、源码独审与真实双页恢复关闭         |
| R3 GLB 外链绕过         | untrusted-input-safety；共用 JSON/资源政策               | [输入独审通过](input-review.md)，inspection/runtime 都先拒绝    | 自动化与实际图片解码/拒绝恢复关闭            |
| R4 ZIP 预算绕过         | untrusted-input-safety；唯一条目集合、固定输出           | [输入独审通过](input-review.md)，固定 backing buffer 已独立验证 | 自动化与真实归档拒绝/恢复关闭                |
| R5 dispose 提前完成     | runtime-edit-lifecycle；公共终态与内部队列分离           | [运行时独审通过](runtime-review.md)，晚到工作无提交权           | 源码/生命周期通过；可见 Edit 与后台 Run 支持 |
| R6 普通编辑逐实例重解析 | runtime-edit-lifecycle；保守 Edit 属性更新               | 独审十二样本零新增 parse/resolve                                | 可见 Edit 子项通过；完整 headful Run 未做    |

## 设计取舍与实施顺序

保存边界采用当前引用投影，不删除历史资源，也不放松仓储完整性。跨页采用存储版本 CAS，而非 document.revision 或云协作；失败方可恢复为独立本地项目。版本兼容和排队保存由小型私有写入权威承担，避免在 workspace 重建一套持久化框架。

输入边界让 GLB JSON chunk 与文本 glTF 遵循同一政策，runtime 直接加载也执行。ZIP 放弃预检后整包 unzipSync 的双解析，直接提取已验证片段；固定输出缓冲解决已证明的未预算分配，不宣称有完整 CPU 时间预算。合法嵌入图片/data URI 与 stored/deflate/descriptor 兼容是反向验证要求。

生命周期保留内部修改/适配器串行顺序，以单独公开终态处理取消；generation 构建可脱离不可取消 resolver，晚到结果最终清理。属性更新只在 Edit 且 data runtime 关闭、资源/拓扑和其他合同不变时采用，其他情况保留完整原子回退。没有引入全局资源缓存或按文件行数拆分 App/viewport。

## 验证与返工过程

| 阶段         | 实际过程                                                                          | 结果与判断                                                 |
| ------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 基线审查     | 文件/依赖枚举，九组直接 tsc、ESLint，五个有界风险探针                             | 四 P1、两 P2；静态绿色未覆盖组合时序                       |
| 输入红→绿    | 新增 39 回归初轮 33 fail/6 pass；修正 Node 平台/图片 fixture 后实施               | 最终定向六文件/108 测试；两个包 tsc、局部 lint/format 通过 |
| 输入独审     | 真实固定输出 backing buffer、原计数绕过、直接 runtime 与 inspection、Publish 消费 | 限定 R3/R4 源码通过；浏览器/GPU 不外推                     |
| 运行时红→绿  | 公共 load 取消与保留对象测试先失败；保存旧 queued-adapter 合同                    | 二十九文件/328 测试、runtime/root tsc、局部 lint 通过      |
| 运行时独审   | 同一真实 starter、额外父组/热点世界坐标与 identity/fallback 检查                  | 限定 R5/R6 通过；设计旧状态文字已在文档归档中修正          |
| 保存回归     | 双连接、legacy/no-op、真实 workspace、copy 失败恢复与 A→B→A                       | 关键组合测试通过，正确等待清除 act 警告                    |
| 集成初轮     | 三项组合源码 `pnpm test`                                                          | 132 文件/905 测试通过；它是下面返工前的快照                |
| 保存独审返工 | 真实探针发现 <500 ms 改名后卸载未最终 flush，数据库仍 r0                          | 新 P1 回归退回修复；不是历史第七风险，随后红绿闭环关闭     |
| 保存返工复核 | close 捕获所属 lifecycle authority，新增 unmount/StrictMode/Activity 回归         | 八文件57测试及独立十一项最终组合通过，保存源码限定 PASS    |
| 返工后集成   | 重跑全仓单测、类型、lint/build/i18n/topology/docs/assets                          | 132文件907测试及其余门禁通过；大chunk警告保留              |
| 格式与生成物 | 全仓格式613提示；仅六个本轮文件局部整理。核验后恢复14个无关生成文件               | 全仓格式未通过；局部格式等价与最终身份已记录，模型未改     |

CPU profile 的首轮工程中位值：改名 25.10→2.78 ms，变换 22.68→2.73 ms；71 次 parse/resolve 降为 0。实际 GLTFLoader、fake renderer、Windows 10/Node 24/i5-14600K、800×600/DPR1、各六次测量；[完整方法与原始数据](../../../benchmarks/runtime-edit-profile/README.md)可复跑。独审时序中位值有波动但十二样本工作量仍为零，不代表 FPS/GPU 提升。

## 文档归档修正

最初技术审查、独审与可见 QA 的部分正式结果只在仓库外维护，OpenSpec 虽有方案与任务，项目 docs 仍缺少完整审查链。现在将历史审查、当前决策/实施/返工、三项已完成独审及此前交付审核补入本目录，并与 OpenSpec 互链。三项独审、自动化集成、实际可见范围、格式后身份和产出清单已补齐。完整 headful Run、重复 E2E 和设备/GPU 等未执行项保留边界，不以整体绿色掩盖。

## 本地有界关闭与后续边界

本地有界关闭采用已完成的保存卸载返工独立复核、组合自动化、可见双页/输入/Edit 交互与单次 headless Run/Edit 补测，源码身份、结果和限制已进入项目记录。完整可见 Run、移动组最终刷新及五项重复自动 E2E 未执行，后续验证须先改用不打扰的方式。自动化与生成物详细结论见[集成检查](integration-verification.md)。原始长日志可以由验证环境保存，但正式结论、可执行回归、关键产出和判定理由不得只存在外部路径。当前接受[列明范围的本地交付](release-acceptance.md)，没有宣布整体 headful clean PASS。

## 验收方式调整与最终产出

首轮独立 headful 会话实际完成四组与第五组 Edit 子项，但因英文 Run 定位中文按钮而 exit1，且原偏好注入在 about:blank 产生六条 SecurityError。脚本来源、原消息、无原始堆栈事实和受控复现均保留，未将其改记为无错误。十六次 JSON、两次 ZIP 下载打扰使用者后，立即停止重复可见/E2E 验证并关闭测试窗口，不把它解释为取消产品修复。仅追加一次无可见窗口、零下载的 headless Run/Edit，观察在线值、诊断零、作者 JSON/token/revision 不变，正常应用错误零；它不代替可见 Run 验收。

保存五张已检查截图、关键 R1 作者 JSON、十八项实际下载身份、归档与 JSON 往返摘要、596 项相对源码清单与四次一致检查，见[产出索引](artifact-index.md)。两份实际下载 JSON 保留原字节；根格式排除仅覆盖 docs 的生成证据目录，单独核对 JSON/哈希/往返，不排除产品源。三 OpenSpec 的最终任务与交付记录按已完成/未执行边界关闭，没有预写提交推送。
