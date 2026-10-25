# 不可信模型与归档输入边界

## 当前行为与目标

模型导入调用 Runtime 的 inspectGltf，播放通过 loadGltfAsset 进入 GLTFLoader。当前文本 glTF 会检查 buffers/images URI，GLB 只检查头部。目标是在两种入口对同一模型内容执行相同的自包含检查，阻止未经资产合同声明的资源请求。

Document 的 ZIP 导入先预检 central directory，再把整包交给 unzipSync。两者使用的条目计数字段不同。目标是仅解压已经过同一套预算与路径检查的条目，任何未被检查的数据不得成为解压输入。

## 模型资源政策

新增 Runtime 私有 helper，接受 ArrayBuffer 与已识别 mediaType，返回供 GLTFLoader 使用的原字节或文本。它验证 GLB 2.0 magic/version/总长度、chunk 完整边界和首个 JSON chunk，解析 JSON 对象，再检查 buffers/images 的 uri。文本 glTF 使用相同 JSON 检查。uri 缺省允许（GLB BIN/bufferView），字符串 data URI 允许；相对路径、绝对 URL、协议相对 URL、blob URI，以及非字符串 uri 均拒绝。损坏 JSON、资源列表类型或 GLB chunk 边界须在 parse 前失败。

inspectGltf 保留现有用户错误类别，模型外链仍映射为 INSPECT_GLTF_EXTERNAL_URI_UNSUPPORTED；Runtime 将政策失败映射为现有 ASSET_LOAD_FAILED 诊断并保留内部原因，不新增公开持久化字段。检测只检查资源位置，不按任意 JSON 中名为 uri 的字段阻断正常 extras。

两处 GLTFLoader 均使用受限制的 LoadingManager：只允许 data URI 与 loader 内部生成的 blob URL。安装版本 GLTFLoader 的 loadImageSource 会把 bufferView 图像转成对象 URL，因此禁止全部 blob URL 会破坏正常嵌入图像。主政策在 parse 前已拒绝 buffers/images 中的输入 blob URI，URL modifier 的 blob 放行只服务于这一已验证 JSON 的内部图像路径；不修改全局 URL.createObjectURL，也不对外层 AssetResolver URL 套用子资源政策。真实嵌入 bufferView 图像和 data URI 测试必须反证此限制不会阻断合法图像。

初始资产 resolver 的外层 URL/Blob 读取仍由现有 AssetResolver 负责，长度和 SHA-256 校验顺序保持。模型 JSON 外链检查在 GLTFLoader 前执行，因此从归档恢复或宿主直接加载也不能跳过。稳定 assetHash+nodeIndex 与 GLTF parser associations 不改变。

## ZIP 格式与条目权威

保留单磁盘、非 ZIP64、stored(0) 与 deflate(8) 普通 ZIP。拒绝分磁盘、加密、不支持压缩、ZIP64 sentinel/结构、截断字段、不一致计数和重复路径。EOCD 的 comment 长度必须结束于文件尾，central directory 必须按声明条目完整解析且精确结束于 EOCD 起点；目录记录不能藏在声明边界之外。

每条 metadata 增加本地头偏移、CRC/flags 和实际 compressed payload 范围。local header 的签名、名字、flags、compression 必须与 central record 一致；非 data-descriptor 条目本地 CRC/size 必须一致。合法 data descriptor 使用 central sizes，验证描述符（可选 signature）的 CRC/size 一致。payload 不得越过 central directory 或与别的本地条目范围重叠。stored 条目的 compressedSize 必须等于 uncompressedSize。UTF-8 名称解码、现有安全路径和 Unix 文件类型限制保持。

所有声明文件数、单文件字节数、总展开字节数在解压前计算并通过现有预算。压缩输入只来自已验证 payload slice。取消整包 unzipSync，逐条 stored 复制或 inflateSync 到固定的 declaredLength+1 输出缓冲。额外一个 guard byte 用于识别输出比声明更长的 deflate，不引入无界自动增长；实际返回长度必须等于 declaredLength。最大单次输出缓冲为 MAX_FILE_BYTES+1，聚合有效输出仍不得超过 MAX_TOTAL_BYTES。该边界保证输出分配有界，不宣称完整的 CPU 时间预算或防止所有异常高压缩比计算成本。

直接提取避免维护“预检 ZIP parser”和“执行 ZIP parser”两套条目发现规则。取舍是新增 local-header/descriptor 一致性验证；通过真实 archive fixtures、压缩变体和历史往返测试控制兼容性。不会更改 encoder 的确定性导出格式。

## 保存与恢复

输入失败不产生新项目快照或候选 runtime generation；已有项目、资产缓存与已渲染场景不被替换。原有 hash、manifest、语义验证仍执行。旧版本 SceneDocument 的迁移路径和当前保存/撤销/重做合同均保持。

## 实施与验收

先补真实 GLB external buffer/image、嵌入资源及 runtime 入口回归，再接入资源政策；随后以有界畸形 ZIP 验证条目集合/预算和合法 stored/deflate/descriptor 往返。测试同时断言 parser/fetch 或解压函数在预检拒绝时没有执行，不能只断言最终报错。

验收覆盖既有 factory 与恢复的 home 模型，确认相同 node index 和资源哈希继续可用。focused tests、typecheck、lint 与 build 均记录真实结果；浏览器验证普通导入/播放及拒绝后的可恢复状态。GPU 性能与长时间内存不属于本改动的收益声明。
