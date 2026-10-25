# SceneWeave 浏览器验收及安静补测记录

## 结论与适用范围

本次可见浏览器会话已实际完成默认家居首屏、导入撤销保存、双标签冲突副本及输入拒绝恢复四组操作。第五组已完成选择聚焦、改名、真实移动、撤销重做、隐藏显示、锁定解锁和保存；在切入运行模式前，测试脚本因中文界面使用了英文按钮定位而停止。完整浏览器验收尚未完成，不作整体 PASS 结论。

用户反馈连续下载造成干扰后，立即停止重复验收与自动 E2E，不再新建浏览器窗口或触发下载。测试脚本已退出，隔离测试 Chrome 已关闭；没有启动五项会重复导出的自动 E2E。随后仅按明确授权执行一次无下载、无可见窗口的 headless Run/Edit 补测，结果单独列示。

## 源码与设备

- 基线提交：0c5de5d92712ffbb76be7330fe54896040d0ad31，工作区未提交修复。
- 绑定冻结清单：596 个产品、配置、测试和资产文件；组合 SHA-256 为 4c73ff2cddd1267c6e6e2d52336d1ee31623aedfd285b39e6e174ec3cc09ba5b。执行前后 596/596 一致，文档收尾不在该冻结范围。
- 操作时间：2026-10-25 17:09:00–17:09:52，Asia/Shanghai。
- 独立 Vite 入口：127.0.0.1:4188，普通默认 starter，无 test-starter 替换。未操作用户 profile 或 4173 服务。
- 系统：Windows 10，Node 24.22.0，系统 Chrome 156.0.8078.48，headful，新隔离浏览器 context。
- 视口：1440×900 与 1280×720，DPR 1，中文、浅色。
- 实际 WebGL：ANGLE，AMD Radeon RX 7800 XT，Direct3D11。该记录是当前单机渲染环境，不代表 GPU 内存、通用帧率或其他设备性能保证。

## 已执行操作与结果

| 操作                   | 观察结果与语义证据                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 默认家居首屏           | 实际家具和完整户型可见，主体未裁切；1440×900 与 1280×720 横向溢出为 0。查看了首屏截图，未用实体数量代替视觉检查。                                                                                                                   |
| 新模型导入→撤销→保存   | 从工具栏原生文件选择器导入官方源 loungeDesignSofa.glb。新增模型 SHA-256 为 b4f4e6850118e409da301df678228c703b6ac02e94fbb9dbde61543af817fa53；新实体可聚焦且真实可见。撤销后的 r3 文档不含该实体，资产列表恢复初始内容，并成功保存。 |
| 重做与继续编辑         | 重做后同实体恢复并可保存。再次撤销、改场景名、保存、下载 JSON/归档，切入新场景再从最近项目重开，刷新后 r6 文档与编辑后文档完整相等。                                                                                                |
| 双标签冲突             | 同 context 两页使用同一项目与存储基准。A 保存胜者名称，B 从旧基准修改，显示明确冲突条及“另存副本”；只读存储比较确认胜者 documentJson 未被冲突写覆盖。失败方仍显示原本的活跃模型和名称。                                             |
| 副本保存、历史与恢复   | B 通过可见“另存副本”创建不同项目 ID，原项目内容不变。副本中执行撤销和重做后保存、刷新；独立副本名称和新增沙发均恢复。A 重开胜者仍为胜者名称。查看冲突条和副本刷新截图，提示可读、模型实际可见。                                     |
| GLB 外链拒绝           | 原生文件选择器导入 external-buffer.glb，检查对话框报错；audit.invalid 防御性拦截的调用数为 0。该拦截没有被调用，外部网络未发生。取消后可选择合法文件恢复。                                                                          |
| 嵌入图片兼容           | 导入 embedded-image.glb 并确认加入场景、聚焦。透明观测包装保留原 createImageBitmap 调用及实际结果，记录到检查和播放阶段各一次 1×1 图片成功解码。截图中白色三角形与蓝色选择边界真实可见；没有替代图片解码或 GPU。                    |
| ZIP 拒绝与恢复         | 经项目菜单原生文件选择器导入矛盾目录计数 ZIP，显示归档诊断。项目 ID 集合和当前已存 documentJson 未变化；随后经工具栏导出合法归档，并通过菜单导入，恢复相同新增实体和 r2 文档。                                                      |
| 改名画面连续性         | 在聚焦沙发后改名。前后画面区域 x=248..987、y=96..719，共 461760 像素，RGB 差异超过 10 的像素为 0，未观察到相机跳回。                                                                                                                |
| 真实 gizmo 移动        | 通过画面红色轴箭头鼠标拖动，实际下载文档记录沙发 X 从 -4.25 变为 -3.8900000107288357，Y/Z、rotation 和 scale 保持。撤销完整恢复原 transform，重做完整恢复移动后 transform。查看移动截图，主体与 gizmo 可见。                        |
| 隐藏、显示、锁定、解锁 | 经树节点按钮实际执行，等待当前 revision ready 并保存截图。操作后显式保存成功。                                                                                                                                                      |

