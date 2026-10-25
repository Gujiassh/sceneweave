# 项目保存安全设计

## 当前行为与改造范围

Studio 通过命令历史生成单调递增的 SceneDocument revision，活动项目同时持有文档与可用 Blob。repository.save 会校验所有输入 Blob 都被当前文档引用，并在同一 IndexedDB 事务中写入项目、资产和最近项目记录。撤销新模型导入后，文档已移除资产引用，活动资源池仍保留该 Blob；直接保存整个资源池因此失败。资源池必须继续支持 redo，不能因撤销而清空。

另一个问题发生在两个连接打开同一项目后：当前事务会读取 existing，却没有检查保存者读取的存储版本。后保存的旧分支，包括相同 document.revision 的不同内容，可以覆盖已保存内容。本次增加存储比较与交换（CAS）：只有保存请求的基准版本仍匹配数据库版本，才允许提交。

改动仅涉及 Studio 保存边界及恢复界面。SceneDocument 1.4、历史命令含义、稳定 Target 的 hash/nodeIndex、JSON/ZIP 内容与原子项目/资产事务保持不变。模型加载、runtime 和归档编解码不在范围内。

## 活动资源池与保存输入

活动 `StudioProjectSnapshot.assets` 表示当前会话可用的资源池，允许包含仅被 undo/redo 历史引用的 Blob。新增私有投影函数 `projectForPersistence(snapshot)`，以 `snapshot.document.assets` 的 SHA 集合筛选输入 Blob；原快照、Blob 与历史均不修改。

既有项目的 autosave、手动保存、模型导入提交和冲突副本保存使用该投影。新建/规范文件导入的候选本身仅携带当前引用字节，仍通过仓储完整性校验。repository.save 继续拒绝未引用的输入 Blob，并继续要求文档引用的每个 SHA 已存在于输入或资产仓库。保存投影后的返回 assets 不可替换活动资源池；只将返回的保存元数据合并到当前项目。未引用的已存资产本次不做垃圾回收。

因此 import → undo → save 可持久化移除资产后的文档；redo 仍能从活动池或内容寻址资产仓库取到原字节，再次保存也有效。

## 存储版本及兼容路径

`ProjectRecord.storageVersion` 是 Studio 仓储元数据，类型为可选的 `string | null`，不进入 SceneDocument、JSON 或 ZIP。字符串为仓储生成的随机不透明 token，不以 revision、名称或更新时间推导。输入与返回的含义如下。

| 输入值     | 含义                                       | 同事务提交条件            |
| ---------- | ------------------------------------------ | ------------------------- |
| 字段缺失   | 新项目创建                                 | 同 ID 记录不存在          |
| null       | 显式打开的旧无 token 记录                  | 记录存在且仍无存储 token  |
| 非空字符串 | 从仓储读取或本会话成功保存得到的基准 token | 记录存在且 token 完全相等 |

旧存储记录不需要修改 documentJson 或整体重写。open/listRecent 将缺失 token 映射为 null；第一次成功保存旧记录时建立随机 token。两个同时打开旧记录的连接只有一个能完成首次写入，其余请求收到冲突。创建请求与旧记录写入使用不同前提，避免新 ID 碰撞覆盖旧记录。数据库对象仓库结构不变。

CAS 检查放在已有 projects/assets/settings readwrite 事务内，先读取 existing 并比较，检查失败则在任何 put/settings 更新前中止。资产字节校验可保持在事务前，资产写入仍与项目提交原子一致。冲突不得改变文档、资产、last-project、最近项目顺序或导出元数据。

成功写入新文档内容时生成新 token；合法基准下 canonical documentJson 与内容寻址资产集合未变化的保存保留原 token。旧记录首次保存即使文档未变也建立 token。open、recency 和 metadata-only markExported 不推进文档 token。document.revision 继续只描述命令历史，不能代替 CAS。

保证范围是采用此仓储实现的连接。升级前已加载、完全不执行 CAS 的旧应用代码不能被新增可选字段约束，需重新载入后参加新合同；本次不引入会阻塞旧连接的数据库版本升级。

## 同会话排队保存

