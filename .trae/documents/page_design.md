# topo-thinker（V1 MVP）页面与组件设计

## 路由
- `/sessions`：会话列表（新建/进入）
- `/sessions/:id`：会话详情（核心）

## 会话详情布局
- 左：GraphCanvas（缩放/平移/选中节点；快捷键点选装配）
- 中：ChatStream（阅读流，主链/时间流切换；亮/灰同步）
- 右：ContextAssemblyPanel（装配清单：pack 列表、顺序、启用、裁剪、重新生成）
- 底部：Composer（输入框 + 打开预览抽屉）
- 抽屉：ContextPreviewDrawer（最终 messages 预览 + 轻量调整）

## 关键交互
- 点击节点：切换 `selectedNodeId`（视角切换）
- Cmd/Ctrl+点击节点：将该节点的“根→目标”快照包 attach/detach 到“当前选中节点”的装配清单
- Fork：在节点卡片上创建子节点（`forkedFromId=source`，`preferredParentId=source`），并继承装配清单

## 视觉状态
- ACTIVE：在当前选中节点的装配展开集合内（亮）
- INACTIVE：不在集合内（灰）
- 阅读流强调“阅读≠上下文”，但可通过状态提示审计装配范围
