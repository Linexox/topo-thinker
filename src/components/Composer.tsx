import { Send, Eye, Paperclip, X, File as FileIcon } from "lucide-react"
import { useRef } from "react"
import { useSettingsStore } from "@/stores/useSettingsStore"

export interface Attachment {
  file: File
  content?: string
  loading?: boolean
}

export default function Composer(props: {
  value: string
  onChange: (v: string) => void
  onOpenPreview: () => void
  onSend: () => void
  disabled?: boolean
  attachments: Attachment[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (index: number) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uiConfig } = useSettingsStore()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      props.onAddFiles(Array.from(e.target.files))
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const isReading = props.attachments.some(a => a.loading)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
      {props.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-zinc-800">
          {props.attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200">
              <FileIcon className="h-3 w-3 text-zinc-400" />
              <span className="max-w-[150px] truncate" title={a.file.name}>{a.file.name}</span>
              {a.loading && <span className="text-zinc-500 ml-1">...</span>}
              <button
                onClick={() => props.onRemoveFile(i)}
                className="ml-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-start gap-3">
        <textarea
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          rows={3}
          placeholder="输入你的下一条消息…"
          className="flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          style={{
            fontSize: `${uiConfig.fontSize}px`,
            lineHeight: uiConfig.lineHeight,
            fontFamily: uiConfig.fontFamily
          }}
          disabled={props.disabled || isReading}
          onKeyDown={(e) => {
             if (e.nativeEvent.isComposing) return

             if (e.key === 'Enter') {
                if (e.metaKey || e.ctrlKey) {
                   e.preventDefault()
                   const target = e.currentTarget
                   const start = target.selectionStart
                   const end = target.selectionEnd
                   const newVal = props.value.substring(0, start) + "\n" + props.value.substring(end)
                   props.onChange(newVal)
                   // Restore cursor position
                   setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 1
                   }, 0)
                } else if (!e.shiftKey) {
                   e.preventDefault()
                   props.onSend()
                }
             }
          }}
        />
        <div className="flex flex-col gap-2">
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            disabled={props.disabled || isReading}
            title="上传文件"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => props.onSend()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-500 disabled:opacity-50"
            disabled={props.disabled || isReading}
          >
            <Send className="h-4 w-4" />
            {isReading ? "读取..." : "发送"}
          </button>
        </div>
      </div>
    </div>
  )
}