保留现有 autosave 单队列。新增小型 `ProjectWriteAuthority` 私有对象，每次激活项目时从 open/save 返回记录初始化，保存 project ID、当前已接受 token 和冲突状态。它不拥有文档、历史或 Blob，也不读取数据库来自动更新冲突基准。

队列开始一次保存时，使用该对象最新的本会话成功 token 加上该快照的保存投影。r1 保存成功期间排入的 r2 可以使用 r1 返回的新 token；外部连接写入不会更新此对象，所以仍被数据库 CAS 拒绝。模型导入提交先 flush 原队列，再通过同一权威保存候选快照；禁止保留直接绕过 CAS 的导入写入。每个异步操作在 await 前捕获其权威对象，项目 ID 不匹配时拒绝使用。

明确重新打开项目才创建新的写入基准。冲突处理不得通过 open 最新记录、替换 token、再自动 retry 的方式覆盖胜者。

## 导出元数据确认

`markExported` 增加显式 expectedStorageVersion 参数。在 projects 事务内先检查当前文档 token，随后仅单调合并 lastExportedRevision；不改 token、documentJson、lastSavedRevision、时间、LAST_PROJECT_KEY 或 recency。

导出继续先 flush 捕获的文档快照，再生成既定字节。完成时使用该导出捕获的权威对象所知道的最新本会话 token。同会话后续正常保存可继续确认较早导出；未知外部分支写入则拒绝确认，避免相同 revision 的另一分支被误标为已导出。A 导出后切 B，旧 A 的确认不得改变 B 的会话或恢复界面。

## 冲突与另存副本

CAS 拒绝使用结构化 PROJECT_SAVE_CONFLICT。失败方的活动文档、完整历史、选择及资源池保持原样，保存状态明确显示失败和未保存；允许继续编辑本地副本。自动保存停止重试，autosave 增加一个仅清除待处理快照/定时器的内部方法，在冲突失败状态发出后使用，防止旧快照在副本激活后再次回放。

界面显示本地化提示“其他标签页已保存此项目，你的修改仍保留在这里”，提供“另存副本”。冲突期间常规保存不能直接覆盖胜者。项目切换和导出若必须先 flush 原项目，则保持失败并引导使用副本。对尚未保存的冲突副本注册普通 beforeunload 提示，避免无提示离开；浏览器最终允许的离开行为仍由用户决定。

“另存副本”直接使用新的随机 ProjectRecord ID 和创建前提保存当前引用投影，原项目不写入。副本文档的 ID、名称、revision 和作者内容保持原样，活动资源池与完整 undo/redo 历史保留；只有本地项目身份、创建/保存记录及独立导出状态重新建立。成功后切入该副本，标记当前 revision 已保存，显示“已保存为独立副本，可继续编辑或重命名”。如需新名称，随后使用已有显式重命名操作，不在复制过程中插入会清空 redo 的隐式命令。两个同名项目仍以稳定项目 ID 区分。

复制失败则原冲突副本及恢复入口继续存在。跨标签页 LAST_PROJECT_KEY 仍保持既有“最近使用项目”含义；本次不增加每标签页恢复指针或协同合并功能。

## 符号与调用点迁移

| 现有符号/调用点                                                   | 目标职责                         | 实施约束                                          |
| ----------------------------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| StudioProjectSnapshot.assets / withProjectDocument                | 保留活动资源池                   | undo/redo 不删 Blob，不把保存返回投影安装成活动池 |
| repository.save(snapshot)                                         | 投影输入的严格校验及事务 CAS     | 新建/旧记录/版本化记录三个前提；先 CAS 后 put     |
| stripDocumentJson / open / listRecent                             | 返回存储版本基准                 | 缺失旧 token 显式返回 null；不改文档              |
| workspace autosave save callback                                  | 投影保存与成功元数据合并         | 使用当前激活的写入权威；保留同页新编辑            |
| confirmImport 直接 repository.save                                | 先 flush，再通过同一写入权威提交 | 成功才安装候选历史与资源池                        |
| createProject / importJson / importArchive / initializeRepository | 新 ID 创建并采用返回 token       | 不把旧项目 token 带入新 ID                        |
| exportProject / repository.markExported                           | 权威匹配的元数据确认             | ack 不推进文档 token，不误标等 revision 分叉      |
| AutosaveController                                                | 既有顺序执行及冲突后的待处理清除 | 不取消正在执行的事务，不静默丢失活动副本          |
| App / workspace.saveCopy / 本地化错误                             | 可见冲突恢复                     | 新项目原子保存，保持原项目与本地历史              |

