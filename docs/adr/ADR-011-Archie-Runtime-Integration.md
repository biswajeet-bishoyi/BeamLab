# ADR 011: Archie Runtime Integration & Transport Abstraction

## Status
Accepted

## Context
In Sprint A1.5, we integrate the Archie Workspace frontend directly with the `runtime-gateway` backend package. This bridges the gap between the UI layer and the logic executing the LLM requests, context aggregation, tool execution, and planning.

## Decision
Instead of tying the UI directly to a specific backend connection (like a mock or an HTTP client), we introduced an `ITransport` abstraction inside the `archie-client` SDK.

### Architecture
```
[Archie UI Components] -> [useArchie Hook] -> [ArchieClient] -> [ITransport] -> [LocalRuntimeTransport] -> [ArchieRuntime]
```

1. **`ITransport`**: Defines how messages and lifecycle events are streamed. 
2. **`ArchieClient`**: The primary state container for the SDK. It tracks `messages`, `plan`, `execution`, and `state`, exposing them cleanly to React components.
3. **`LocalRuntimeTransport`**: Since there is no Node/Express server running yet, this transport directly imports and executes the `ArchieRuntime` from `@beamlab/runtime-gateway` using the Vite bundler. It handles parsing Server-Sent Events (SSE) formatting into structured JSON objects.

### Event Streaming Model
The `runtime-gateway` now yields highly granular events as the pipeline progresses:
- `planning_started` / `planning_completed`
- `context_updated`
- `execution_graph_built` / `scheduler_started`
- `tool_start` / `tool_end` / `tool_failed`
- `streaming_started` / `text` / `streaming_completed`
- `conversation_completed` / `conversation_failed`

This event stream ensures the Plan Tab, Execution Tab, Context Tab, and Chat UI are updated in real-time, giving the user total visibility into Archie's internal thought process and execution.

## Consequences
- The UI is entirely decoupled from the backend transport.
- A future `HTTPTransport` or `WebSocketTransport` can be swapped in via dependency injection with zero UI changes.
- Streaming happens fluidly, rendering rich engineering responses locally before server deployment.