所有业务编辑均由可见控件完成。IndexedDB 使用 readonly transaction 观察，JSON/ZIP 来自真实下载；未使用测试 API、runtime handle 或 IndexedDB 写入来构造业务状态。

## 脚本问题与未完成项

1. 原始可见日志有 6 条 SecurityError，均为 localStorage 在无有效 origin 文档上访问被拒。保留的 helpers-visible-original.mjs 第 28 行向每个新页无条件注入 localStorage 偏好设置，没有 origin guard；本次恰有 6 个新页。原始监听器只记错误消息，没有保存原始堆栈。后续获准的单次 headless 会话在 about:blank 做只读受控复现，得到完全相同的 SecurityError 与 UtilityScript.evaluate 堆栈；使用 http/https origin guard 后，正式 fresh→Run→Edit 路径 pageerror/console/http 错误均为 0。这些代码、原消息、受控堆栈及修正后限定结果支持归因为 QA 注入脚本；不把该堆栈伪称原始堆栈，也不把旧可见会话改写为全程错误 0。
2. 中文界面的运行按钮名称为“运行”，脚本使用 Run，发生 8 秒定位超时。该次可见会话的运行/编辑切换与该组最终刷新未执行；这是测试定位失败，未建立产品故障。后台补测另行记录，不能代替可见 Run 验收。
3. 既有 editor-quality.spec.ts 三项和新增 save-safety.spec.ts 两项自动 E2E没有启动。验收协调方根据用户不打扰约束明确取消这批重复导出操作；已准备的独立外部配置未执行，也未继承会生成源码的全局 setup。
4. 会话内发生 16 次 JSON 和 2 次 ZIP 实际下载，用于各步骤的语义比较；该方式造成用户可见干扰，因此后续不得直接完整重跑相同脚本。继续时应由验收协调方另行授权并采用更少下载或非打扰验证。
5. 未执行长时间内存、GPU profile、其他浏览器/设备或未列明操作的验收。

## 可归档截图

以下五张已实际打开检查，建议以相同文件名存入本报告同目录 evidence/。

- fresh-home-1440.png：完整户型、家具、首屏布局。
- r2-conflicting-live-copy.png：冲突条、另存按钮与仍然保留的本地模型。
- r2-copy-reopened.png：独立副本刷新后恢复，新增蓝色沙发可见。
- input-embedded-image-visible.png：合法嵌入图片模型聚焦，白色三角形可见。
- runtime-moved.png：真实移动后的沙发与 gizmo。

源码身份、逐阶段比较、下载哈希与语义结果已归档在本目录 evidence；仅保留关键作者文档，未重复复制全部十八份下载。该报告保留“实际观察范围”与“完整 headful 未完成”的边界。

