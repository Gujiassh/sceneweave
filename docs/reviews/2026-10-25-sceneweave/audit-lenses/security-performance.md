# 安全与性能审查（历史基线）

基线为 `main@0c5de5d`。结论包括两项 P1 输入问题、两项 P2 生命周期/性能问题；每项均区分代码证据、限定复现与尚未测量的影响。未修改产品、发出真实外部请求或扩大危险负载。

## R3 · P1：GLB 子资源绕过自包含限制

`inspect-gltf.ts` 的文本 glTF 分支拒绝外部 buffers/images URI，GLB 分支只校验 magic/version/length 后 parse。`asset-loader.ts` 同样只校验外层文件 SHA 与字节长度。388 字节 GLB JSON chunk 引用绝对外部 buffer 时，inspection 成功且 fetch 拦截器记录请求；同 JSON 的 .gltf 被拒。请求只返回本地 36 字节三角形，没有实际联网。

子资源字节不在外层 SHA/大小、AssetResolver 和外层取消信号控制内，破坏自包含和可复现性。此证据不代表 SSRF、凭据窃取、脚本执行或任意跨域读取。既有 M1 合同明确排除外部依赖文件/网络 URI。最小修复是 GLB JSON 与文本 glTF 共用 parse 前资源政策，并在直接 runtime 加载时再次执行；不能只修 Studio inspection。

## R4 · P1：ZIP 预检与执行器条目集合不同

`archive/zip.ts` 预检读取 EOCD +10 总条目数，原 unzipSync 使用 +8 本磁盘条目数。两个条目的 ZIP 将前者改为 1、目录声明缩到第一条时，预检只预算 manifest，解压器仍处理第二个隐藏条目。52,418 字节压缩包触发 53,477,376 字节展开，超 50 MiB 单文件预算，输出 Map 最后只保留 manifest。业务 manifest 后续拒绝不能撤销此前分配。

这证明内存/CPU 预算绕过，未证明代码执行、落盘写入或信息外泄。路径、重复项、普通声明预算、哈希与语义检查仍有价值。修复须对完整目录和本地范围形成一个条目权威，只提取已校验片段并在分配前应用预算；不能仅补计数相等检查后继续信任另一个整包解析器。

## R5 · P2：dispose 过早结清

viewport 记录 loadBarrier，dispose 只 abort 并释放当前资源、等待适配器 stop，没有等待公开 load 进入终态。限定测试等待 resolver 已进入但不响应取消，await dispose 后 load 仍 pending；释放 gate 后才 AbortError。单独新增断言运行 1 passed / 31 skipped，renderer 为 fake。

这与当时 architecture 的“所有自有工作停止后完成”承诺不一致；未证明 GPU 泄漏、销毁后可见修改。已有 abort 检查和最终清理阻止旧 generation 提交。修复须明确公共取消、底层不可取消工作与最终清理，不能盲等任意宿主 promise 导致永久挂起。

## R6 · P2：普通编辑全量逐实例解析

React source 变更进入 viewport；除 light-only 外建立完整 generation。runtime-generation 对每个 asset entity 顺序调用 loadGltfAsset，重新读、SHA、parse；相同资源的多个实例也重复。改名、变换、显隐、锁定和热点/绑定变更会沿此路径。71 实例/49 模型是场景规模，不是性能结论。

结构成本随整个场景增长，前一 generation 和候选资源在提交前并存。相机连续性修复未消除此成本。应先测 parse 次数、edit-ready 和资源趋势，再定义保守增量路径/有所有权的复用；保留原子完整替换，避免全局缓存的共享释放风险。历史审查没有 FPS、OOM 或显存泄漏数据。

## 修复后的回归入口

```powershell
pnpm exec vitest run packages/document/src/archive packages/runtime/src/assets
pnpm exec vitest run packages/runtime/src/viewer packages/runtime/src/authoring
node node_modules/vitest/vitest.mjs run --config benchmarks/runtime-edit-profile/vitest.config.mjs
```

这些命令验证修复后的合同，历史不安全行为的数据见上文；不会在当前源码上把接受恶意输入当作通过。

## 保留的防护与跟进边界

热点链接有 HTTPS、用户激活和 noopener/noreferrer；可信内容由宿主键解析。Publish loader 省略 credentials，验证路径、canonical 文档、哈希和长度。没有应用后端，不能强套服务鉴权/租户隔离建议。

历史记录无条数预算，但有结构共享，未证明每步复制 GLB。远端响应存在先 arrayBuffer 后实际大小检查的路径，流式预算应另行有界验证。没有做漏洞公告扫描、长期会话/GPU profile 或完整 ZIP fuzz；固定版本和静态检查不构成全仓安全保证。
