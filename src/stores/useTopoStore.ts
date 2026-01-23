import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChatViewMode, SessionData, TopoNode } from "@/types/topo"
import { createId } from "@/utils/id"
import { cloneSession, createSeedSession, createSnapshotPack, findReusablePack, getOrCreateAssembly, normalizeOrders, isAncestor } from "@/stores/topoInternals"

type TopoState = {
  schemaVersion: 1
  sessions: Record<string, SessionData>
  sessionOrder: string[]
  getSession: (id: string) => SessionData | undefined
  ensureSession: (id: string) => void
  createSession: () => string
  deleteSession: (id: string) => void
  renameSession: (id: string, title: string) => void
  setChatViewMode: (sessionId: string, mode: ChatViewMode) => void
  setSelectedNode: (sessionId: string, nodeId: string) => void
  setNodePosition: (sessionId: string, nodeId: string, position: { x: number; y: number }) => void
  forkNode: (sessionId: string, sourceNodeId: string) => string
  addUserNode: (sessionId: string, parentNodeId: string, content: string, extraAttachedIds?: string[]) => string
  addAssistantNode: (sessionId: string, parentNodeId: string, content: string) => string
  updateNodeContent: (sessionId: string, nodeId: string, content: string) => void
  toggleAttachFromSource: (sessionId: string, targetNodeId: string, sourceNodeId: string | string[]) => void
  setAttachedEnabled: (sessionId: string, targetNodeId: string, packId: string, enabled: boolean) => void
  moveAttachedPack: (sessionId: string, targetNodeId: string, packId: string, direction: "up" | "down") => void
  setAttachedCutIndex: (sessionId: string, targetNodeId: string, packId: string, cutIndexOverride?: number) => void
  regenerateAttachedPack: (sessionId: string, targetNodeId: string, packId: string) => void
}

