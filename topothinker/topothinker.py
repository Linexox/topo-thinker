import reflex as rx
from .pages.flow_diagram import flow_page

def index() -> rx.Component:
    return rx.container(
        rx.color_mode.button(position="top-right"),
        rx.vstack(
            rx.heading("TopoThinker", size="9"),
            rx.text(
                "Graph-structured Conversation System",
                size="5",
            ),
            rx.link(
                rx.button("Enter Graph View", size="4", color_scheme="blue"),
                href="/graph",
            ),
            spacing="5",
            justify="center",
            min_height="85vh",
        ),
    )


app = rx.App()
app.add_page(index)
app.add_page(flow_page, route="/graph")