## 单次后台 Run/Edit 补测

2026-10-25 17:13:28–17:13:29，按明确授权使用同一系统 Chrome 的 headless 模式，新隔离 context，1280×720、DPR 1。浏览器 acceptDownloads=false，绑定下载事件即取消并令测试失败；实际下载数为 0。没有可见窗口，也没有执行导出菜单或文件下载。

从普通默认入口完成 fresh → 中文“运行” → 数据源在线 → 绑定值出现 → 中文“编辑”。观察到 ready、alarm、offline 值、对应良好数据质量、两条业务告警、运行诊断为 0。前后只读 IndexedDB 的完整作者 documentJson 相同，storageVersion 相同，可见 revision 也保持 r1。正常应用路径的 pageerror、console error、HTTP 失败均为 0。before/after 各 596 个冻结文件仍全部匹配。

Runtime 的属性快速路径仅在 Edit 且数据 runtime 关闭时采用（three-scene-viewport.ts:310–314），运行阶段继续使用既有适当加载与适配器生命周期路径；本次补测给出该完整链路的后台支持证据。没有据此放宽可见交互不变量，也没有宣称已补齐原可见 Run/Edit 和移动后最终刷新。

headless-run-online.png 和 headless-edit-restored.png 是后台渲染截图。已查看运行截图：完整户型仍在，右侧在线状态、数据值、告警和运行诊断可读。它们必须标注为 headless，不与上列五张真实可见操作截图混用。

## 下载与语义摘要

本次已发生的真实下载保留在测试工作目录：16 份 JSON 与 2 个 ZIP。其后未新增下载。archive-payload-summary.json 列出两个 ZIP 的大小、SHA-256、条目数、文档 revision、资产和实体数量；semantic-summary.json 列出真实移动 TRS、undo/redo 相等判断及改名前后画面比较。selected-evidence.json 为五张已查看截图提供文件 SHA-256。

浏览器证据层的结论是：四组可见路径及第五组已列子项得到实际证据；Run/Edit 有一次安静后台补测支持。整轮可见五组与重复自动 E2E并未全部执行，原始 exit1 和 QA 脚本问题保留，不能标为整体 headful clean PASS。

## 项目内产出与接受判断

- [源码清单](evidence/qa-source-manifest.json)及[四次身份比较](evidence/qa-source-checks.json)：596 项前后一致；596 项组合按清单现有顺序将 path:sha256 以 LF 无尾拼接后计算 UTF-8 SHA-256，已重算与 `4c73...` 一致；绝对路径未参与。它与保存十八文件的 JSON.stringify(files) 算法明确区分。
- [五张已检查截图清单](evidence/selected-evidence.json)、[下载产出清单](evidence/download-artifacts.json)、[关键作者结果与往返判断](evidence/artifact-roundtrip.json)。
- [真实 gizmo/ROI 语义](evidence/semantic-summary.json)、[两个归档 payload 摘要](evidence/archive-payload-summary.json)、[单次 headless 原始结果](evidence/headless-smoke.json)。
- [有界本地交付接受](release-acceptance.md)综合源码审查、自动化检查和此处证据接受六项修复；它没有把可见会话 exit1、六条 QA 注入错误、未执行 headful Run 或五项重复 E2E 改写成全程 clean PASS。

初始偏好注入未判断 origin，其实际片段为：

```javascript
await c.addInitScript(() => {
  localStorage.setItem("web3d.studio.locale", "zh-CN");
  localStorage.setItem("web3d.studio.theme", "light");
});
```

此代码对新页的 about:blank 也运行；受控复现的消息与堆栈保留在 headless-smoke.json 的 blankOriginReadProbe。原监听器没有保存堆栈，因此不能把后续 UtilityScript.evaluate 堆栈伪称原始六条的堆栈。后续 http/https guard 下仅一次无下载应用路径无错误，支持限定归因而非重写原始日志。
