import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, PanelRightOpen, Settings, Maximize2, Minimize2 } from "lucide-react";
import { useTopoStore } from "@/stores/useTopoStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import GraphCanvas from "@/components/GraphCanvas";
import ChatStream from "@/components/ChatStream";
import ContextPreviewDrawer from "@/components/ContextPreviewDrawer";
import Composer, { Attachment } from "@/components/Composer";
import { buildActiveSet, buildPreviewMessages } from "@/utils/context";

export default function SessionDetail() {
  const params = useParams();
  const sessionId = params.id ?? "";
  const ensureSession = useTopoStore((s) => s.ensureSession);
  const session = useTopoStore((s) => (sessionId ? s.sessions[sessionId] : undefined));
  const setSelectedNode = useTopoStore((s) => s.setSelectedNode);
  const setChatViewMode = useTopoStore((s) => s.setChatViewMode);
  const setNodePosition = useTopoStore((s) => s.setNodePosition);
  const toggleAttachFromSource = useTopoStore((s) => s.toggleAttachFromSource);
  const forkNode = useTopoStore((s) => s.forkNode);
  const setAttachedEnabled = useTopoStore((s) => s.setAttachedEnabled);
  const setAttachedCutIndex = useTopoStore((s) => s.setAttachedCutIndex);
  const regenerateAttachedPack = useTopoStore((s) => s.regenerateAttachedPack);
  const addUserNode = useTopoStore((s) => s.addUserNode);
  const addAssistantNode = useTopoStore((s) => s.addAssistantNode);
  const updateNodeContent = useTopoStore((s) => s.updateNodeContent);

  const apiConfig = useSettingsStore((s) => s.apiConfig);

  const [composerText, setComposerText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [pendingSourceIds, setPendingSourceIds] = useState<string[]>([]);
  const [focusTarget, setFocusTarget] = useState<{ nodeId: string; ts: number } | undefined>(undefined);

  const selectedNodeId = session?.ui.selectedNodeId;
  const assembly = selectedNodeId ? session?.assemblies[selectedNodeId] : undefined;

  useEffect(() => {
    if (sessionId) ensureSession(sessionId);
  }, [ensureSession, sessionId]);

  // Clear pending sources when selected node changes
  useEffect(() => {
    setPendingSourceIds([]);
    setAttachments([]); // Also clear attachments when switching nodes
    setComposerText(""); // Optional: clear text too? Usually yes.
  }, [selectedNodeId]);

  const activeSet = useMemo(() => {
    if (!session || !selectedNodeId) return new Set<string>();
    return buildActiveSet(session.assemblies, session.packs, session.nodes, selectedNodeId, pendingSourceIds);
  }, [selectedNodeId, session, pendingSourceIds]);

  const fullComposerText = useMemo(() => {
    const attachmentContent = attachments.map(a => a.content || "").join("")
    return composerText + attachmentContent
  }, [composerText, attachments])

  const previewMessages = useMemo(() => {
    return buildPreviewMessages(session?.assemblies ?? {}, session?.packs ?? {}, fullComposerText, session?.nodes, selectedNodeId, pendingSourceIds);
  }, [session?.assemblies, fullComposerText, session?.packs, session?.nodes, selectedNodeId, pendingSourceIds]);

  const handleAddFiles = (files: File[]) => {
    const newAttachments: Attachment[] = files.map(f => ({ file: f, loading: true }))
    setAttachments(prev => [...prev, ...newAttachments])

    files.forEach(async (file) => {
      try {
        let content = ""
        if (file.type.startsWith("image/")) {
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(`\n\n![${file.name}](${reader.result})`)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        } else {
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const res = reader.result as string
              if (res.includes('\0')) {
                resolve(`\n\n[File: ${file.name} (Binary data not shown)]`)
              } else {
                const ext = file.name.split('.').pop() || 'text'
                resolve(`\n\n---\n**File: ${file.name}**\n\`\`\`${ext}\n${res}\n\`\`\``)
              }
            }
            reader.onerror = reject
            reader.readAsText(file)
          })
        }
        setAttachments(prev => prev.map(a => a.file === file ? { ...a, content, loading: false } : a))
      } catch (e) {
        console.error("Error reading file", e)
        setAttachments(prev => prev.map(a => a.file === file ? { ...a, loading: false } : a))
      }
    })
  }

  const handleRemoveFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async (parentId: string, text: string, sourceIds: string[] = []) => {
    if (!sessionId || !text.trim()) return

    const userNodeId = addUserNode(sessionId, parentId, text, sourceIds)
    
    // Clear pending sources if we are sending from the currently selected node
    if (parentId === selectedNodeId) {
      setPendingSourceIds([])
      setComposerText("")
      setAttachments([])
    }

    const currentSession = useTopoStore.getState().sessions[sessionId]
    // Build full context including implicit ancestors
    const messages = buildPreviewMessages(
      currentSession.assemblies, 
      currentSession.packs, 
      "", 
      currentSession.nodes, 
      userNodeId
    )
    
    if (messages.length === 0) {
       messages.push({ role: "user", content: text })
    }
    
    const assistantNodeId = addAssistantNode(sessionId, userNodeId, "Thinking...")
    setFocusTarget({ nodeId: assistantNodeId, ts: Date.now() })

    try {
      const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: apiConfig.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      })

      if (!response.ok) {
         const errText = await response.text()
         updateNodeContent(sessionId, assistantNodeId, `Error: ${response.status}\n${errText}`)
         return
      }
      
      if (!response.body) return
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let content = ""
      let isFirstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim()
            if (data === "[DONE]") break
            
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices[0]?.delta?.content || ""
              if (delta) {
                if (isFirstChunk) {
                  content = delta
                  isFirstChunk = false
                } else {
                  content += delta
                }
                updateNodeContent(sessionId, assistantNodeId, content)
              }
            } catch (e) {
              console.error("Parse error", e)
            }
          }
        }
      }
    } catch (error) {
       updateNodeContent(sessionId, assistantNodeId, `Request Failed: ${error}`)
    }
  }

  if (!sessionId) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="flex-none border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/sessions"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <div>
              <div className="text-sm font-semibold">{session?.title ?? `会话：${sessionId}`}</div>
              <div className="text-xs text-zinc-400">会话详情 MVP 布局占位</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
              title="API 配置"
            >
              <Settings className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              <PanelRightOpen className="h-4 w-4" />
              预览
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-6 min-h-0">
        <div className={`grid grid-cols-12 gap-4 h-full transition-all ${isGraphFullscreen ? 'fixed inset-0 z-50 bg-zinc-950 p-4' : ''}`}>
          <section className={`${
            isGraphFullscreen 
              ? 'col-span-12 h-full' 
              : 'col-span-7'
            } flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-300 relative group`}>
            
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">GraphCanvas</div>
              <button
                onClick={() => setIsGraphFullscreen(!isGraphFullscreen)}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                title={isGraphFullscreen ? "退出全屏" : "全屏"}
              >
                {isGraphFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-2 flex-1">
              {session ? (
                <GraphCanvas
                  nodes={session.nodes}
                  assemblies={session.assemblies}
                  packs={session.packs}
                  selectedNodeId={selectedNodeId}
                  activeSet={activeSet}
                  focusTarget={focusTarget}
                  onSelectNode={(id) => setSelectedNode(sessionId, id)}
                  onToggleAttach={(sourceId) => {
                    if (!selectedNodeId) {
                      // If no node selected, select it? Or just ignore?
                      // If sourceId is array, use first?
                      const id = Array.isArray(sourceId) ? sourceId[0] : sourceId
                      setSelectedNode(sessionId, id)
                      return
                    }

                    const ids = Array.isArray(sourceId) ? sourceId : [sourceId]

                    // Check if ANY of the ids are already attached to the current node
                    // If so, we perform an immediate "Remove" operation (Mutation).
                    // If not, we add to "Pending" (Draft) to avoid unwanted immediate connections.
                    const asm = session.assemblies[selectedNodeId]
                    const isAttached = asm?.attachedPacks.some(ap => {
                        const pack = session.packs[ap.packId]
                        return pack && ids.includes(pack.sourceNodeId)
                    })

                    if (isAttached) {
                       toggleAttachFromSource(sessionId, selectedNodeId, sourceId)
                    } else {
                       setPendingSourceIds(prev => {
                          const next = new Set(prev)
                          // If any of the target IDs are already in pending, we treat this as a "Toggle Off" for the group
                          const anyInPending = ids.some(id => next.has(id))
                          
                          if (anyInPending) {
                             ids.forEach(id => next.delete(id))
                          } else {
                             ids.forEach(id => next.add(id))
                          }
                          return Array.from(next)
                       })
                    }
                  }}
                  onFork={(sourceId) => {
                    forkNode(sessionId, sourceId)
                  }}
                  onMoveNode={(id, pos) => setNodePosition(sessionId, id, pos)}
                  onUpdateContent={(id, content) => updateNodeContent(sessionId, id, content)}
                  onAsk={(parentId, text) => handleSendMessage(parentId, text)}
                />
              ) : (
                <div className="h-full rounded-lg border border-dashed border-zinc-700" />
              )}
            </div>
            <div className="mt-3 text-xs text-zinc-400">提示：Cmd/Ctrl+点击节点 = 装配/取消装配该节点的上下文</div>
          </section>

          {!isGraphFullscreen && (
            <div className="col-span-5 flex flex-col h-full gap-4 min-h-0">
              <section className="flex-1 min-h-0 flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all duration-300">
                {session ? (
                  <ChatStream
                    nodes={session.nodes}
                    selectedNodeId={selectedNodeId}
                    activeSet={activeSet}
                    viewMode={session.ui.chatViewMode}
                    onChangeViewMode={(mode) => setChatViewMode(sessionId, mode)}
                    onSelectNode={(id) => setSelectedNode(sessionId, id)}
                    onLocateNode={(id) => setFocusTarget({ nodeId: id, ts: Date.now() })}
                  />
                ) : (
                  <div className="h-full rounded-lg border border-dashed border-zinc-700" />
                )}
              </section>
              <div className="flex-none">
                 <Composer
                    value={composerText}
                    onChange={setComposerText}
                    onOpenPreview={() => setPreviewOpen(true)}
                    onSend={async () => {
                      if (!session || !selectedNodeId) return
                      await handleSendMessage(selectedNodeId, fullComposerText, pendingSourceIds)
                    }}
                    disabled={!session || !selectedNodeId}
                    attachments={attachments}
                    onAddFiles={handleAddFiles}
                    onRemoveFile={handleRemoveFile}
                  />
              </div>
            </div>
          )}
        </div>
      </main>

      <ContextPreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        selectedNodeId={selectedNodeId}
        assembly={assembly}
        packs={session?.packs ?? {}}
        messages={previewMessages}
        onToggleEnabled={(packId, enabled) => {
          if (!selectedNodeId) return
          setAttachedEnabled(sessionId, selectedNodeId, packId, enabled)
        }}
        onCut={(packId, cut) => {
          if (!selectedNodeId) return
          setAttachedCutIndex(sessionId, selectedNodeId, packId, cut)
        }}
        onRegenerate={(packId) => {
          if (!selectedNodeId) return
          regenerateAttachedPack(sessionId, selectedNodeId, packId)
        }}
        onSend={async () => {
          if (!session || !selectedNodeId) return
          await handleSendMessage(selectedNodeId, fullComposerText, pendingSourceIds)
          setPreviewOpen(false)
        }}
      />
    </div>
  );
}
