# 组合源码自动化检查与生成物处理

## 本次检查范围

基线 `main@0c5de5d` 上合并保存、输入和运行时三项工作区改动。以下是卸载 pending-save 返工后的自动化检查记录，实际可见与单次 headless 补测另见[浏览器报告](browser-verification.md)，范围内纯格式整理已完成独立等价复核并刷新保存十八文件身份。

| 命令                     | 实际结果                                                                        |
| ------------------------ | ------------------------------------------------------------------------------- |
| `pnpm test`              | 132 文件 / 907 测试通过；此前 905 测试通过是返工前快照                          |
| `pnpm typecheck`         | 根配置与各包/Studio/minimal-host 类型检查通过                                   |
| `pnpm lint`              | 通过                                                                            |
| `pnpm build`             | 各包、Studio 与 minimal-host 构建通过；minimal-host noEval/loaderRoundTrip 通过 |
| `pnpm verify:i18n`       | 通过                                                                            |
| `pnpm verify:topology`   | 通过                                                                            |
| `pnpm verify:docs`       | 文档测试与文档门禁通过                                                          |
| `pnpm verify:assets`     | 87 tracked / 86 unique 模型，通过 Khronos 检查且错误/警告为零；许可校验通过     |
| 全仓 `pnpm format:check` | **未通过：613 项格式提示**；不能记录为全仓格式 PASS                             |

构建仍报告大于 500 kB 的 chunk 提示；此任务没有通过提高阈值或分包来掩盖提示，也没有宣称包体优化。资产 tracked 总计 1,515,964 字节、unique 1,514,748 字节，与既有验收资产相同。

全仓格式提示主要涉及基线格式及 Windows CRLF。抽样 AGENTS 的 HEAD 为 LF、工作树为 CRLF，换行规范化后相同。没有对数百文件批量格式化；仅本轮六个明确改动文件做局部 Prettier 收尾，五个源/测试文件严格格式等价、十三项冻结源不变，JSON 快照规范化不算业务变化。局部格式检查通过；未把它推广为全仓格式绿色。不能据样本推定所有历史提示均已处理。

## 十四个构建生成文件精确恢复

Typecheck/build hooks 重生成十四个 tracked 输出，这些不属于三项实现源文件，生成器/schema/publish bundle 源码没有变化。逐项证据见 [generated-cleanup-evidence.json](evidence/generated-cleanup-evidence.json)。

十个 validator `.js/.d.ts` 与 published scene/manifest JSON 经 CRLF/LF 规范化后字节相同，未改变 validator/schema/场景含义。Published ZIP 三个路径、解压内容与 CRC 完全相同，只有条目时间从 HEAD 的 1980-01-01 09:00:00 变为本 Windows 生成的 08:00:00。未改的 encoder 使用 UTC Date，再由 fflate 按本地时区写 ZIP metadata；fixture-report 仅相应 ZIP digest 变化，文件 payload 哈希和长度相同。

检查后仅用显式十四路径将工作树恢复为 HEAD；未恢复任何源代码、schema、模型或其他修复，也未 reset index、提交或推送。没有再次运行 build 以重新制造同一生成差异。该操作是去除不相关输出，不是修复跨时区的 ZIP 字节可复现性；后者保持既有跟进事项。

## 证据边界与剩余验收

上述自动化结果不代替真实 3D 图像、浏览器解码、双标签恢复或 GPU profile。三个限定源码独审均已记录，保存独审发现的 P1 已返工闭环；实际可见范围、headless 限定补测、格式后身份和本地有界交付判断已补齐，见[验收说明](release-acceptance.md)。[改造日志](remediation-log.md)保留阶段变化，不把先前的绿色结果回写成未经执行的后续结果。

## 原字节证据的格式政策

本次仅在根 `.prettierignore` 增加 `docs/reviews/**/evidence/`，归档生成验证证据不由格式器重写。尤其两份真实下载的 SceneDocument JSON 保留原始字节，SHA 与下载清单一致；对它们运行 Prettier 后再声称原下载哈希会使证据失真。根 `.gitattributes` 另将 `docs/reviews/**/evidence/*.json` 标为 `-text`，防止 core.autocrlf 在后续 checkout 改写归档 JSON 行尾；PNG 继续按 Git 二进制处理。`git check-attr` 对两份真实下载的 text 均返回 unset，范围没有扩大到产品 JSON 或源码。其他正文与手写方案照常格式检查，evidence 单独进行 JSON parse、路径/哈希、实际下载身份和 roundtrip 语义校验。此规则不排除产品源代码，也不修复或隐藏既有全仓格式提示。

## 最终文档与证据复核

本批文档及三个 OpenSpec 共 36 份 Markdown、161 个本地链接，存在性核查无缺项。三项 change 的 strict 校验、项目 verify-docs、正文/手写文件与本轮保存格式目标的 scoped Prettier 检查通过；根 ignore 文件按路径规则人工核对，不作为有解析器的格式化文件。证据目录二十份 JSON 均可解析，二十八个被清单覆盖的证据文件哈希/长度匹配，保留的两份真实下载字节与原清单一致，R1/输入往返及 gizmo 判断通过。只读验证另核对当前 596 项产品源码全部一致；该源码身份是本次运行的原字节快照，跨不同 EOL checkout 或后续有效修改可能变化，不是永久跨平台代码质量规则。

证据核验命令为 `node docs/reviews/2026-10-25-sceneweave/verify-evidence.mjs --current-source`；该工具只读文件，没有 browser、download 或 build 调用。其 ESLint 单文件检查通过。公开路径/协作身份/私有提示扫描无命中，根 ignore 与所有归档新增内容的 diff whitespace 检查通过。最终记录保留全仓 format 未绿及浏览器原 exit1 等限制。
