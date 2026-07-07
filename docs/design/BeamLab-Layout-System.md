# BeamLab Layout System

The permanent 4-pane desktop layout:

```mermaid
graph TD
    TopNav[Top Navigation Bar]
    LeftSidebar[Left Project Explorer]
    CenterWorkspace[Center Engineering Workspace]
    RightWorkspace[Right Archie Workspace]
    BottomBar[Bottom Status Bar]

    TopNav --- LeftSidebar
    TopNav --- CenterWorkspace
    TopNav --- RightWorkspace
    LeftSidebar --- BottomBar
    CenterWorkspace --- BottomBar
    RightWorkspace --- BottomBar
```

- **Top Nav**: Global search, command palette trigger, workspace context.
- **Left Explorer**: File tree, structure hierarchy, model components.
- **Center Workspace**: Infinite canvas, 3D viewer, or code editor.
- **Right Archie Workspace**: The intelligence panel.
- **Bottom Status Bar**: System health, queue depth, metrics, diagnostics.\n