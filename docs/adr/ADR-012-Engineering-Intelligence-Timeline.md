# ADR 012: Engineering Intelligence Timeline

## Status
Accepted

## Context
Transparency is a core pillar of BeamLab's engineering ethos. Unlike consumer AI tools which often obfuscate their reasoning processes behind simple loading spinners, professional engineers require total visibility into how their requests are interpreted, analyzed, planned, and executed. 

We needed a way to visualize the entire runtime lifecycle—from intent recognition and context aggregation to tool execution and result generation—without overwhelming the main workspace tabs.

## Decision
We introduced the **Engineering Intelligence Timeline** as a persistent, collapsible, and resizable panel docked at the bottom of the Archie Workspace sidebar. 

1. **Decoupled Architecture**: The Timeline is completely separated from the backend `runtime-gateway`. It subscribes to the normalized event stream emitted by `ArchieClient` (via `ITransport`) and stores the event history using a local `zustand` store (`useTimelineStore`).
2. **Cross-Cutting View**: By placing the Timeline *outside* the tab router (Chat/Plan/Execution/Context/History), it acts as a unified narrative layer. Users can watch the execution pipeline progress while simultaneously interacting with the chat or viewing the detailed plan.
3. **Stage-Based Visualization**: Raw stream events (e.g. `planning_started`, `tool_start`) are mapped to high-level engineering stages (Intent Recognition → Planning → Context Collection → Tool Execution → Result Generation).

## Consequences
- **Trust & Transparency**: Engineers can trace exactly which context was injected into the LLM prompt and exactly which tools were invoked, down to the millisecond.
- **Maintainability**: The event parsing logic is isolated in `useTimelineStore`, keeping UI components purely declarative.
- **Future Capabilities**: Since the entire timeline history is preserved locally in the store, we have a clear path to supporting "Timeline Export", "Session Replay", and "Multiplayer Visualization" in future sprints.
