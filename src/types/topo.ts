export type NodeType = "user" | "assistant" | "system" | "tool" | "summary"

export type TopoNode = {
  id: string
  type: NodeType
  content: string
  createdAt: number
  preferredParentId?: string
  forkedFromId?: string
  position?: { x: number; y: number }
}

export type PackNode = {
  packNodeId: string
  originalNodeId: string
  type: NodeType
  content: string
  createdAt: number
}

export type SnapshotPack = {
  packId: string
  shortId: string
  sourceNodeId: string
  createdAt: number
  strategy: "path_to_root"
  orderDirection: "root_to_source"
  nodes: PackNode[]
  defaultCutIndex: number
}

export type AttachedPack = {
  packId: string
  order: number
  enabled: boolean
  cutIndexOverride?: number
}

export type ContextAssembly = {
  nodeId: string
  attachedPacks: AttachedPack[]
}

export type ChatViewMode = "primary" | "timeline"

export type SessionData = {
  id: string
  title: string
  createdAt: number
  nodes: Record<string, TopoNode>
  packs: Record<string, SnapshotPack>
  assemblies: Record<string, ContextAssembly>
  ui: {
    selectedNodeId?: string
    chatViewMode: ChatViewMode
  }
}

export type MessageRole = "user" | "assistant" | "system" | "tool"

export type PreviewMessage = {
  role: MessageRole
  content: string
  meta?: {
    packId?: string
    originalNodeId?: string
  }
}

