# topo-thinker（V1 MVP）需求说明

## 目标
- 解决“上下文污染”：阅读流不等于模型上下文，模型只看用户显式装配的上下文（规则 A）。
- 支持并行探索：从任意节点 fork 分支，并在 DAG 中管理。
- 支持稳定复用：用快照包（SnapshotPack）复用链路内容（拷贝，不受后续修改影响）。

## MVP 范围
- 路由：`/sessions`、`/sessions/:id`（可选：未来扩展 `/settings`、`/sessions/:id/graph`）。
- 会话详情页四区块：DAG 图画布 + 阅读流 + 装配面板 + 上下文预览抽屉。
- 本地持久化：`nodes` / `packs` / `assemblies`。
- 从装配清单生成 messages 预览（最终发送给模型的 messages）。

## 非目标（本期不做）
- 多人协作/权限系统。
- 指针式引用、合并（本期只做快照包复用）。
- 自动摘要压缩策略。

## 核心术语
- Node：`user | assistant | system | tool | summary`
- preferredParent：阅读/组织主链关系（不自动进入上下文）。
- SnapshotPack：从 sourceNode 沿 preferredParent 回溯到根得到的“根→目标”拷贝链。
- ContextAssembly：某个节点的装配清单（附着的 packs 列表、顺序、启用/裁剪）。

## 交互验收（MVP）
- Fork：从任意节点创建新节点/新路径；新节点继承父节点装配清单。
- 显式装配：在选中节点视角下，通过快捷键点选将其它节点链路装配进上下文。
- 亮/灰：在选中节点视角下，ACTIVE 节点亮起、INACTIVE 置灰；图与阅读流同步。
- 预览：抽屉中可看到“这次会喂给模型的 messages”，并支持裁剪起点、临时开关与调整顺序。
