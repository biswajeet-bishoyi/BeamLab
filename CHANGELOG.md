# CHANGELOG

## [Unreleased]

### Added
- **Structural Analysis Agent (`@beamlab/agent-structural-analysis`)**: A9.1 Release
  - Integrated `EngineeringReasoningPipeline`.
  - Implemented `ModelValidator`, `AnalysisPlanning`, and `StrategyRegistry`.
  - Introduced `SolverAbstraction`, `ResultInterpreter`, `EngineeringReasoner`, and `RecommendationGenerator`.
  - Integrated `ExplanationBuilder` to generate design narratives.
  - Full integration with Developer Studio.
- **Agent Runtime & Memory System**: Added foundation for autonomous agents, memory retrieval, and persistence.
- **Knowledge Platform & Policy Engine**: Added systems for domain-specific knowledge retrieval and rule enforcement.
- **Resource Manager**: Resource lifecycle management for agent context.
- **Workspace Runtime**: Introduced the workspace orchestrator and dynamic layout integration.
- **Developer Studio Overhauls**: 
  - Central Engineering Canvas with restored interactive diagramming and 3D preview placeholders.
  - Integrated Timeline, Execution Graph, and Recommendation Center.
  - Global Overlays restored: Environment Gallery, AI Engineering Studio, Time Machine, Presentation Mode, Export Studio, Performance Overlay.
- **Archie Kernel (`@beamlab/archie-kernel`)**: Core OS and Session Management.
- **Runtime Gateway**: Streaming pipeline and transport layer.
- **Task Scheduler (`@beamlab/task-scheduler`)**: Execution orchestrator.
- **Execution Graph Engine (`@beamlab/execution-graph`)**: Immutable DAGs and Dependency Resolution.
- **Planning Engine Core (`@beamlab/planning-engine`)**: Intent Classification and Rule Planners.

### Changed
- Decoupled Planning from Execution at the architectural level.
- Migrated Workspace to use `react-resizable-panels` while maintaining core interactive tools and overlays.

### Fixed
- Restored Dashboard routing to prevent users from bypassing the landing page.
- Restored Top Navigation tools (Context, Present, AI Studio, Time Machine, Export) to the workspace shell.
- Re-added Engineering Canvas and interactive panels to the Center Workspace after they were temporarily masked by placeholders in A1.3.
- Fixed React strict mode resize loop in Developer Studio layout panels.