export const useTopoStore = create<TopoState>()(
  persist(
    (set, get) => {
      const seed = createSeedSession()

      return {
        schemaVersion: 1,
        sessions: { [seed.id]: seed },
        sessionOrder: [seed.id],

        getSession: (id) => get().sessions[id],

        ensureSession: (id) => {
          const existing = get().sessions[id]
          if (existing) return

          set((state) => {
            const seed2 = createSeedSession(id)
            seed2.title = `会话 ${id.slice(-6)}`
            return {
              ...state,
              sessions: { ...state.sessions, [id]: seed2 },
              sessionOrder: [id, ...state.sessionOrder],
            }
          })
        },

        createSession: () => {
          const id = createId("sess")
          set((state) => {
            const now = Date.now()
            const rootId = createId("n")
            const node: TopoNode = {
              id: rootId,
              type: "system",
              content: "新会话已创建。你可以从任意节点 fork 分支，并显式装配上下文。",
              createdAt: now,
              position: { x: 0, y: 0 },
            }
            const session: SessionData = {
              id,
              title: `新会话 ${new Date(now).toLocaleString()}`,
              createdAt: now,
              nodes: { [rootId]: node },
              packs: {},
              assemblies: { [rootId]: { nodeId: rootId, attachedPacks: [] } },
              ui: { selectedNodeId: rootId, chatViewMode: "primary" },
            }
            return {
              ...state,
              sessions: { ...state.sessions, [id]: session },
              sessionOrder: [id, ...state.sessionOrder],
            }
          })
          return id
        },

        deleteSession: (id) => {
          set((state) => {
            const rest = { ...state.sessions }
            delete rest[id]
            return {
              ...state,
              sessions: rest,
              sessionOrder: state.sessionOrder.filter((x) => x !== id),
            }
          })
        },

        renameSession: (id, title) => {
          set((state) => {
            const s = state.sessions[id]
            if (!s) return state
            return { ...state, sessions: { ...state.sessions, [id]: { ...s, title } } }
          })
        },

        setChatViewMode: (sessionId, mode) => {
          set((state) => {
            const s = state.sessions[sessionId]
            if (!s) return state
            return { ...state, sessions: { ...state.sessions, [sessionId]: { ...s, ui: { ...s.ui, chatViewMode: mode } } } }
          })
        },

        setSelectedNode: (sessionId, nodeId) => {
          set((state) => {
            const s = state.sessions[sessionId]
            if (!s) return state
            if (!s.nodes[nodeId]) return state
            return { ...state, sessions: { ...state.sessions, [sessionId]: { ...s, ui: { ...s.ui, selectedNodeId: nodeId } } } }
          })
        },

        setNodePosition: (sessionId, nodeId, position) => {
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            if (!s0.nodes[nodeId]) return state
            const s = cloneSession(s0)
            s.nodes[nodeId] = { ...s.nodes[nodeId], position }
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
        },

        forkNode: (sessionId, sourceNodeId) => {
          const session = get().sessions[sessionId]
          if (!session || !session.nodes[sourceNodeId]) return sourceNodeId

          const newNodeId = createId("n")
          // Helper to check ancestor relationship
          const isAncestor = (ancestorId: string, descendantId: string, nodes: Record<string, TopoNode>) => {
            let curr = nodes[descendantId]?.preferredParentId
            while (curr) {
              if (curr === ancestorId) return true
              curr = nodes[curr]?.preferredParentId
            }
            return false
          }

          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const s = cloneSession(s0)

            const source = s.nodes[sourceNodeId]
            const child: TopoNode = {
              id: newNodeId,
              type: "user",
              content: "（新分支）",
              createdAt: Date.now(),
              preferredParentId: sourceNodeId,
              forkedFromId: sourceNodeId,
              position: { x: (source.position?.x ?? 0) + 240, y: (source.position?.y ?? 0) + 120 },
            }
            s.nodes[newNodeId] = child

            // Logic to automatically inherit context from parent
            // CHANGE: Deep Inheritance means we don't copy attached packs.
            s.assemblies[newNodeId] = { nodeId: newNodeId, attachedPacks: [] }
            // normalizeOrders(s.assemblies[newNodeId]) // No packs to normalize
            
            s.ui.selectedNodeId = newNodeId

            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })

          return newNodeId
        },

        addUserNode: (sessionId, parentNodeId, content, extraAttachedIds) => {
          const session = get().sessions[sessionId]
          if (!session || !session.nodes[parentNodeId]) return parentNodeId

          const newNodeId = createId("n")

          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const s = cloneSession(s0)

            const parent = s.nodes[parentNodeId]
            const node: TopoNode = {
              id: newNodeId,
              type: "user",
              content,
              createdAt: Date.now(),
              preferredParentId: parentNodeId,
              position: { x: (parent.position?.x ?? 0) + 240, y: (parent.position?.y ?? 0) + 120 },
            }
            s.nodes[newNodeId] = node

            // Logic to automatically inherit context from parent
            // CHANGE: We now use "Deep Inheritance" (traversing ancestors at runtime).
            // So we do NOT copy attached packs from parent.
            const newAttachedPacks: any[] = []

            // Add extra attached IDs
            if (extraAttachedIds) {
              for (const sourceId of extraAttachedIds) {
                // Skip if source is parent (implicit chain covers it)
                if (sourceId === parentNodeId) continue
                // Skip if source is ancestor of parent (implicit chain covers it)
                if (isAncestor(sourceId, parentNodeId, s.nodes)) continue
                
                const reusable = findReusablePack(s, sourceId)
                const pack = reusable ?? createSnapshotPack(s, sourceId)
                if (!reusable) {
                  s.packs[pack.packId] = pack
                }
                
                // Avoid duplicates
                if (!newAttachedPacks.some(p => p.packId === pack.packId)) {
                   // Append with default enabled=true
                   newAttachedPacks.push({ packId: pack.packId, enabled: true, order: 0 })
                }
              }
            }

            s.assemblies[newNodeId] = { nodeId: newNodeId, attachedPacks: newAttachedPacks }
            normalizeOrders(s.assemblies[newNodeId])

            s.ui.selectedNodeId = newNodeId
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
          return newNodeId
        },

        addAssistantNode: (sessionId, parentNodeId, content) => {
          const session = get().sessions[sessionId]
          if (!session || !session.nodes[parentNodeId]) return parentNodeId

          const newNodeId = createId("n")
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const s = cloneSession(s0)

            const parent = s.nodes[parentNodeId]
            const node: TopoNode = {
              id: newNodeId,
              type: "assistant",
              content,
              createdAt: Date.now(),
              preferredParentId: parentNodeId,
              position: { x: (parent.position?.x ?? 0) + 240, y: (parent.position?.y ?? 0) + 120 },
            }
            s.nodes[newNodeId] = node
            
            // Deep Inheritance: No copy
            s.assemblies[newNodeId] = { nodeId: newNodeId, attachedPacks: [] }
            s.ui.selectedNodeId = newNodeId
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
          return newNodeId
        },

        updateNodeContent: (sessionId, nodeId, content) => {
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            if (!s0.nodes[nodeId]) return state
            const s = cloneSession(s0)
            s.nodes[nodeId] = { ...s.nodes[nodeId], content }
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
        },

        toggleAttachFromSource: (sessionId, targetNodeId, sourceNodeIdOrIds) => {
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const sourceIds = Array.isArray(sourceNodeIdOrIds) ? sourceNodeIdOrIds : [sourceNodeIdOrIds]
            const primarySourceId = sourceIds[0]
            
            if (!s0.nodes[targetNodeId] || !s0.nodes[primarySourceId]) return state

            const s = cloneSession(s0)
            // Clone assembly to avoid mutating shared state
            const oldAsm = getOrCreateAssembly(s, targetNodeId)
            const asm = { ...oldAsm, attachedPacks: [...oldAsm.attachedPacks] }
            s.assemblies[targetNodeId] = asm

            // Check if ANY of the sourceIds are already attached
            const existingIndices = asm.attachedPacks
              .map((ap, index) => ({ ap, index }))
              .filter(({ ap }) => {
                const p = s.packs[ap.packId]
                return p && sourceIds.includes(p.sourceNodeId)
              })
              .map(({ index }) => index)
              .sort((a, b) => b - a) // Sort descending to splice correctly

            if (existingIndices.length > 0) {
              // Remove ALL matching packs
              for (const index of existingIndices) {
                asm.attachedPacks.splice(index, 1)
              }
              normalizeOrders(asm)
              return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
            }

            // If none attached, attach the PRIMARY source (the first one)
            // Prevent attaching a descendant as context (Cycle prevention)
            if (isAncestor(targetNodeId, primarySourceId, s.nodes)) {
               console.warn("Cannot attach a descendant as context")
               return state
            }

            const reusable = findReusablePack(s, primarySourceId)
            const pack = reusable ?? createSnapshotPack(s, primarySourceId)
            if (!reusable) {
              s.packs[pack.packId] = pack
            }

            const maxOrder = asm.attachedPacks.reduce((m, p) => Math.max(m, p.order), 0)
            asm.attachedPacks.push({ packId: pack.packId, enabled: true, order: maxOrder + 1 })
            normalizeOrders(asm)
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
        },

        setAttachedEnabled: (sessionId, targetNodeId, packId, enabled) => {
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const s = cloneSession(s0)
            const oldAsm = getOrCreateAssembly(s, targetNodeId)
            const asm = { ...oldAsm }
            asm.attachedPacks = oldAsm.attachedPacks.map((p) => (p.packId === packId ? { ...p, enabled } : p))
            s.assemblies[targetNodeId] = asm
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
        },

        moveAttachedPack: (sessionId, targetNodeId, packId, direction) => {
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const s = cloneSession(s0)
            const oldAsm = getOrCreateAssembly(s, targetNodeId)
            
            const sorted = [...oldAsm.attachedPacks].sort((a, b) => a.order - b.order)
            const idx = sorted.findIndex((p) => p.packId === packId)
            if (idx < 0) return state
            const nextIdx = direction === "up" ? idx - 1 : idx + 1
            if (nextIdx < 0 || nextIdx >= sorted.length) return state
            
            const swapped = [...sorted]
            const tmp = swapped[idx]
            swapped[idx] = swapped[nextIdx]
            swapped[nextIdx] = tmp
            
            const asm = { ...oldAsm, attachedPacks: swapped.map((p, i) => ({ ...p, order: i + 1 })) }
            s.assemblies[targetNodeId] = asm
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
        },

        setAttachedCutIndex: (sessionId, targetNodeId, packId, cutIndexOverride) => {
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const s = cloneSession(s0)
            const oldAsm = getOrCreateAssembly(s, targetNodeId)
            const asm = { ...oldAsm }
            asm.attachedPacks = oldAsm.attachedPacks.map((p) => (p.packId === packId ? { ...p, cutIndexOverride } : p))
            s.assemblies[targetNodeId] = asm
            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
        },

        regenerateAttachedPack: (sessionId, targetNodeId, packId) => {
          set((state) => {
            const s0 = state.sessions[sessionId]
            if (!s0) return state
            const s = cloneSession(s0)
            const old = s.packs[packId]
            if (!old) return state

            const newPack = createSnapshotPack(s, old.sourceNodeId)
            s.packs[newPack.packId] = newPack

            const oldAsm = getOrCreateAssembly(s, targetNodeId)
            const asm = { ...oldAsm }
            asm.attachedPacks = oldAsm.attachedPacks.map((p) => (p.packId === packId ? { ...p, packId: newPack.packId } : p))
            normalizeOrders(asm)
            s.assemblies[targetNodeId] = asm

            return { ...state, sessions: { ...state.sessions, [sessionId]: s } }
          })
        },
      }
    },
    {
      name: "topo-thinker:v1",
      version: 1,
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        sessions: state.sessions,
        sessionOrder: state.sessionOrder,
      }),
    }
  )
)
