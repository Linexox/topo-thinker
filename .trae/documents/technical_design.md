# topo-thinker（V1 MVP）技术方案

## 技术栈
- React + TypeScript + Vite
- 路由：react-router-dom
- 状态：zustand（单 store，分 slice）
- 本地持久化：LocalStorage（MVP）；数据结构兼容未来切换 IndexedDB
- 图画布：React Flow（缩放/平移/选中/连线）

## 数据模型（前端）
### Node
- `id: string`
- `type: 'user' | 'assistant' | 'system' | 'tool' | 'summary'`
- `content: string`
- `createdAt: number`
- `preferredParentId?: string`
- `forkedFromId?: string`
- `position?: { x: number; y: number }`

### SnapshotPack
- `packId: string`
- `shortId: string`
- `sourceNodeId: string`
- `createdAt: number`
- `strategy: 'path_to_root'`
- `orderDirection: 'root_to_source'`
- `nodes: PackNode[]`
- `defaultCutIndex: number`

### ContextAssembly
- `nodeId: string`
- `attachedPacks: AttachedPack[]`

### AttachedPack
- `packId: string`
- `order: number`
- `enabled: boolean`
- `cutIndexOverride?: number`

## 关键算法
### 1) 生成 SnapshotPack（path_to_root）
- 从 `sourceNodeId` 沿 `preferredParentId` 回溯到根，得到节点链；
- 复制成 `PackNode[]`，顺序固定为“根→目标”。

### 2) 由装配清单生成 messages
对节点 N 发送：
- 取 `assembly(N).attachedPacks` 中 `enabled=true`，按 `order` 排序；
- 每个 pack：`start = cutIndexOverride ?? defaultCutIndex`，展开 `pack.nodes[start..]`；
- 追加本次用户输入为最后一条 `user`。

### 3) ACTIVE 集合
- 在选中节点视角下，将其装配清单展开成 `Set<originalNodeId>`，用于图与阅读流的亮/灰同步。

## 持久化
- LocalStorage key：`topo-thinker:v1`
- 存储：sessions map（按 sessionId 分桶），至少包含 `nodes/packs/assemblies`。
