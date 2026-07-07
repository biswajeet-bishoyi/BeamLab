# ADR 010: Archie Workspace & Provider Architecture

## Status
Accepted

## Context
BeamLab aims to provide a sophisticated AI "Engineering Intelligence" experience named Archie. Archie is not merely a chatbot, but a persistent workspace offering planning, context-awareness, execution timelines, and conversation history. To support a highly concurrent frontend UI development cycle without being blocked by the backend Runtime Gateway or LLM latency, we need a robust UI architecture that strictly decouples the UI from the AI engine.

## Decision
We have decided to introduce the `@beamlab/archie-client` package, serving as an explicit abstraction layer between the UI components (in `apps/web`) and the future intelligence backend.

### Key Architectural Choices:
- **`IArchieClient` Interface**: A permanent contract defining all interactions (`sendMessage`, `streamMessage`, `cancel`, `getState`, `getPlan`, etc.). The UI only knows about this interface.
- **Dependency Injection**: The React UI consumes the Archie data through an `<ArchieProvider client={client}>` context. This allows us to instantly hot-swap the backend provider.
- **Mock Archictecture (`MockArchieClient`)**: Initially, we implemented a sophisticated mock engine that simulates state transitions (`submitting` -> `planning` -> `streaming` -> `completed`), latency, streaming character-by-character output, and mock execution timelines. 
- **Event-Driven**: The client supports a `subscribe` model to trigger React re-renders precisely when data updates, mirroring how WebSockets will eventually work in the Runtime Gateway.
- **Advanced UI Components**: Introduced `react-markdown`, KaTeX, and syntax highlighting directly into the `@beamworks/design-system` to support complex engineering outputs seamlessly.

## Consequences
- **Positive**: The UI frontend (Sprint A1.4) can be built to 100% completion using mock streaming and state transitions without waiting for the backend Runtime Gateway.
- **Positive**: When the real Runtime Gateway is ready, integrating it will require exactly zero changes to the UI components. We will simply swap `new MockArchieClient()` with `new RuntimeGatewayClient()`.
- **Positive**: Future integrations (Offline, Enterprise, Local LLMs) are inherently supported by writing new implementations of `IArchieClient`.
- **Negative**: Adds initial overhead to define state machines and mock data generators.

## Future Evolution
The `MockArchieClient` will be replaced by `RuntimeGatewayClient` once the backend streaming architecture is finalized in upcoming sprints.
