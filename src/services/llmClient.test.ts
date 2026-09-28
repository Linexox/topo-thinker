import { describe, expect, it, vi } from "vitest"
import { streamChatCompletion } from "@/services/llmClient"

const config = {
  baseUrl: "https://example.test/v1/",
  apiKey: "test-key",
  model: "test-model",
}

function responseFromChunks(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, { status })
}

describe("streamChatCompletion", () => {
  it("parses an SSE event split across network chunks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseFromChunks([
      'data: {"choices":[{"delta":{"content":"Hel',
      'lo"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ]))
    vi.stubGlobal("fetch", fetchMock)
    const updates: string[] = []

    await expect(streamChatCompletion(config, [], (content) => updates.push(content))).resolves.toBe("Hello world")
    expect(updates).toEqual(["Hello", "Hello world"])
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("reports an HTTP error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad key", { status: 401 })))

    await expect(streamChatCompletion(config, [], () => undefined)).rejects.toThrow("API 401: bad key")
  })

  it("reports an empty stream instead of leaving the UI pending", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(responseFromChunks(["data: [DONE]\n\n"])))

    await expect(streamChatCompletion(config, [], () => undefined)).rejects.toThrow("API 未返回可显示的回复")
  })
})
