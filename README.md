# TopoThinker - 下一代图状交互 AI 对话系统
## Graph-Structured AI Conversation System

TopoThinker 旨在突破传统 AI 对话系统（如 ChatGPT）的“线性列表”限制，通过**有向无环图（DAG）**的数据结构，完整映射人类“发散”与“收敛”的复杂思维过程。

---

## 💡 核心理念 (Core Concepts)

传统的对话是单线程的流水账，而 TopoThinker 将对话重构为动态的知识图谱：

### 1. 从“树”到“图”的演进 (Evolution to Graph)
*   **线性 (Linear)**: `A -> B -> C` (传统模式，容易丢失上下文，无法并行思考)
*   **树状 (Tree)**: `A` 分叉出 `B1` 和 `B2` (支持发散性思维，探索不同可能性)
*   **图状 (Graph/DAG)**: `B1` 和 `B2` 合并为 `C` (支持收敛性思维，整合结论)

### 2. 思维模型 (Thinking Model)
*   **发散 (Divergence / Branching)**:
    *   允许用户针对同一个问题衍生出多个不同的讨论方向。
    *   *场景*: 代码重构时同时尝试 Python 版和 Rust 版；或者在创意写作中构思两个不同的故事走向。
*   **收敛 (Convergence / Merging)**:
    *   允许将多个并行的对话分支合并到一个新的节点。
    *   *场景*: 将两个不同技术方案的讨论结果汇总，让 AI 进行对比分析或最终决策。

---

## 🛠 关键技术方案 (Technical Architecture)

### 1. 数据结构 (Data Model)
系统不再使用单一的 `parentId`，而是采用**多父节点引用**来支持图结构。

```typescript
interface ConversationNode {
  id: string;
  // 核心差异：支持多个父节点，从而构成 DAG (有向无环图)
  parentIds: string[]; 
  
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  
  // 节点元数据
  metadata: {
    createdAt: number;
    tags?: string[];
    // 定义合并时的上下文处理策略
    mergeStrategy?: 'concat' | 'summary' | 'interleaved'; 
  };
}
```

### 2. 核心难点：上下文线性化 (Context Linearization)
由于 LLM 的 Context Window 本质上是线性的，当发生“节点合并”（`A1, A2 -> B`）时，系统必须将非线性的图结构转化为线性输入。

**主要策略 (Strategies):**
*   **策略 A - 简单拼接 (Concatenation)**: 
    *   按顺序拼接父节点历史：`Context(A1) + Context(A2) -> B`。
    *   *适用*: 短对话，Token 充足的情况。
*   **策略 B - 拓扑排序与去重 (Topological Sort & Deduplication)**:
    *   智能解析公共祖先，避免重复内容，按逻辑因果顺序排列节点。
*   **策略 C - 摘要引用 (Summary & Reference)**:
    *   在进入合并节点前，利用 AI 自动生成父分支的“摘要”。
    *   *Prompt*: "分支1讨论了X，分支2讨论了Y，请综合两者..."
    *   *适用*: 长对话，需要高层次归纳的情况。

---

## 🎯 如果实现？ (Future Roadmap)
1.  **后端**: 构建基于图数据库或扁平 Map 的存储引擎，实现高效的路径回溯算法。
2.  **核心算法**: 开发 Context Builder，负责将 DAG 路径动态转化为 Prompt。
3.  **UI/UX**: 
    *   可视化图谱展示（类似 Git Graph）。
    *   交互式的连线与合并操作（Merge Request for Thoughts）。

---
> *"把对话从一条线，变成一张网，捕捉思维的每一个火花。"*

---

## 🚀 快速开始 (Quick Start)

### 环境要求 (Prerequisites)
*   Node.js (推荐 v18 或更高版本)
*   npm (或 pnpm/yarn)

### 1. 安装依赖 (Install Dependencies)
```bash
npm install
```

### 2. 启动开发服务器 (Start Development Server)
```bash
npm run dev
```
启动后访问 [http://localhost:5173](http://localhost:5173) 即可体验。

### 3. 构建生产版本 (Build for Production)
```bash
npm run build
```

### 4. 配置说明 (Configuration)
项目启动后，请在设置页面（Settings）配置您的 LLM API 信息（API Key 和 Base URL），以便正常使用对话功能。