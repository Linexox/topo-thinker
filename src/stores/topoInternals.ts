import type { ContextAssembly, SessionData, SnapshotPack, TopoNode } from "@/types/topo"
import { buildSnapshotPackNodes } from "@/utils/context"
import { createId, createShortId } from "@/utils/id"

export function cloneSession(s: SessionData): SessionData {
  return {
    ...s,
    nodes: { ...s.nodes },
    packs: { ...s.packs },
    assemblies: { ...s.assemblies },
    ui: { ...s.ui },
  }
}

export function getOrCreateAssembly(session: SessionData, nodeId: string): ContextAssembly {
  const existing = session.assemblies[nodeId]
  if (existing) return existing
  const created: ContextAssembly = { nodeId, attachedPacks: [] }
  session.assemblies[nodeId] = created
  return created
}

export function normalizeOrders(assembly: ContextAssembly) {
  const sorted = [...assembly.attachedPacks].sort((a, b) => a.order - b.order)
  assembly.attachedPacks = sorted.map((p, idx) => ({ ...p, order: idx + 1 }))
}

export function findReusablePack(session: SessionData, sourceNodeId: string) {
  return Object.values(session.packs).find((p) => p.sourceNodeId === sourceNodeId && p.strategy === "path_to_root")
}

export function createSnapshotPack(session: SessionData, sourceNodeId: string): SnapshotPack {
  const chain = buildSnapshotPackNodes(sourceNodeId, session.nodes)
  const packId = createId("pack")
  return {
    packId,
    shortId: createShortId(),
    sourceNodeId,
    createdAt: Date.now(),
    strategy: "path_to_root",
    orderDirection: "root_to_source",
    nodes: chain.map((n) => ({
      packNodeId: createId("pnode"),
      originalNodeId: n.id,
      type: n.type,
      content: n.content,
      createdAt: n.createdAt,
    })),
    defaultCutIndex: 0,
  }
}

export function isAncestor(potentialAncestor: string, target: string, nodes: Record<string, TopoNode>): boolean {
  let curr = nodes[target]
  while (curr && curr.preferredParentId) {
    if (curr.preferredParentId === potentialAncestor) return true
    curr = nodes[curr.preferredParentId]
  }
  return false
}

export function createSeedSession(seedId?: string): SessionData {
  const now = Date.now()
  const sessionId = seedId ?? createId("sess")
  const rootId = createId("n")
  const user1Id = createId("n")
  const assistant1Id = createId("n")

  const nodes: Record<string, TopoNode> = {
    [rootId]: {
      id: rootId,
      type: "system",
      content: "这是一个用 DAG 管理推理分支的会话。阅读流不等于模型上下文。",
      createdAt: now,
      position: { x: 0, y: 0 },
    },
    [user1Id]: {
      id: user1Id,
      type: "user",
      content: "我想并行探索同一个问题的多个方案，并确保上下文不串线。",
      createdAt: now + 1,
      preferredParentId: rootId,
      position: { x: 240, y: 80 },
    },
    [assistant1Id]: {
      id: assistant1Id,
      type: "assistant",
      content: "可以从任意节点 fork 分支，并用显式装配决定模型看到哪些内容。",
      createdAt: now + 2,
      preferredParentId: user1Id,
      position: { x: 480, y: 160 },
    },
  }

  return {
    id: sessionId,
    title: "示例会话",
    createdAt: now,
    nodes,
    packs: {},
    assemblies: {
      [assistant1Id]: { nodeId: assistant1Id, attachedPacks: [] },
    },
    ui: { selectedNodeId: assistant1Id, chatViewMode: "primary" },
  }
}

