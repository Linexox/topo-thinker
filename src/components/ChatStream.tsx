import type { ChatViewMode, TopoNode } from "@/types/topo"
import MarkdownRenderer from "./MarkdownRenderer"
import { Scissors, Minimize2, Maximize2 } from "lucide-react"
import { useEffect, useRef } from "react"

function RolePill({ type }: { type: TopoNode["type"] }) {
  const color =
    type === "user"
      ? "bg-emerald-600/20 text-emerald-200"
      : type === "assistant"
        ? "bg-primary-600/20 text-primary-200"
        : type === "system"
          ? "bg-zinc-700/40 text-zinc-200"
          : type === "tool"
            ? "bg-amber-600/20 text-amber-200"
            : "bg-zinc-700/40 text-zinc-200"
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${color}`}>{type}</span>
}

export default function ChatStream(props: {
  nodes: Record<string, TopoNode>
  selectedNodeId?: string
  activeSet: Set<string>
  viewMode: ChatViewMode
  onChangeViewMode: (mode: ChatViewMode) => void
  onSelectNode: (nodeId: string) => void
  onLocateNode: (nodeId: string) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const list: TopoNode[] = []
  if (props.viewMode === "timeline") {
    list.push(...Object.values(props.nodes).sort((a, b) => a.createdAt - b.createdAt))
  } else {
    const visited = new Set<string>()
    let cur = props.selectedNodeId
    while (cur) {
      if (visited.has(cur)) break
      visited.add(cur)
      const n = props.nodes[cur]
      if (!n) break
      list.push(n)
      cur = n.preferredParentId
    }
    list.reverse()
  }

  const lastNodeId = list.length > 0 ? list[list.length - 1].id : null

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [lastNodeId, props.viewMode])

  // Scroll to selected node when it changes
  useEffect(() => {
    if (props.selectedNodeId && scrollRef.current) {
      // Small delay to ensure DOM is ready if switching view modes
      setTimeout(() => {
        const el = document.getElementById(`chat-bubble-${props.selectedNodeId}`)
         if (el) {
           el.scrollIntoView({ behavior: "smooth", block: "center" })
         }
       }, 100)
    }
  }, [props.selectedNodeId])

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">ChatStream</div>
        <div className="flex items-center gap-2">
          {props.onToggleFullscreen && (
            <button
              onClick={props.onToggleFullscreen}
              className="rounded-lg p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title={props.isFullscreen ? "退出全屏" : "全屏"}
            >
              {props.isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-xs">
            <button
              type="button"
              onClick={() => props.onChangeViewMode("primary")}
              className={`rounded-md px-2 py-1 ${props.viewMode === "primary" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              主链
            </button>
            <button
              type="button"
              onClick={() => props.onChangeViewMode("timeline")}
              className={`rounded-md px-2 py-1 ${props.viewMode === "timeline" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              时间流
            </button>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="mt-4 flex-1 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3"
      >
        {list.length === 0 ? <div className="text-sm text-zinc-400">暂无内容</div> : null}
        <div className="space-y-3">
          {list.map((n) => {
            const isActive = props.activeSet.has(n.id)
            const isSelected = props.selectedNodeId === n.id
            return (
              <div
                key={n.id}
                id={`chat-bubble-${n.id}`}
                onClick={() => props.onLocateNode(n.id)}
                className={`group relative w-full rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "border-primary-500/50 bg-primary-500/10"
                    : isActive
                      ? "border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/70"
                      : "border-zinc-800 bg-zinc-950 opacity-70 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <RolePill type={n.type} />
                    <span className="text-xs text-zinc-400">{new Date(n.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className={`text-[11px] ${isActive ? "text-primary-200" : "text-zinc-500"}`}>{
                        isActive ? "ACTIVE" : "INACTIVE"
                     }</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-zinc-200">
                  {n.content ? <MarkdownRenderer content={n.content} /> : "（空）"}
                </div>
                {!isSelected && (
                  <div className="mt-2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        props.onSelectNode(n.id)
                      }}
                      className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors"
                      title="设为上下文末端 (Set Context)"
                    >
                      <Scissors className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

