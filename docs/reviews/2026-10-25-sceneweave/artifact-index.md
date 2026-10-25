# 本轮产出清单与证据身份

本清单连接实际结果与项目文件。原始可见会话曾发生十六次 JSON、两次 ZIP 下载；文档归档没有再次触发下载，也没有把十八个重复输出全部复制进项目。

## 源码身份

- [596 项相对源码清单](evidence/qa-source-manifest.json)：产品、配置、测试和资产，不含文档关闭。记录的 QA 组合摘要为 `4c73ff2cddd1267c6e6e2d52336d1ee31623aedfd285b39e6e174ec3cc09ba5b`。该摘要按 `files` 的现有顺序取 `path:sha256`，以 LF 连接、无尾 LF，对 UTF-8 字节计算 SHA-256；顺序来自生成清单时的 PowerShell Sort-Object。绝对路径没有参与摘要，公开清单删除它们后仍可重算得到同一 `4c73...`，已核对一致。
- [四次源码核对](evidence/qa-source-checks.json)：可见 before/after、headless before/after 各 596 项全部匹配。
- [保存最终独审十八文件](evidence/persistence-reviewed-files.json)：组合摘要 `24f7ef5ec704d45eb5a7806a91a57b75aaeecb22a0928562a6c7b23cd118fe33`，算法为 `SHA256(UTF8(JSON.stringify(files)))`；五项是 Prettier 3.9.5 的严格等价转换，十三项未变。格式前清单作为[历史审查快照](evidence/persistence-reviewed-files-pre-format.json)保留。
- [输入八文件审查](evidence/input-reviewed-files.json)与[运行时审查](evidence/runtime-reviewed-files.json)保留各自审查时点。之后的文档关闭可以改变报告字节；产品最终状态由上述 596 项清单绑定。

## 实际作者文档与归档结果

| 产出               | 项目内证据                                                            | 实际判断                                                                                             |
| ------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| R1 撤销后保存文档  | [r1-undone-saved.json](evidence/r1-undone-saved.json)                 | revision 3；资产列表恢复初始，新增导入实体已移除                                                     |
| R1 继续编辑后文档  | [r1-edited-after-undo.json](evidence/r1-edited-after-undo.json)       | revision 6；与切换/重开/刷新后的文档完整相等                                                         |
| 全部已发生下载     | [download-artifacts.json](evidence/download-artifacts.json)           | 十六 JSON、两 ZIP 的名字、字节、SHA、文档摘要；明确是否实际复制进仓库                                |
| 往返语义           | [artifact-roundtrip.json](evidence/artifact-roundtrip.json)           | R1 引用恢复/实体移除、编辑后重开精确相等、合法输入归档恢复文档相等                                   |
| ZIP payload        | [archive-payload-summary.json](evidence/archive-payload-summary.json) | R1 归档 1,045,450 字节/51 条目/r6/49资产；合法输入归档 1,048,163 字节/52条目/r2/50资产，均有完整 SHA |
| gizmo 与画面连续性 | [semantic-summary.json](evidence/semantic-summary.json)               | sofa X -4.25→-3.8900000107288357；undo/redo transform 精确恢复；461,760 像素区域阈值差异为零         |

两个 ZIP 的完整二进制未再次复制到 docs。其真实 download 身份、解压条目与文档摘要、当前关键 JSON 和永久回归共同保存必要判断；不能把未复制二进制的清单误称为新的构建产物。

## 五张可见操作截图

下列图片已经可见 QA 实际查看，并在复制时逐项检查字节/哈希与[选择清单](evidence/selected-evidence.json)一致。它们是 headful 实际操作截图。

| 截图                                                                          | 支持的观察                           |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| [fresh-home-1440.png](evidence/fresh-home-1440.png)                           | 完整默认户型、家具与布局             |
| [r2-conflicting-live-copy.png](evidence/r2-conflicting-live-copy.png)         | 冲突提示、另存按钮及仍保留的本地模型 |
| [r2-copy-reopened.png](evidence/r2-copy-reopened.png)                         | 独立副本刷新后恢复新增模型           |
| [input-embedded-image-visible.png](evidence/input-embedded-image-visible.png) | 实际嵌入图像解码并聚焦显示           |
| [runtime-moved.png](evidence/runtime-moved.png)                               | 实际鼠标 gizmo 移动后的模型与控件    |

## 验收流程与错误记录

[原可见结果摘要](evidence/qa-run-results-summary.json)保留四组 PASS、一组因脚本定位失败的 FAIL、exit1、六条 SecurityError 和下载数量，没有伪称全程 clean PASS。[单次后台 Run/Edit](evidence/headless-smoke.json)另记零下载、零正常应用错误、作者文档/token/revision 未变和 blank-origin 受控复现堆栈，不能代替原可见 Run 验收。

[完整浏览器报告](browser-verification.md)说明下载干扰后的停止与更少干扰的验证取舍。[集成检查](integration-verification.md)和[生成物逐项证据](evidence/generated-cleanup-evidence.json)记录自动化结果及十四项无关生成输出的恢复。

## 只读复核

在仓库根目录运行：

```powershell
node docs/reviews/2026-10-25-sceneweave/verify-evidence.mjs
```

该命令只读取归档 JSON、图片、下载哈希和语义摘要，不启动浏览器或触发下载。追加 `--current-source` 可核对当前产品是否仍与本次 596 项清单一致；这项源码身份是本次运行的原字节快照，跨不同 EOL checkout 或将来产品有效修改后都可能不同；失败不意味着历史证据被改写，也不是永久跨平台质量规则。归档 JSON 有 Git `-text`、证据目录不接受格式器重写，默认只校验这些可持续归档证据；[归档文件身份](evidence/evidence-manifest.json)单独覆盖每个证据文件的长度与 SHA。
