import { describe, expect, it } from "vitest"
import { buildActiveSet, buildPreviewMessages, buildSnapshotPackNodes } from "@/utils/context"
import type { ContextAssembly, SnapshotPack, TopoNode } from "@/types/topo"

describe("buildSnapshotPackNodes", () => {
  it("builds root->source chain by preferredParent", () => {
    const nodes: Record<string, TopoNode> = {
      a: { id: "a", type: "system", content: "root", createdAt: 1 },
      b: { id: "b", type: "user", content: "b", createdAt: 2, preferredParentId: "a" },
      c: { id: "c", type: "assistant", content: "c", createdAt: 3, preferredParentId: "b" },
    }

    const chain = buildSnapshotPackNodes("c", nodes)
    expect(chain.map((n) => n.id)).toEqual(["a", "b", "c"])
  })

  it("stops on cycle", () => {
    const nodes: Record<string, TopoNode> = {
      a: { id: "a", type: "system", content: "a", createdAt: 1, preferredParentId: "b" },
      b: { id: "b", type: "user", content: "b", createdAt: 2, preferredParentId: "a" },
    }
    const chain = buildSnapshotPackNodes("a", nodes)
    expect(chain.length).toBeGreaterThan(0)
  })
})

describe("buildActiveSet / buildPreviewMessages", () => {
  it("respects order, enabled and cutIndexOverride", () => {
    const pack1: SnapshotPack = {
      packId: "p1",
      shortId: "s1",
      sourceNodeId: "n1",
      createdAt: 1,
      strategy: "path_to_root",
      orderDirection: "root_to_source",
      defaultCutIndex: 0,
      nodes: [
        { packNodeId: "p1-0", originalNodeId: "a", type: "system", content: "A", createdAt: 1 },
        { packNodeId: "p1-1", originalNodeId: "b", type: "user", content: "B", createdAt: 2 },
      ],
    }
    const pack2: SnapshotPack = {
      packId: "p2",
      shortId: "s2",
      sourceNodeId: "n2",
      createdAt: 1,
      strategy: "path_to_root",
      orderDirection: "root_to_source",
      defaultCutIndex: 0,
      nodes: [
        { packNodeId: "p2-0", originalNodeId: "c", type: "assistant", content: "C", createdAt: 3 },
        { packNodeId: "p2-1", originalNodeId: "d", type: "tool", content: "D", createdAt: 4 },
      ],
    }

    const packs: Record<string, SnapshotPack> = { p1: pack1, p2: pack2 }
    const assembly: ContextAssembly = {
      nodeId: "x",
      attachedPacks: [
        { packId: "p2", order: 2, enabled: true, cutIndexOverride: 1 },
        { packId: "p1", order: 1, enabled: true },
      ],
    }

    const active = buildActiveSet(assembly, packs)
    expect([...active]).toEqual(expect.arrayContaining(["a", "b", "d"]))
    expect(active.has("c")).toBe(false)

    const messages = buildPreviewMessages(assembly, packs, "hi")
    expect(messages.map((m) => m.content)).toEqual(["A", "B", "D", "hi"])
  })
})

