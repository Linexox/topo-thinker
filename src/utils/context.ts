import type { ContextAssembly, MessageRole, PreviewMessage, SnapshotPack, TopoNode } from "@/types/topo"

export function buildSnapshotPackNodes(sourceNodeId: string, nodes: Record<string, TopoNode>): TopoNode[] {
  const chain: TopoNode[] = []
  const visited = new Set<string>()
  let current: string | undefined = sourceNodeId

  while (current && !visited.has(current)) {
    visited.add(current)
    const node = nodes[current]
    if (!node) break
    chain.push(node)
    current = node.preferredParentId
  }
  return chain.reverse()
}

function messageRole(type: TopoNode["type"]): MessageRole {
  if (type === "assistant" || type === "system") return type
  if (type === "summary") return "system"
  // A standalone tool message has no tool_call_id and is invalid for Chat Completions.
  return "user"
}

function cutIndex(value: number, length: number): number {
  return Number.isInteger(value) ? Math.max(0, Math.min(value, length)) : 0
}

export function buildContext(
  assemblies: Record<string, ContextAssembly>,
  packs: Record<string, SnapshotPack>,
  nodes?: Record<string, TopoNode>,
  currentNodeId?: string,
  pendingSourceIds: string[] = [],
  pendingUserInput = "",
): { messages: PreviewMessage[]; activeNodeIds: Set<string> } {
  const messages: PreviewMessage[] = []
  const activeNodeIds = new Set<string>()
  const primaryChain = nodes && currentNodeId ? buildSnapshotPackNodes(currentNodeId, nodes) : []
  const primaryIds = new Set(primaryChain.map((node) => node.id))

  const addMessage = (node: Pick<TopoNode, "id" | "type" | "content">, meta: PreviewMessage["meta"]) => {
    if (activeNodeIds.has(node.id)) return
    messages.push({ role: messageRole(node.type), content: node.content, meta })
    activeNodeIds.add(node.id)
  }

  for (const node of primaryChain) {
    addMessage(node, { originalNodeId: node.id })
    const attached = assemblies[node.id]?.attachedPacks
      .filter((pack) => pack.enabled)
      .sort((a, b) => a.order - b.order) ?? []
    for (const attachedPack of attached) {
      const pack = packs[attachedPack.packId]
      if (!pack) continue
      const start = cutIndex(attachedPack.cutIndexOverride ?? pack.defaultCutIndex, pack.nodes.length)
      for (const snapshotNode of pack.nodes.slice(start)) {
        if (primaryIds.has(snapshotNode.originalNodeId)) continue
        addMessage(
          { id: snapshotNode.originalNodeId, type: snapshotNode.type, content: snapshotNode.content },
          { packId: pack.packId, originalNodeId: snapshotNode.originalNodeId },
        )
      }
    }
  }

  if (nodes) {
    for (const sourceId of pendingSourceIds) {
      for (const node of buildSnapshotPackNodes(sourceId, nodes)) {
        if (primaryIds.has(node.id)) continue
        addMessage(node, { pendingSourceId: sourceId, originalNodeId: node.id })
      }
    }
  }

  const input = pendingUserInput.trim()
  if (input) messages.push({ role: "user", content: input })
  return { messages, activeNodeIds }
}

export function buildActiveSet(
  assemblies: Record<string, ContextAssembly>,
  packs: Record<string, SnapshotPack>,
  nodes?: Record<string, TopoNode>,
  currentNodeId?: string,
  pendingSourceIds?: string[],
): Set<string> {
  return buildContext(assemblies, packs, nodes, currentNodeId, pendingSourceIds).activeNodeIds
}

export function buildPreviewMessages(
  assemblies: Record<string, ContextAssembly>,
  packs: Record<string, SnapshotPack>,
  pendingUserInput: string,
  nodes?: Record<string, TopoNode>,
  currentNodeId?: string,
  pendingSourceIds?: string[],
): PreviewMessage[] {
  return buildContext(assemblies, packs, nodes, currentNodeId, pendingSourceIds, pendingUserInput).messages
}