## 实施与验收

先保留既有保存、原子资产、导出确认、导入锁和切换测试。使用真实命令历史和 fake-indexeddb 仓储写出当前故障的失败回归，再实施投影与 CAS。新增 workspace 组合测试只替换数据库工厂/时钟，不使用宽松 save mock。

仓储必须覆盖两个真实连接从同一基准写不同较低 revision、相同 revision 分叉；失败后整个存储记录、资产与 settings 不变；独立项目互不影响；旧无 token 首次竞争、无变更保存、元数据确认与普通保存并发、同页 r1/r2 排队无自冲突。workspace 必须覆盖新模型 import → undo → autosave/manual save → 继续编辑 → export/switch/reopen，并分别走 redo 与另存副本，检查实体、资源字节和历史。

真实浏览器使用两个共享同一 IndexedDB 的隔离测试标签页，通过普通 UI 编辑/保存：胜者刷新保留；失败方显示冲突且继续保留其本地模型/修改；另存副本后刷新可恢复独立项目，原项目仍为胜者内容。补导出确认不引发误冲突的用户路径。断言可读取 IndexedDB 和实际下载文档，不能直接写业务状态代替操作。

最终运行相关单测、类型、lint/build、本地化和影响到的 E2E；记录原有失败、逐项结果和限制。性能、跨旧版本应用并发、云同步和自动合并不在本次保证范围内。

## 实施决策与当前验证

写入权威内部使用一条短 Promise 链，将同会话文档 save 和 markExported 串行执行；autosave 继续负责合并待保存快照。这个顺序防止确认导出已捕获旧 token、同会话新保存却先提交而产生假冲突，token 始终在具体事务开始前取该权威自己的成功基准。旧导出保留捕获的权威对象，不能向 A→B→A 后的新对象合并结果；最近项目异步刷新也执行相同对象校验。

迁移已完成：保存回调与模型提交使用 `ProjectWriteAuthority.save`；新建/文件导入仍为新 ID 的创建请求；冲突另存通过 `projectForPersistence` 原子创建新记录并保留活动资源池及原 history；markExported 的全部实际调用增加 expectedStorageVersion。现有原子写入测试改为传入真实成功保存返回的基准，保留故障注入与回滚断言。原反序确认测试改为先发导出组装慢、后发导出先完成的可达顺序，仓储仍直接测试元数据最大值。

初始失败回归复现了双连接陈旧写被接受及真实 workspace 撤销导入后 ASSET_NOT_REFERENCED。当前相关项目/工作区/App 测试 57 项通过；真实可见 Chrome 自验两条路径通过：新 GLB 导入→撤销自动保存→重做→导出/再次保存→刷新，以及两个普通标签页的等 revision 分叉→冲突保留→另存副本→刷新。最终集成检查与独立验收结果另行记录，不将当前自验视为完整结论。

## 卸载保存修正

收尾回归发现：effect cleanup 立即清空全局 authorityRef 后，autosave.close 排空未到 debounce 的最后快照时会读到 null，导致最后编辑未保存。真实仓储失败回归明确观察到数据库仍为旧名称。

每个 effect 生命周期现在在 cleanup 开始时捕获 closingAuthority，再设置 active=false 并清全局引用。旧 close 的保存回调只使用该捕获对象；新 effect 即使激活同一项目，也不会被旧回调取作写入基准。UI 仍由 active 和权威对象身份共同阻挡旧回写。真实 StrictMode 与 Activity 隐藏/重显测试将旧 r1 保存延迟、排入 r2，再激活同 ID 新会话；旧队列以自己的 token 完成，新的文档/状态不变，其后新会话继续用原基准得到正确冲突。测试使用有界操作等待及 finally 释放，不屏蔽 act 警告。
