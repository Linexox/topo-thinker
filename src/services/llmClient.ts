import type { ApiConfig } from "@/stores/useSettingsStore"
import type { PreviewMessage } from "@/types/topo"

type ChatMessage = Pick<PreviewMessage, "role" | "content">

export async function streamChatCompletion(
  config: ApiConfig,
  messages: ChatMessage[],
  onContent: (content: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = config.baseUrl.trim().replace(/\/+$/, "")
  if (!baseUrl || !config.model.trim()) {
    throw new Error("请先在设置中填写 Base URL 和模型名称")
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model.trim(),
      messages: messages.map(({ role, content }) => ({ role, content })),
      stream: true,
    }),
    signal,
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000)
    throw new Error(`API ${response.status}${detail ? `: ${detail}` : ""}`)
  }
  if (!response.body) throw new Error("API 没有返回可读取的响应流")

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  let eventData: string[] = []
  let content = ""
  let finished = false

  const dispatch = () => {
    if (eventData.length === 0) return
    const data = eventData.join("\n")
    eventData = []
    if (data === "[DONE]") {
      finished = true
      return
    }
    let parsed: { choices?: Array<{ delta?: { content?: string | null } }> }
    try {
      parsed = JSON.parse(data)
    } catch {
      throw new Error("API 返回了无效的流式数据")
    }
    const delta = parsed.choices?.[0]?.delta?.content
    if (typeof delta === "string" && delta.length > 0) {
      content += delta
      onContent(content)
    }
  }

  const processLine = (line: string) => {
    const normalized = line.endsWith("\r") ? line.slice(0, -1) : line
    if (normalized === "") {
      dispatch()
    } else if (normalized.startsWith("data:")) {
      eventData.push(normalized.slice(5).trimStart())
    }
  }

  try {
    while (!finished) {
      const { done, value } = await reader.read()
      if (done) break
      pending += decoder.decode(value, { stream: true })
      let newline = pending.indexOf("\n")
      while (newline !== -1) {
        processLine(pending.slice(0, newline))
        pending = pending.slice(newline + 1)
        if (finished) break
        newline = pending.indexOf("\n")
      }
    }
    if (!finished) {
      pending += decoder.decode()
      if (pending) processLine(pending)
      dispatch()
    }
  } finally {
    reader.releaseLock()
  }

  if (!content.trim()) throw new Error("API 未返回可显示的回复")
  return content
}
