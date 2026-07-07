const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

const DIRS = [
  'engineering',
  'architecture',
  'vision',
  'guides',
  'api',
  'adr',
  'rfc',
  '../.github/ISSUE_TEMPLATE'
];

const FILES = {
  // === ENGINEERING ===
  'engineering/BeamLab-Engineering-Standards.md': `# BeamLab Engineering Standards

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
`,

  'engineering/BeamLab-Code-Style.md': `# BeamLab Code Style
- **TypeScript Strict Mode**: Mandatory across all packages.
- **No Implicit Any**: Types must be strictly defined.
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
`,

  'engineering/BeamLab-Architecture-Rules.md': `# BeamLab Architecture Rules
- Use Dependency Injection.
- Maintain backward compatibility of public APIs.
- No circular dependencies between workspaces.
`,

  'engineering/BeamLab-Performance-Standards.md': `# BeamLab Performance Standards
- Queue insertion: < 5 ms
- Graph scheduling: < 10 ms
- Node scheduling: < 2 ms
- Support 100,000+ graph nodes without Event Loop blocking.
`,

  'engineering/BeamLab-Security-Standards.md': `# BeamLab Security Standards
- No queue poisoning (Max 500k nodes per graph).
- All tools must be validated against the Tool Registry IAM boundaries.
`,

  'engineering/BeamLab-Testing-Standards.md': `# BeamLab Testing Standards
- Unit tests required for all core engines (Vitest).
- Performance budget tests required for Task Scheduler.
- 80%+ coverage baseline.
`,

  'engineering/BeamLab-Documentation-Standards.md': `# BeamLab Documentation Standards
- Architecture changes require an ADR.
- Major features require an RFC.
- All code requires JSDoc comments for public APIs.
`,

  'engineering/BeamLab-AI-Standards.md': `# BeamLab AI Standards
- The kernel owns intelligence.
- Agents are stateless.
- Strategy planners must generate immutable Execution Plans.
`,

  'engineering/BeamLab-Design-Principles.md': `# BeamLab Design Principles
- BeamLab is an Engineering OS.
- UX must be responsive, real-time, and strictly typed.
`,

  'engineering/BeamLab-Glossary.md': `# BeamLab Glossary
- **Archie**: The overarching AI intelligence.
- **Kernel**: The Runtime OS for Archie.
- **Runtime Gateway**: Handles streaming external I/O.
- **Planning Engine**: Determines *What* should happen (Immutable Plans).
- **Execution Graph Engine**: Determines *How* tasks connect (DAGs).
- **Scheduler**: Determines *When* tasks run (Orchestration).
`,

  'engineering/BeamLab-Coding-Playbook.md': `# Coding Playbook
1. Read the Architecture docs.
2. Read the ADRs.
3. Plan via Implementation Plan.
4. Execute via strict TDD constraints.
`,

  'engineering/Architecture-Governance.md': `# Architecture Governance
The Chief Architect / CTO must review all new ADRs. Architecture is stable and extended via Plugins, not rewrites.
`,
  'engineering/Performance-Governance.md': `# Performance Governance
Mandatory benchmarking on every CI/CD run for the Task Scheduler.
`,
  'engineering/Security-Governance.md': `# Security Governance
Strict dependency scanning, Dependabot enforced, no arbitrary execution contexts without sandboxing.
`,
  'engineering/Engineering-Dashboard.md': `# Engineering Dashboard
(To be populated with Grafana/Prometheus metrics endpoints)
`,

  // === ARCHITECTURE ===
  'architecture/System-Overview.md': `# System Overview
BeamLab is the interactive structural engineering workspace. 
**Core Components**:
- Web Client (Vite/React)
- API Gateway (Express)
- Archie Kernel (Core OS)
- Planning Engine -> Execution Graph Engine -> Task Scheduler
`,

  'architecture/Package-Architecture.md': `# Package Architecture
\`\`\`mermaid
graph TD
    Kernel[archie-kernel]
    Plan[planning-engine]
    Graph[execution-graph]
    Sched[task-scheduler]
    Reg[tool-registry]
    Ctx[context-engine]
    
    Kernel --> Plan
    Kernel --> Graph
    Kernel --> Sched
    Kernel --> Reg
    Kernel --> Ctx
\`\`\`
`,
  'architecture/Runtime-Architecture.md': `# Runtime Architecture
The Runtime OS initializes all sub-engines. It exposes a \`RuntimeManager\` handling graceful startups, shutdowns, and Health Registry tracking.
`,
  'architecture/Kernel-Architecture.md': `# Archie Kernel
The central nervous system. It does not execute logic; it orchestrates the Planner, Graph Builder, and Scheduler.
`,
  'architecture/Execution-Architecture.md': `# Execution Architecture
\`\`\`mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant Kernel
    participant Planner
    participant GraphEngine
    participant Scheduler
    
    User->>Gateway: Request
    Gateway->>Kernel: Process Request
    Kernel->>Planner: Generate Plan
    Planner-->>Kernel: Immutable ExecutionPlan
    Kernel->>GraphEngine: Build Graph
    GraphEngine-->>Kernel: Immutable ExecutionGraph (DAG)
    Kernel->>Scheduler: Enqueue Graph
    Scheduler-->>Kernel: Scheduling Accepted
    Scheduler->>Scheduler: Execute DAG asynchronously
\`\`\`
`,
  'architecture/AI-Architecture.md': `# AI Architecture
Intelligence resides in the Planning Engine (Intent Classifiers, Rule Planners, Strategy Planners) and standalone specialized Agents.
`,
  'architecture/Deployment-Architecture.md': `# Deployment Architecture
Dockerized microservices. Node.js backend. Postgres DB. Redis cache.
`,
  'architecture/Infrastructure-Architecture.md': `# Infrastructure
Cloud-agnostic. Currently supports Docker Compose for local environments.
`,
  'architecture/Plugin-SDK.md': `# Plugin SDK
Future API for extending BeamLab without forking the Kernel.
`,
  'architecture/Data-Flow.md': `# Data Flow
User -> Gateway -> Kernel -> Engine -> Storage
`,
  'architecture/Event-Flow.md': `# Event Flow
Events emitted by Task Scheduler:
- SchedulerStarted, GraphQueued, NodeStarted, GraphCompleted.
`,

  // === VISION ===
  'vision/BeamLab-Masterplan.md': `# BeamLab Masterplan
Phase 1: Foundation (OS Core)
Phase 2: Intelligence (Planning & Execution)
Phase 3: Autonomy (Multi-Agent Workflows)
`,
  'vision/Product-Vision.md': `# Product Vision
To be the de facto standard for structural engineering AI workflows.
`,
  'vision/Engineering-Vision.md': `# Engineering Vision
A zero-downtime, sub-10ms latency OS that scales infinitely.
`,
  'vision/Archie-Vision.md': `# Archie Vision
Archie is not a chatbot. Archie is a junior engineer working alongside you.
`,
  'vision/Enterprise-Roadmap.md': `# Enterprise Roadmap
RBAC, SSO, Audit Logs, Kubernetes distributed scheduling.
`,
  'vision/Research-Roadmap.md': `# Research Roadmap
Generative structural design, autonomous code compliance verification.
`,
  'vision/Multi-Agent-Architecture.md': `# Multi-Agent Architecture
Agents communicate via standard Execution Graphs and shared Context memory.
`,

  // === GUIDES ===
  'guides/Development-Workflow.md': `# Development Workflow
1. Branch from \`main\`
2. Write tests
3. Implement
4. Open PR
`,
  'guides/Contribution-Guide.md': `# Contribution Guide
Follow the standard fork & pull model. Adhere to Engineering Standards.
`,
  'guides/Documentation-Guide.md': `# Documentation Guide
Markdown exclusively. Mermaid for diagrams.
`,
  'guides/Release-Process.md': `# Release Process
Semantic versioning. Handled via CI/CD pipelines.
`,
  'guides/Branching-Strategy.md': `# Branching Strategy
Trunk-based development with feature branches.
`,
  'guides/Architecture-Review-Guide.md': `# Architecture Review Guide
All PRs modifying core Kernel logic require 2 approvals from Staff Engineers.
`,
  'guides/Performance-Review-Guide.md': `# Performance Review Guide
Ensure Scheduler remains under 10ms budget.
`,
  'guides/Security-Review-Guide.md': `# Security Review Guide
Validate all inputs. Reject malformed graphs.
`,
  'guides/Prompt-Engineering-Guide.md': `# Prompt Engineering Guide
Prompts must be deterministically wrapped using JSON schemas.
`,

  // === API ===
  'api/API-Design-Guide.md': `# API Design Guide
RESTful principles for the Gateway. RPC/Events internally.
`,
  'api/Event-Contracts.md': `# Event Contracts
Documenting standard payloads for \`GraphQueued\`, \`NodeStarted\`, etc.
`,
  'api/Public-Interfaces.md': `# Public Interfaces
\`IArchieKernel\`, \`IPlanner\`, \`ExecutionPlan\`, \`ExecutionGraph\`.
`,
  'api/Versioning-Policy.md': `# Versioning Policy
SemVer. No breaking changes without a major version bump.
`,

  // === ADR & RFC ===
  'adr/README.md': `# Architecture Decision Records
Log of all permanent architecture decisions.
`,
  'adr/ADR-TEMPLATE.md': `# ADR Template
## Context
## Decision
## Consequences
`,
  'rfc/README.md': `# Request For Comments
Proposals for major changes.
`,
  'rfc/RFC-TEMPLATE.md': `# RFC Template
## Summary
## Motivation
## Detailed Design
## Drawbacks
`,

  // === GITHUB ===
  '../.github/ISSUE_TEMPLATE/bug_report.md': `---
name: Bug report
about: Create a report to help us improve
---
**Describe the bug**
`,
  '../.github/ISSUE_TEMPLATE/feature_request.md': `---
name: Feature request
about: Suggest an idea for this project
---
**Is your feature request related to a problem?**
`,
  '../.github/ISSUE_TEMPLATE/architecture_proposal.md': `---
name: Architecture Proposal
about: Propose a major change requiring an ADR
---
**Context**
`,
  '../.github/PULL_REQUEST_TEMPLATE.md': `## Description
## Checklist
- [ ] Tests passed
- [ ] Documentation updated
- [ ] Meets Performance Budgets
`,
  '../.github/DISCUSSION_TEMPLATE.md': `## Discussion
`,
  '../.github/dependabot.yml': `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
`,

  // === REPOSITORY ===
  '../CONTRIBUTING.md': `# Contributing to BeamLab
See docs/guides/Contribution-Guide.md
`,
  '../CODE_OF_CONDUCT.md': `# Code of Conduct
Please adhere to standard OSS community guidelines.
`,
  '../SECURITY.md': `# Security Policy
Report vulnerabilities privately to security@beamlab.io.
`,
  '../SUPPORT.md': `# Support
Open an issue on GitHub.
`,
  '../GOVERNANCE.md': `# Governance
Project is maintained by the Core Architecture Team.
`,
  '../CODEOWNERS': `* @biswajeet-bishoyi
`
};

// Execute
async function generateDocs() {
  console.log('Generating BeamLab Engineering Constitution...');

  for (const dir of DIRS) {
    const fullPath = path.join(DOCS_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log('Created directory: ' + fullPath);
    }
  }

  for (const [relativePath, content] of Object.entries(FILES)) {
    const fullPath = path.join(DOCS_DIR, relativePath);
    // Overwrite safely
    fs.writeFileSync(fullPath, content.trim() + '\n');
    console.log('Created file: ' + relativePath);
  }
  
  console.log('Generation complete!');
}

generateDocs();
