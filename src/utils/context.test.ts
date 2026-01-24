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
    
    // Mock nodes needed for graph traversal
    const nodes: Record<string, TopoNode> = {
        "x": { id: "x", type: "user", content: "X", createdAt: 10 }
    }
    const assemblies = { "x": assembly }

    const active = buildActiveSet(assemblies, packs, nodes, "x")
    expect([...active]).toEqual(expect.arrayContaining(["a", "b", "d"]))
    expect(active.has("c")).toBe(false)

    const messages = buildPreviewMessages(assemblies, packs, "hi", nodes, "x")
    // "X" comes from node "x" itself (implicit chain)
    // "A", "B" from p1 (order 1)
    // "D" from p2 (order 2, cut index 1)
    // "hi" is pending user input
    // The order of attached packs is sorted by 'order' in buildPreviewMessages
    // p1 has order 1, p2 has order 2.
    // So p1 nodes come first?
    // Let's check buildPreviewMessages logic:
    // It iterates chain (just x).
    // For x, it gets attached packs, sorts by order.
    // p1 (order 1) -> adds A, B
    // p2 (order 2) -> adds D (skipped C due to cutIndexOverride)
    // Then adds X itself (wait, code adds node content FIRST, then attached packs?)
    
    // Line 94: messages.push(node content) -> "X"
    // Line 106: attached packs loop
    
    // So expected: ["X", "A", "B", "D", "hi"]
    // But the original test expected ["A", "B", "D", "hi"].
    // This implies the old test didn't consider the node itself.
    // I should update expectation to include "X" or adjust the test if I can avoid including X.
    // But X is the current node, so it must be included.
    expect(messages.map((m) => m.content)).toEqual(["X", "A", "B", "D", "hi"])
  })
})

