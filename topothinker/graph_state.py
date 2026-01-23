import reflex as rx
import uuid
import random

class GraphState(rx.State):
    # 画布视图状态 (x, y, zoom)
    viewport_x: float = 0
    viewport_y: float = 0
    zoom: float = 1.0
    
    # 是否正在进行某些操作
    is_dragging: bool = False
    dragging_node_id: str = ""
    last_mouse_x: float = 0
    last_mouse_y: float = 0

    # 选中的节点 ID 列表 (用于合并)
    selected_node_ids: list[str] = []

    # 输入框文本
    input_text: str = ""

    # 节点数据结构: {id: {id, x, y, content, type}}
    # content 模拟简单的 Q&A
    nodes: dict[str, dict] = {
        "root": {
            "id": "root", 
            "x": 400, 
            "y": 300, 
            "content": "Root Question: How to build a DAG chat?", 
            "answer": "We use a graph structure!",
            "type": "root"
        }
    }

    # 边数据结构: [{source, target, id}]
    edges: list[dict] = []

    @rx.var
    def drawable_edges(self) -> list[dict]:
        """计算边的绘制坐标 (x1, y1, x2, y2)"""
        res = []
        for edge in self.edges:
            s_node = self.nodes.get(edge["source"])
            t_node = self.nodes.get(edge["target"])
            if s_node and t_node:
                # 假设节点宽 300，高 200，连接中心点
                res.append({
                    "id": edge["id"],
                    "x1": s_node["x"] + 150,
                    "y1": s_node["y"] + 100,
                    "x2": t_node["x"] + 150,
                    "y2": t_node["y"], # 目标连到顶部
                    "source": edge["source"],
                    "target": edge["target"]
                })
        return res

    def set_dragging_node(self, node_id: str):
        """开始拖拽 - 不依赖事件坐标，依赖 on_mouse_move 的持续追踪"""
        self.is_dragging = True
        self.dragging_node_id = node_id
        # Client coordinates are already tracked in on_canvas_mouse_move

    def on_canvas_mouse_up(self):
        """结束拖拽"""
        self.is_dragging = False
        self.dragging_node_id = ""

    def on_canvas_mouse_move(self, client_x: float, client_y: float):
        """处理画布上的鼠标移动"""
        # 始终更新鼠标位置，以便 toggle dragging 时位置连续
        dx = (client_x - self.last_mouse_x) / self.zoom
        dy = (client_y - self.last_mouse_y) / self.zoom
        self.last_mouse_x = client_x
        self.last_mouse_y = client_y

        if self.is_dragging and self.dragging_node_id:
            node = self.nodes.get(self.dragging_node_id)
            if node:
                # 更新节点位置
                self.nodes[self.dragging_node_id]["x"] = node["x"] + dx
                self.nodes[self.dragging_node_id]["y"] = node["y"] + dy
                self.nodes = self.nodes.copy()
        
        # TODO: self.is_panning logic if needed

    def update_node_position(self, node_id: str, x: int, y: int):
        """更新节点位置 (用于 draggable 组件的回调)"""
        if node_id in self.nodes:
            self.nodes[node_id]["x"] = x
            self.nodes[node_id]["y"] = y
            # 触发状态更新以重绘边
            self.nodes = self.nodes.copy()

    def add_node(self, parent_id: str, question: str):
        """从某个父节点分支出新节点"""
        new_id = str(uuid.uuid4())[:8]
        if parent_id not in self.nodes:
             return
             
        parent_node = self.nodes[parent_id]
        
        # 新节点位置在父节点下方并随机偏移一点
        new_x = parent_node["x"] + random.randint(-50, 50)
        new_y = parent_node["y"] + 250
        
        new_node = {
            "id": new_id,
            "x": new_x,
            "y": new_y,
            "content": question,
            "answer": "Thinking... (Placeholder)", # 目前暂时不需要 API
            "type": "normal"
        }
        
        self.nodes[new_id] = new_node
        self.edges.append({"source": parent_id, "target": new_id, "id": f"e_{parent_id}_{new_id}"})

    def add_node_from_input(self):
        """Uses the global input_text to add a node to the currently selected node(s)."""
        if not self.input_text.strip():
            return
            
        if not self.selected_node_ids:
            # Maybe add to root or warn? Let's just create a new independent node or add to root if exists
            if "root" in self.nodes:
                self.add_node("root", self.input_text)
            else:
                # Totally new independent node? 
                # For now let's just make sure there is a root or warn. 
                pass
        
        elif len(self.selected_node_ids) == 1:
            parent_id = self.selected_node_ids[0]
            self.add_node(parent_id, self.input_text)
            
        else:
            # Multiple selected? 
            # Maybe merge and then add? Or branch from all?
            # For simplicity, branch from the first one or ignore.
            # Let's branch from the last selected (most recent).
            parent_id = self.selected_node_ids[-1]
            self.add_node(parent_id, self.input_text)
            
        self.input_text = ""

    def toggle_selection(self, node_id: str):
        """选中/取消选中节点"""
        if node_id in self.selected_node_ids:
            self.selected_node_ids.remove(node_id)
        else:
            self.selected_node_ids.append(node_id)

    def merge_selected_nodes(self):
        """合并所有选中的节点到一个新节点"""
        if not self.selected_node_ids:
            return
            
        new_id = str(uuid.uuid4())[:8]
        
        # 计算新节点的中心位置
        avg_x = sum([self.nodes[nid]["x"] for nid in self.selected_node_ids]) / len(self.selected_node_ids)
        avg_y = max([self.nodes[nid]["y"] for nid in self.selected_node_ids]) + 250
        
        new_node = {
            "id": new_id,
            "x": avg_x,
            "y": avg_y,
            "content": "Merged Context",
            "answer": "Merged Analysis...",
            "type": "merge"
        }
        
        self.nodes[new_id] = new_node
        
        # 为每个选中的节点创建连线
        for nid in self.selected_node_ids:
            self.edges.append({"source": nid, "target": new_id, "id": f"e_{nid}_{new_id}"})
            
        # 清空选中
        self.selected_node_ids = []

    def delete_edge(self, edge_id: str):
        """删除边"""
        self.edges = [e for e in self.edges if e["id"] != edge_id]

    def link_nodes(self):
        """将选中的两个节点相连 (如果有且仅有2个)"""
        if len(self.selected_node_ids) == 2:
            source, target = self.selected_node_ids
            # 简单去重检查
            exists = any(e for e in self.edges if e["source"] == source and e["target"] == target)
            if not exists:
                self.edges.append({"source": source, "target": target, "id": f"e_{source}_{target}"})
            self.selected_node_ids = []

    def disconnect_nodes(self):
        """断开选中的两个节点之间的连线"""
        if len(self.selected_node_ids) == 2:
            s, t = self.selected_node_ids
            # Remove any edge between s and t
            self.edges = [
                e for e in self.edges 
                if not ((e["source"] == s and e["target"] == t) or (e["source"] == t and e["target"] == s))
            ]
            self.selected_node_ids = []

    def load_demo_data(self):
        """加载初始 Demo 数据"""
        self.nodes = {
             "root": {"id": "root", "x": 500, "y": 100, "content": "Start", "answer": "Hello", "type": "root"},
             "a1": {"id": "a1", "x": 300, "y": 400, "content": "Branch A", "answer": "Python option", "type": "normal"},
             "a2": {"id": "a2", "x": 700, "y": 400, "content": "Branch B", "answer": "Rust option", "type": "normal"},
        }
        self.edges = [
            {"source": "root", "target": "a1", "id": "e1"},
            {"source": "root", "target": "a2", "id": "e2"},
        ]

    # 画布控制
    def zoom_in(self):
        self.zoom = min(self.zoom + 0.1, 3.0)
    
    def zoom_out(self):
        self.zoom = max(self.zoom - 0.1, 0.2)
    
    def pan(self, dx: int, dy: int):
        self.viewport_x += dx
        self.viewport_y += dy
