import { X, Send } from "lucide-react"
import type { ContextAssembly, PreviewMessage, SnapshotPack } from "@/types/topo"
import MarkdownRenderer from "./MarkdownRenderer"

function RoleTag({ role }: { role: PreviewMessage["role"] }) {
  const color =
    role === "user"
      ? "bg-emerald-600/20 text-emerald-200"
      : role === "assistant"
        ? "bg-indigo-600/20 text-indigo-200"
        : role === "tool"
          ? "bg-amber-600/20 text-amber-200"
          : "bg-zinc-700/40 text-zinc-200"
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${color}`}>{role}</span>
}

export default function ContextPreviewDrawer(props: {
  open: boolean
  onClose: () => void
  selectedNodeId?: string
  assembly?: ContextAssembly
  packs: Record<string, SnapshotPack>
  messages: PreviewMessage[]
  onToggleEnabled: (packId: string, enabled: boolean) => void
  onCut: (packId: string, cutIndexOverride?: number) => void
  onRegenerate: (packId: string) => void
  onSend: () => void
}) {
  if (!props.open) return null

  const attached = (props.assembly?.attachedPacks ?? []).slice().sort((a, b) => a.order - b.order)

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={props.onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-zinc-800 bg-zinc-950">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div>
            <div className="text-sm font-semibold">Context Preview</div>
            <div className="mt-1 text-xs text-zinc-400">本次将发送的 messages（规则 A：只喂装配清单）</div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="text-xs font-medium text-zinc-200">Packs</div>
            <div className="mt-2 space-y-2">
              {!props.selectedNodeId ? <div className="text-sm text-zinc-400">未选中节点</div> : null}
              {props.selectedNodeId && attached.length === 0 ? <div className="text-sm text-zinc-400">暂无装配</div> : null}
              {attached.map((ap) => {
                const pack = props.packs[ap.packId]
                if (!pack) return null
                const start = ap.cutIndexOverride ?? pack.defaultCutIndex
                return (
                  <div key={ap.packId} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-200">pack#{pack.shortId}</div>
                        <div className="mt-1 text-xs text-zinc-400">source: {pack.sourceNodeId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => props.onToggleEnabled(ap.packId, !ap.enabled)}
                        className={`h-6 w-10 rounded-full p-1 transition-colors ${ap.enabled ? "bg-indigo-600" : "bg-zinc-700"}`}
                        aria-label="切换启用"
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white transition-transform ${ap.enabled ? "translate-x-4" : "translate-x-0"}`}
                        />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-xs text-zinc-300">cut start</div>
                      <select
                        value={start}
                        onChange={(e) => props.onCut(ap.packId, Number(e.target.value))}
                        className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                      >
                        {pack.nodes.map((pn, i) => (
                          <option key={pn.packNodeId} value={i}>
                            {i}: {pn.type}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => props.onRegenerate(ap.packId)}
                        className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                      >
                        重新生成
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-zinc-200">Messages</div>
              <div className="text-xs text-zinc-400">{props.messages.length} 条</div>
            </div>
            <div className="mt-3 space-y-2">
              {props.messages.length === 0 ? <div className="text-sm text-zinc-400">暂无 messages</div> : null}
              {props.messages.map((m, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <RoleTag role={m.role} />
                    {m.meta?.packId ? <span className="text-[11px] text-zinc-500">{m.meta.packId}</span> : null}
                  </div>
                  <div className="mt-2 text-sm text-zinc-200">
                    <MarkdownRenderer content={m.content} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={props.onSend}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Send className="h-4 w-4" />
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

