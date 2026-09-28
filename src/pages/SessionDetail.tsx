import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, PanelRightOpen, Settings, Maximize2, Minimize2, MessageSquare } from "lucide-react";
import { useTopoStore } from "@/stores/useTopoStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import GraphCanvas from "@/components/GraphCanvas";
import ChatStream from "@/components/ChatStream";
import ContextPreviewDrawer from "@/components/ContextPreviewDrawer";
import Composer, { Attachment } from "@/components/Composer";
import { buildActiveSet, buildPreviewMessages } from "@/utils/context";
import { processFile } from "@/utils/fileProcessor";
import { streamChatCompletion } from "@/services/llmClient";

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
  const layoutMode = useSettingsStore((s) => s.uiConfig.layoutMode || 'top');
  const setUiConfig = useSettingsStore((s) => s.setUiConfig);

  const [composerText, setComposerText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);
  const [pendingSourceIds, setPendingSourceIds] = useState<string[]>([]);
  const [focusTarget, setFocusTarget] = useState<{ nodeId: string; ts: number } | undefined>(undefined);
  const [leftPanelWidth, setLeftPanelWidth] = useState(58.33); // Default to ~7/12
  const [isResizingState, setIsResizingState] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsResizingState(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    setIsResizingState(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    // Offset by half handle width (8px) to keep cursor centered
    const relativeX = e.clientX - containerRect.left - 8;
    const newWidth = (relativeX / containerRect.width) * 100;
    
    // Limit width between 20% and 80% to ensure both panels remain usable
    if (newWidth >= 20 && newWidth <= 80) {
      setLeftPanelWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    if (isResizingState) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingState, resize, stopResizing]);

  const selectedNodeId = session?.ui.selectedNodeId;
  const assembly = selectedNodeId ? session?.assemblies[selectedNodeId] : undefined;

  useEffect(() => {
    if (sessionId) ensureSession(sessionId);
  }, [ensureSession, sessionId]);

  useEffect(() => () => requestRef.current?.abort(), [sessionId]);

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
        const content = await processFile(file);
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
    if (!sessionId || sendingRef.current) return
    
    // Prevent sending if files are still loading
    if (parentId === selectedNodeId && attachments.some(a => a.loading)) return

    if (!text.trim()) return
    sendingRef.current = true
    setIsSending(true)

    const userNodeId = addUserNode(sessionId, parentId, text, sourceIds)
    
    // Clear pending sources and inputs
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
    
    const assistantNodeId = addAssistantNode(sessionId, userNodeId, "Thinking...")
    setFocusTarget({ nodeId: assistantNodeId, ts: Date.now() })

    const controller = new AbortController()
    requestRef.current = controller
    let receivedContent = ""
    try {
      await streamChatCompletion(apiConfig, messages, (content) => {
        receivedContent = content
        updateNodeContent(sessionId, assistantNodeId, content)
      }, controller.signal)
    } catch (error) {
      const message = controller.signal.aborted
        ? "请求已取消"
        : error instanceof Error ? error.message : String(error)
      updateNodeContent(sessionId, assistantNodeId, `${receivedContent}${receivedContent ? "\n\n" : ""}请求失败：${message}`)
    } finally {
      requestRef.current = null
      sendingRef.current = false
      setIsSending(false)
    }
  }

  if (!sessionId) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Sidebar Navigation */}
      <aside className="flex-none w-16 flex flex-col items-center py-4 border-r border-zinc-800 bg-zinc-900 gap-6 z-20 transition-all duration-300">
        <div className="flex w-full px-2 justify-center">
          <Link
            to="/sessions"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="返回会话列表"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        
        <div className="flex-1" />

        <div className="flex w-full px-2 justify-center flex-col gap-4">
           <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            title="预览上下文"
          >
            <PanelRightOpen className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setUiConfig({ layoutMode: layoutMode === 'zen' ? 'top' : 'zen' })}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${layoutMode === 'zen' ? 'bg-primary-600 text-white hover:bg-primary-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
            title={layoutMode === 'zen' ? "退出专注模式" : "专注模式"}
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          <Link
            to="/settings"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
            title="设置"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header for Title - Only show in top mode */}
        {layoutMode === 'top' && (
          <header className="flex-none border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
             <div className="px-6 py-3">
                <div className="text-sm font-semibold">{session?.title ?? `会话：${sessionId}`}</div>
                <div className="text-xs text-zinc-400">会话详情 MVP 布局占位</div>
             </div>
          </header>
        )}
        
        {/* Floating Title for Side Mode */}
        {layoutMode === 'side' && (
           <div className="absolute top-4 left-6 z-40 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
              <div className="text-sm font-bold text-zinc-200 drop-shadow-md">{session?.title ?? `会话：${sessionId}`}</div>
           </div>
        )}

        <div className="flex-1 min-h-0 relative">
          <div ref={containerRef} className={`flex w-full h-full transition-all ${isGraphFullscreen ? 'fixed inset-0 z-50 bg-zinc-950 p-4' : 'px-6 py-6'}`}>
          {layoutMode !== 'zen' && (
            <section 
              style={{ width: isGraphFullscreen ? '100%' : `${leftPanelWidth}%` }}
              className={`flex-none flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${isResizingState ? '' : 'transition-all duration-300'} relative group min-w-0`}
            >
            
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
          )}

          {isResizingState && (
            <div className="fixed inset-0 z-[100] cursor-col-resize bg-transparent" />
          )}

          {!isGraphFullscreen && layoutMode !== 'zen' && (
            <div
              className="w-4 flex-none z-10 cursor-col-resize flex items-center justify-center group/resizer hover:scale-x-110 transition-transform select-none active:scale-x-125"
              onMouseDown={startResizing}
            >
              <div className="w-1 h-8 rounded-full bg-zinc-800 group-hover/resizer:bg-primary-500 transition-colors" />
            </div>
          )}

          {!isGraphFullscreen && (
            <div className={`flex flex-col flex-1 h-full min-h-0 ${layoutMode === 'zen' ? 'max-w-4xl mx-auto w-full' : ''}`}>
              <section className={`flex-1 min-h-0 flex flex-col rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${isResizingState ? '' : 'transition-all duration-300'}`}>
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
              <div className="mt-4">
                  <Composer
                    value={composerText}
                    onChange={setComposerText}
                    onOpenPreview={() => setPreviewOpen(true)}
                    attachments={attachments}
                    onSend={async () => {
                      if (!session || !selectedNodeId) return;
                      await handleSendMessage(selectedNodeId, fullComposerText, pendingSourceIds);
                    }}
                    onAddFiles={handleAddFiles}
                    onRemoveFile={handleRemoveFile}
                    disabled={!session || isSending}
                  />
                </div>
            </div>
          )}
        </div>
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
