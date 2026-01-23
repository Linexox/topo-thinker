import reflex as rx
from typing import Any, List
from topothinker.graph_state import GraphState

# Custom Div with Event Support
class TrackedDiv(rx.el.Div):
    @classmethod
    def get_event_triggers(cls) -> dict[str, Any]:
        triggers = super().get_event_triggers().copy()
        triggers["on_mouse_move"] = lambda e0: [e0.clientX, e0.clientY]
        triggers["on_mouse_down"] = lambda e0: [e0]
        triggers["on_mouse_up"] = lambda e0: []
        triggers["on_click"] = lambda e0: []
        return triggers

def node_component(node: dict):
    is_selected = GraphState.selected_node_ids.contains(node["id"])
    return TrackedDiv.create(
        rx.vstack(
            rx.text(node["content"], font_weight="bold", color="white"),
            rx.text(node["answer"], font_size="sm", color="gray.300"),
            width="100%",
            padding="4",
        ),
        position="absolute",
        left=node["x"], 
        top=node["y"],
        width="300px",
        height="auto",
        bg="gray.800",
        border=rx.cond(is_selected, "2px solid", "1px solid"),
        border_color=rx.cond(is_selected, "#9f7aea", "gray.600"),
        box_shadow=rx.cond(is_selected, "0 0 12px rgba(159, 122, 234, 0.5)", "lg"),
        border_radius="md",
        cursor="move",
        on_click=lambda: GraphState.toggle_selection(node["id"]),
        on_mouse_down=lambda e: GraphState.set_dragging_node(node["id"]),
        on_mouse_up=GraphState.on_canvas_mouse_up,
        key=node["id"], 
        z_index="5",
    )

def render_line(edge: dict):
    return rx.el.line(
        x1=edge["x1"],
        y1=edge["y1"],
        x2=edge["x2"],
        y2=edge["y2"],
        stroke="#555",
        stroke_width="2",
        key=edge["id"],
    )

def flow_page():
    return rx.container(
        TrackedDiv.create(
            # --- Main Canvas Layer ---
            # SVG Layer (Lines)
            rx.el.svg(
                rx.foreach(GraphState.drawable_edges, render_line),
                style={
                    "position": "absolute", "top": 0, "left": 0, "width": "100%", "height": "100%", 
                    "pointerEvents": "none", "zIndex": 0
                }
            ),

            # Node Layer
            rx.foreach(
                GraphState.nodes,
                lambda n_item: node_component(n_item[1]) 
            ),
            
            # Canvas Content Styles (Transform applied here)
            style={
                "width": "100vw",
                "height": "100vh",
                "backgroundColor": "#1e1e1e",
                "overflow": "hidden",
                "position": "relative",
                "transform": f"scale({GraphState.zoom}) translate({GraphState.viewport_x}px, {GraphState.viewport_y}px)",
                "transformOrigin": "0 0",
            },
            
            # Events
            on_mouse_move=GraphState.on_canvas_mouse_move, 
            on_mouse_up=GraphState.on_canvas_mouse_up,
        ),
        
        # --- UI Overlay Layer (Fixed Position, Ignore Zoom) ---
        
        # Top Toolbar
        rx.hstack(
            rx.button("Load Demo", on_click=GraphState.load_demo_data, size="2"),
            rx.text(f"Zoom: {GraphState.zoom}", color="white", size="2"),
            rx.button("+", on_click=GraphState.zoom_in, size="2"),
            rx.button("-", on_click=GraphState.zoom_out, size="2"),
            rx.button("Merge", on_click=GraphState.merge_selected_nodes, color_scheme="purple", size="2"),
            rx.button("Link", on_click=GraphState.link_nodes, color_scheme="blue", size="2"),
            rx.button("Unlink", on_click=GraphState.disconnect_nodes, color_scheme="red", size="2"),
            
            position="fixed",
            top="20px",
            left="20px",
            z_index="20",
            bg="gray.900",
            padding="2",
            border_radius="md",
            spacing="2",
            opacity="0.9",
        ),

        # Left Input Panel
        rx.vstack(
            rx.heading("Input", size="3", color="white"),
            rx.text_area(
                value=GraphState.input_text,
                on_change=GraphState.set_input_text,
                placeholder="Type here to add a node...",
                width="100%",
                height="100px",
                bg="gray.800",
                color="white",
                border_color="gray.600",
            ),
            rx.button(
                "Add Node", 
                on_click=GraphState.add_node_from_input, 
                width="100%", 
                color_scheme="green"
            ),
            rx.text(
                "Select a node to branch from, or add to Root.", 
                font_size="xs", 
                color="gray.400"
            ),
            
            position="fixed",
            top="80px", # Below toolbar
            left="20px",
            width="250px",
            z_index="20",
            bg="gray.900",
            padding="4",
            border_radius="md",
            spacing="3",
            border="1px solid",
            border_color="gray.700",
            opacity="0.9",
        )
    )
