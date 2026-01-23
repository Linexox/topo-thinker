import type { ContextAssembly, PreviewMessage, SnapshotPack, TopoNode } from "@/types/topo"

export function buildSnapshotPackNodes(sourceNodeId: string, nodes: Record<string, TopoNode>) {
  const chain: TopoNode[] = []
  const visited = new Set<string>()
  let cur: string | undefined = sourceNodeId

  while (cur) {
    if (visited.has(cur)) {
      break
    }
    visited.add(cur)
    const n = nodes[cur]
    if (!n) {
      break
    }
    chain.push(n)
    cur = n.preferredParentId
  }

  return chain.reverse()
}

export function buildActiveSet(
  assemblies: Record<string, ContextAssembly>,
  packs: Record<string, SnapshotPack>, 
  nodes?: Record<string, TopoNode>, 
  currentNodeId?: string,
  pendingSourceIds?: string[]
) {
  const active = new Set<string>()
  
  // 1. Implicit Chain & Attached Packs (Deep Inheritance)
  if (nodes && currentNodeId) {
    // buildSnapshotPackNodes returns [Root ... Current]
    const chain = buildSnapshotPackNodes(currentNodeId, nodes)
    
    for (const n of chain) {
      // Add the ancestor itself
      active.add(n.id)

      // Add its attached packs
      const asm = assemblies[n.id]
      if (asm) {
        const attached = [...asm.attachedPacks].filter((p) => p.enabled)
        for (const ap of attached) {
          const pack = packs[ap.packId]
          if (!pack) continue
          const start = ap.cutIndexOverride ?? pack.defaultCutIndex
          for (const pn of pack.nodes.slice(start)) {
            active.add(pn.originalNodeId)
          }
        }
      }
    }
  }

  // 2. Pending Sources (Draft Context)
  if (pendingSourceIds && nodes) {
    for (const sourceId of pendingSourceIds) {
       // Trace back from sourceId to find all nodes in this "pack"
       let cur: string | undefined = sourceId
       const visited = new Set<string>()
       while (cur) {
         if (visited.has(cur)) break
         visited.add(cur)
         const n = nodes[cur]
         if (!n) break
         active.add(n.id)
         cur = n.preferredParentId
       }
    }
  }

  return active
}

export function buildPreviewMessages(
  assemblies: Record<string, ContextAssembly>,
  packs: Record<string, SnapshotPack>,
  pendingUserInput: string,
  nodes?: Record<string, TopoNode>,
  currentNodeId?: string,
  pendingSourceIds?: string[]
): PreviewMessage[] {
  const messages: PreviewMessage[] = []
  const includedNodeIds = new Set<string>()

  // 1. Implicit Chain & Attached Packs (Deep Inheritance)
  if (nodes && currentNodeId) {
    const chain = buildSnapshotPackNodes(currentNodeId, nodes) // Returns [Root ... Current]
    
    for (const n of chain) {
      // 1a. Add the node content itself (if not already included)
      if (!includedNodeIds.has(n.id)) {
        const role = n.type === "system" ? "system" : (n.type === "assistant" ? "assistant" : "user")
        messages.push({ 
          role: role as any, 
          content: n.content, 
          meta: { originalNodeId: n.id } 
        })
        includedNodeIds.add(n.id)
      }

      // 1b. Add its attached packs
      const asm = assemblies[n.id]
      if (asm) {
        const attached = [...asm.attachedPacks].filter((p) => p.enabled).sort((a, b) => a.order - b.order)
        for (const ap of attached) {
          const pack = packs[ap.packId]
          if (!pack) continue
          const start = ap.cutIndexOverride ?? pack.defaultCutIndex
          
          for (const pn of pack.nodes.slice(start)) {
            if (includedNodeIds.has(pn.originalNodeId)) continue
            const role = pn.type === "summary" ? "system" : pn.type
            messages.push({ 
              role, 
              content: pn.content, 
              meta: { packId: pack.packId, originalNodeId: pn.originalNodeId } 
            })
            includedNodeIds.add(pn.originalNodeId)
          }
        }
      }
    }
  }

  // Helper to process a "Pack-like" chain
  const processChain = (chain: TopoNode[], meta: any) => {
    for (const n of chain) {
      if (includedNodeIds.has(n.id)) continue
      const role = n.type === "system" ? "system" : (n.type === "assistant" ? "assistant" : "user")
      messages.push({ role: role as any, content: n.content, meta: { ...meta, originalNodeId: n.id } })
      includedNodeIds.add(n.id)
    }
  }

  // 3. Pending Sources
  if (pendingSourceIds && nodes) {
    for (const sourceId of pendingSourceIds) {
      const chain = buildSnapshotPackNodes(sourceId, nodes)
      processChain(chain, { pendingSourceId: sourceId })
    }
  }


  const text = pendingUserInput.trim()
  if (text.length > 0) {
    messages.push({ role: "user", content: text })
  }

  return messages
}

