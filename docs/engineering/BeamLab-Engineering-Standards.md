# BeamLab Engineering Standards

## The Constitution
This document serves as the permanent law of BeamLab engineering. All future code, architectures, and features must adhere to these standards.

### 1. Architecture Principles
- **Clean Architecture**: Domains must not depend on outer layers.
- **Immutability First**: Data structures flowing between subsystems (e.g., ExecutionPlans, ExecutionGraphs) must be immutable.
- **Strict Boundaries**: "What happens" (Planning), "How it connects" (Graph), and "When it runs" (Scheduler) are physically separated decoupled engines.

### 2. Runtime Principles
- **No Blocking IO**: The core Archie Kernel event loop must never block.
- **Predictable Memory Growth**: Bounded queues must be used for all scheduling operations.

### 3. AI Principles
- **Deterministic Wrappers**: All non-deterministic LLM behavior must be bound by strict validation schemas.
- **Human In The Loop**: Any action affecting permanent infrastructure or high-risk data requires explicit Approval requirements inside the ExecutionPlan.

### 4. Open Source & Enterprise
BeamLab is built as the open Engineering OS. Core infrastructure remains open; Enterprise extensions plug in via the Plugin-SDK without modifying the Archie Kernel.
