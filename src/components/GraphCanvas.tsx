import { useMemo, useState, useEffect } from "react"
import ReactFlow, { Background, Controls, Handle, Position, type Edge, type Node, type ReactFlowInstance } from "reactflow"
import "reactflow/dist/style.css"
import { GitFork, MessageSquarePlus } from "lucide-react"
import type { TopoNode, ContextAssembly, SnapshotPack } from "@/types/topo"
import MarkdownRenderer from "./MarkdownRenderer"

type TopoNodeData = {
  node: TopoNode
  parentContent?: string
  isActive: boolean
  isSelected: boolean
  onFork: (nodeId: string) => void
  onToggleAttach: (nodeId: string) => void
  onSelectNode: (nodeId: string) => void
  onUpdateContent: (nodeId: string, content: string) => void
  onAsk: (parentId: string, text: string) => void
}

const nodeTypes = {
  topo: NodeCard,
}

function NodeCard({ data }: { data: TopoNodeData }) {
  const parentContent = data.parentContent
  const n = data.node
  const base = "rounded-xl border bg-zinc-950 px-3 py-2 shadow-sm"
  const active = data.isActive ? "border-indigo-500/60" : "border-zinc-800 opacity-70"
  const selected = data.isSelected ? "ring-2 ring-indigo-500/40" : ""
  
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(n.content)
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState("")

  useEffect(() => {
    setEditContent(n.content)
  }, [n.content])

  const handleSave = () => {
    if (editContent !== n.content) {
      data.onUpdateContent(n.id, editContent)
    }
    setIsEditing(false)
  }

  const handleSendReply = () => {
    if (!replyContent.trim()) return
    data.onAsk(n.id, replyContent)
    setReplyContent("")
    setIsReplying(false)
  }

  return (
    <div 
      className={`${base} ${active} ${selected} cursor-pointer transition-colors max-w-[320px]`}
      title={n.content}
      onClick={(e) => {
        if (isEditing || isReplying) return
        // Handle selection / toggle attach manually to ensure it works reliably
        e.stopPropagation()
        const isToggle = e.metaKey || e.ctrlKey
        if (isToggle) {
          data.onToggleAttach(n.id)
        } else {
          data.onSelectNode(n.id)
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-zinc-500" />
      <div className="flex flex-col gap-2 min-w-[200px]">
        {parentContent && (
          <div className="border-b border-zinc-800 pb-2 mb-1">
             <div className="flex items-center gap-2 mb-1">
                <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-400">User</span>
             </div>
             <div className="max-h-[80px] overflow-y-auto overflow-x-hidden text-xs text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent nodrag nowheel">
                <MarkdownRenderer content={parentContent} />
             </div>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[11px] font-medium text-zinc-200">{n.type}</span>
              {n.forkedFromId ? <span className="text-[11px] text-zinc-400">fork</span> : null}
            </div>
            
            {isEditing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSave()
                  }
                  if (e.key === 'Escape') {
                    setEditContent(n.content)
                    setIsEditing(false)
                  }
                }}
                className="w-full h-[150px] bg-zinc-900 text-xs text-zinc-200 p-2 rounded border border-zinc-700 focus:outline-none focus:border-indigo-500 resize-none nodrag nowheel"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="max-h-[200px] overflow-y-auto overflow-x-hidden text-xs text-zinc-200 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent nodrag nowheel">
                 {n.content ? <MarkdownRenderer content={n.content} /> : "（空）"}
              </div>
            )}
          </div>
          {!isEditing && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsReplying(!isReplying)
                }}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 ${isReplying ? 'bg-zinc-800' : ''}`}
                aria-label="Reply"
                title="Reply"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        
        {isReplying && (
          <div className="mt-2 border-t border-zinc-800 pt-2" onClick={e => e.stopPropagation()}>
             <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Reply..."
                className="w-full h-[80px] bg-zinc-900 text-xs text-zinc-200 p-2 rounded border border-zinc-700 focus:outline-none focus:border-indigo-500 resize-none nodrag nowheel mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                  if (e.key === 'Escape') {
                    setIsReplying(false)
                  }
                }}
             />
             <div className="flex justify-end gap-2">
               <button
                 type="button"
                 onClick={() => setIsReplying(false)}
                 className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200"
               >
                 Cancel
               </button>
               <button
                 type="button"
                 onClick={handleSendReply}
                 className="px-2 py-1 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-500"
               >
                 Send
               </button>
             </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-zinc-500" />
    </div>
  )
}

export default function GraphCanvas(props: {
  nodes: Record<string, TopoNode>
  assemblies?: Record<string, ContextAssembly>
  packs?: Record<string, SnapshotPack>
  selectedNodeId?: string
  activeSet: Set<string>
  focusTarget?: { nodeId: string; ts: number }
  onSelectNode: (nodeId: string) => void
  onToggleAttach: (sourceNodeId: string | string[]) => void
  onFork: (sourceNodeId: string) => void
  onMoveNode: (nodeId: string, position: { x: number; y: number }) => void
  onUpdateContent: (nodeId: string, content: string) => void
  onAsk: (parentId: string, text: string) => void
}) {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  // Identify nodes that are explicitly referenced as context sources
  const referencedNodeIds = useMemo(() => {
    const set = new Set<string>()
    if (props.assemblies && props.packs) {
      for (const asm of Object.values(props.assemblies)) {
        for (const ap of asm.attachedPacks) {
          if (ap.enabled) {
            const pack = props.packs[ap.packId]
            if (pack) {
              set.add(pack.sourceNodeId)
            }
          }
        }
      }
    }
    return set
  }, [props.assemblies, props.packs])

  // Pre-process nodes to identify "Mergeable User Nodes"
  // A User node is mergeable if it has at least one Assistant child.
  // If merged, the User node is hidden, and its content is shown in the Assistant child(ren).
  const { mergedUserIds, assistantParentMap, assistantToUserMap, userToAssistantMap } = useMemo(() => {
    const merged = new Set<string>()
    const map = new Map<string, string>() // assistantId -> parentContent
    const aToU = new Map<string, string>() // assistantId -> userId
    const uToA = new Map<string, string[]>() // userId -> assistantIds
    
    // Build adjacency to find children
    const childrenMap: Record<string, TopoNode[]> = {}
    Object.values(props.nodes).forEach(n => {
      if (n.preferredParentId) {
        if (!childrenMap[n.preferredParentId]) childrenMap[n.preferredParentId] = []
        childrenMap[n.preferredParentId].push(n)
      }
    })

    Object.values(props.nodes).forEach(n => {
      if (n.type === "user") {
        const children = childrenMap[n.id] || []
        const hasAssistantChild = children.some(c => c.type === "assistant")
        // Always merge if possible, even if referenced as context.
        // We will handle edge redirection for referenced nodes later.
        if (hasAssistantChild) {
          merged.add(n.id)
          const assistants: string[] = []
          children.forEach(c => {
             if (c.type === "assistant") {
               map.set(c.id, n.content)
               aToU.set(c.id, n.id)
               assistants.push(c.id)
             }
          })
          uToA.set(n.id, assistants)
        }
      }
    })
    return { mergedUserIds: merged, assistantParentMap: map, assistantToUserMap: aToU, userToAssistantMap: uToA }
  }, [props.nodes]) // referencedNodeIds dependency removed

  const rfNodes: Node<TopoNodeData>[] = useMemo(() => {
    return Object.values(props.nodes)
      .filter(n => !mergedUserIds.has(n.id)) // Hide merged user nodes
      .map((n) => ({
      id: n.id,
      type: "topo",
      position: n.position ?? { x: 0, y: 0 },
      data: {
        node: n,
        parentContent: assistantParentMap.get(n.id),
        isActive: props.activeSet.has(n.id),
        isSelected: props.selectedNodeId === n.id,
        onFork: props.onFork,
        onToggleAttach: (id) => {
           const node = props.nodes[id]
           const ids = [id]
           
           // If clicking an Assistant node, also include its User parent in the toggle operation
           // This ensures that if the User parent was referenced (and thus preventing merge, or just logically related),
           // clicking the Assistant will clear that reference too.
           if (node?.type === 'assistant' && node.preferredParentId) {
             const parent = props.nodes[node.preferredParentId]
             if (parent?.type === 'user') {
               ids.push(parent.id)
             }
           }

           (props.onToggleAttach as any)(ids)
        },
        onSelectNode: props.onSelectNode,
        onUpdateContent: props.onUpdateContent,
        onAsk: props.onAsk,
      },
    }))
  }, [props.activeSet, props.nodes, props.onFork, props.selectedNodeId, props.onToggleAttach, props.onSelectNode, props.onUpdateContent, props.onAsk, mergedUserIds, assistantParentMap, assistantToUserMap])

  const edges: Edge[] = useMemo(() => {
    const list: Edge[] = []
    const edgeIds = new Set<string>()

    const addEdge = (edge: Edge) => {
       if (edgeIds.has(edge.id)) return
       edgeIds.add(edge.id)
       list.push(edge)
    }
    
    // 1. Regular tree edges (parent -> child)
    for (const n of Object.values(props.nodes)) {
      if (mergedUserIds.has(n.id)) continue // Skip edges originating from merged nodes (handled by children)
      
      if (!n.preferredParentId) continue
      if (!props.nodes[n.preferredParentId]) continue

      let sourceId = n.preferredParentId
      let targetId = n.id
      
      // If target is merged, skip (handled by its children)
      if (mergedUserIds.has(targetId)) continue

      // If source is merged, we need to resolve the visual source recursively
      while (mergedUserIds.has(sourceId)) {
         const assistants = userToAssistantMap.get(sourceId)
         
         // Check if target is one of the assistants (Internal Edge: User -> Assistant)
         const isInternalEdge = assistants && assistants.includes(targetId)

         if (isInternalEdge) {
            // It's an internal edge (User -> Assistant), so we skip the User node
            // and try to connect from the User's parent instead.
            const parent = props.nodes[sourceId]
            if (parent && parent.preferredParentId) {
               sourceId = parent.preferredParentId
               // Continue loop to check if the new source (grandparent) is also merged
            } else {
               // No grandparent (Root User node)? No edge to draw.
               // We set sourceId to null to indicate no valid source found.
               // (Technically we could break and filter later, but let's just break loop with a flag)
               sourceId = "" // Invalid ID
               break 
            }
         } else {
             // External Edge (User -> Sibling/Child of User)
             // We want to draw the edge from the Assistant (visual representation of User) to the Sibling.
             if (assistants && assistants.length > 0) {
                sourceId = assistants[0]
                break // Assistant is visible, we are done
             } else {
                 // Fallback
                 const parent = props.nodes[sourceId]
                 if (parent && parent.preferredParentId) {
                    sourceId = parent.preferredParentId
                 } else {
                    sourceId = ""
                    break
                 }
             }
         }
      }
      
      if (!sourceId) continue

      addEdge({
        id: `${sourceId}->${targetId}`,
        source: sourceId,
        target: targetId,
        animated: props.activeSet.has(targetId),
        // Unified style for structural edges as well
        style: { stroke: props.activeSet.has(targetId) ? "#6366f1" : "#52525b", strokeWidth: 2 },
      })
    }

    // 2. Context reference edges (pack source -> current node)
    if (props.assemblies && props.packs) {
      for (const n of Object.values(props.nodes)) {
        // Skip merged user nodes (they don't display edges)
        if (mergedUserIds.has(n.id)) continue

        // Collect node IDs whose context we should display.
        // Always include the node itself.
        const contextHolderIds = [n.id]

        // If this node is the primary visual representative (first assistant) of a merged user node,
        // we must also display the context attached to that user node.
        const parentUserId = assistantToUserMap.get(n.id)
        if (parentUserId) {
           const assistants = userToAssistantMap.get(parentUserId)
           // Only the first assistant inherits the visual edges of the hidden user node
           if (assistants && assistants[0] === n.id) {
              contextHolderIds.push(parentUserId)
           }
        }

        // 2.1 Collect all candidate source IDs from enabled packs of ALL context holders
        const candidateSourceIds = new Set<string>()
        const packMap = new Map<string, SnapshotPack>() // sourceId -> pack
        
        for (const holderId of contextHolderIds) {
            const asm = props.assemblies[holderId]
            if (!asm) continue
            
            for (const ap of asm.attachedPacks) {
              if (!ap.enabled) continue
              const pack = props.packs[ap.packId]
              if (!pack) continue
              candidateSourceIds.add(pack.sourceNodeId)
              packMap.set(pack.sourceNodeId, pack)
            }
        }
        
        // 2.2 Draw edges for all sources (No filtering of ancestors)
        const finalSourceIds = Array.from(candidateSourceIds)

        // 2.3 Draw edges for final sources
        for (const rawSourceId of finalSourceIds) {
          const pack = packMap.get(rawSourceId)!
          
          let sourceId = rawSourceId
          let targetId = n.id

          // Avoid self-loops
          if (sourceId === targetId) continue
          
          // Redirect merged sources
          if (mergedUserIds.has(sourceId)) {
             const assistants = userToAssistantMap.get(sourceId)
             if (assistants && assistants.length > 0) {
                // Use the first assistant as the visual source
                sourceId = assistants[0]
             }
          }

          // Avoid duplicates (if both User and Assistant were sources)
          if (sourceId === targetId) continue

          addEdge({
            id: `${sourceId}->${targetId}`,
            source: sourceId,
            target: targetId,
            animated: props.activeSet.has(targetId) && props.activeSet.has(sourceId),
            style: { stroke: props.activeSet.has(targetId) && props.activeSet.has(sourceId) ? "#6366f1" : "#52525b", strokeWidth: 2, strokeDasharray: "5 5" },
          })
        }
      }
    }
    
    return list
  }, [props.nodes, props.assemblies, props.packs, props.activeSet, mergedUserIds, userToAssistantMap])

  useEffect(() => {
    if (!rfInstance || !props.focusTarget) return

    let targetId = props.focusTarget.nodeId
    // Handle merged nodes redirection
    if (mergedUserIds.has(targetId)) {
      const assistants = userToAssistantMap.get(targetId)
      if (assistants && assistants.length > 0) {
        targetId = assistants[0]
      }
    }

    // Attempt to focus. If node is not found (maybe ReactFlow hasn't updated nodes yet), retry briefly
    const attemptFocus = (retries = 3) => {
        const node = rfInstance.getNode(targetId)
        if (node) {
            rfInstance.fitView({
                nodes: [{ id: targetId }],
                padding: 0.2,
                maxZoom: 1.2,
                duration: 800,
            })
        } else if (retries > 0) {
            setTimeout(() => attemptFocus(retries - 1), 50)
        }
    }
    
    attemptFocus()
  }, [props.focusTarget, rfInstance, mergedUserIds, userToAssistantMap])

  return (
    <div className="h-full w-full rounded-lg border border-zinc-800 bg-zinc-950">
      <ReactFlow
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        onNodeDragStop={(_, node) => {
          props.onMoveNode(node.id, node.position)
        }}
        fitView
      >
        <Background gap={20} size={1} color="#27272a" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
