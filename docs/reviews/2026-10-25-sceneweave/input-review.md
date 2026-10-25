# 输入安全独立审查：R3 / R4

## 结论与源码范围

**限定源码审查通过，无 P0/P1 阻塞或必要代码返工。** 组合自动化检查与实际可见输入/恢复证据已完成，支持本地有界接受；此结论不接受并行保存改动，也不代表全仓无安全风险。

审查基线为 `main@0c5de5d` 上的未提交修复。范围是 `packages/document/src/archive/zip.ts` 与新增测试，以及 runtime 的 `gltf-resource-policy`、`inspect-gltf`、`asset-loader` 和各自测试，共八个产品/测试文件。准确哈希见 [input-reviewed-files.json](evidence/input-reviewed-files.json)。审查只读，未编写产品修复。

先核对 [OpenSpec 方案](../../../openspec/changes/untrusted-input-safety/proposal.md)、[设计](../../../openspec/changes/untrusted-input-safety/design.md)、两项能力场景、验证及交付记录，再检查真实 diff、生产调用与安装版本的 fflate/Three 实现。约束是保留 SceneDocument/归档版本、AssetResolver 外层所有权、SHA 与 nodeIndex、确定性导出和合法嵌入资源。

## ZIP 条目权威与有界分配通过

`decodeArchiveZip` 只提取 `inspectZipMetadata` 验证后的片段，不再把整包交给第二个条目发现解析器。EOCD 单磁盘字段、两类计数、完整目录末端、UTF-8 路径、flags、压缩方式、本地名字/CRC/size 元数据、descriptor 边界和范围重叠均在输出分配前检查。隐藏目录和矛盾条目数不能进入解压。

Stored 片段按确定长度复制；deflate 显式提供 `declaredLength+1` 输出缓冲。检查安装的 fflate 实现后，独立试验用真正的 4096 字节展开、仅三字节输出缓冲，确认结果仍使用**同一三字节 backing buffer**，不会自动扩容；声明两字节时返回三字节随后被拒。这证明输出分配有界，不能推广为完整 CPU 时间预算。

普通 stored/deflate、带签名和无签名 descriptor、历史归档及 Publish 消费往返通过。Encoder 不变。CRC 字段一致性检查不等于重算任意 payload CRC；有效业务 payload 的完整性仍由已有 SHA-256 验证保证。没有承诺兼容全部 ZIP 扩展或任意生产器。

## GLB 与文本资源边界通过

两种容器共同校验真正交给 GLTFLoader 的 JSON，GLB 要求首 JSON、完整 chunk 边界且无重复 JSON/BIN。外部或畸形 buffers/images URI 在 parse 前拒绝。inspection 与直接 runtime load 都调用同一政策，后者先保留外层字节长度/哈希校验，不能通过绕过 Studio inspection 逃过规则。

受限制 LoadingManager 阻止网络/相对依赖，允许 data 和内部图像 blob URL。输入 JSON 中的 blob URI 已提前拒绝；Three 的 bufferView 图像路径内部确实会创建对象 URL，因此全部禁止 blob 会误伤合法图片。测试保留真实 BIN/data URI 与 GLTFLoader 依赖路径，只替换平台 bitmap decode；它不是浏览器解码/GPU 的证明。

原外链错误码 `INSPECT_GLTF_EXTERNAL_URI_UNSUPPORTED` 保留。损坏 GLB JSON 现在更早得到 `INSPECT_GLTF_JSON_INVALID`，而不是 parser 阶段的 `INSPECT_GLTF_PARSE_FAILED`；变化已记录并有测试。Runtime 继续使用 `ASSET_LOAD_FAILED` 包装政策失败，hash/node association 逻辑不改。

## 独立验证

在仓库根目录执行：

```powershell
node node_modules/vitest/vitest.mjs run packages/document/src/archive packages/runtime/src/assets
node node_modules/vitest/vitest.mjs run packages/document/src/archive/zip.test.ts packages/document/src/archive/archive.test.ts packages/runtime/src/assets/gltf-resource-policy.test.ts packages/runtime/src/assets/inspect-gltf.test.ts packages/runtime/src/assets/asset-loader.test.ts packages/publish/src/bundle-loader.test.ts
```

第一组选取六文件、108 测试通过；第二组选取六文件、100 测试通过，补充 Publish 消费链，两个数字不是独立测试总和。另一个有界独立探针确认原计数绕过被拒、上述固定缓冲事实，以及 GLB inspection 和直接 runtime 均在零 fetch 的情况下拒绝外部 buffer；manager 的网络/相对 URI 拒绝与 data/blob 机制保持。没有实际外部联网。Scoped `git diff --check` 通过，仅有 Windows 换行提示。

工程的 document/runtime 直接 tsc、局部 ESLint/Prettier 结果已阅读，独审没有再次执行全部静态命令；最终集成检查仍需绑定组合后的源码。

## 测试形成过程与剩余边界

新增 39 项回归的初轮为 33 fail / 6 pass，其中两项失败是 Node `self` 平台环境缺失，不列为产品 bug。合法图片 fixture 曾重新生成为有效 PNG，并使用 PNG decoder 校验。旧 mock 中任意四字节/仅头部 GLB 已换成合法容器，未关闭政策来迁就测试。

实际家居、嵌入图片解码、模型/ZIP 拒绝恢复已完成，见[浏览器证据](browser-verification.md)；当前工厂示例未另做可见复验，Publish/fixture 消费回归提供相应自动化支持。尚未解决或声称解决 hostile-deflate 完整 CPU 预算、远端流式读取预算、巨型解码图像/accessor、长期内存、GPU 或依赖公告安全。当前无需代码返工；后续状态见[改造日志](remediation-log.md)。
