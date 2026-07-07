# ADR 007: Execution Graph Architecture

## Context
As Archie processes user requests, the Planning Engine outputs an immutable `ExecutionPlan` detailing what tasks need to occur. However, the system must translate this sequential plan into a robust execution sequence capable of handling future complexities like parallel execution, loops, conditionals, and human-in-the-loop approval gates.

## Decision
We decided to implement the **Execution Graph Engine (EGE)**, which transforms an `ExecutionPlan` into a strongly typed Directed Acyclic Graph (DAG) before execution. 

1. **Strict Separation of Concerns**: 
   - Planning Engine answers "What should happen?"
   - Execution Graph Engine answers "How are tasks connected?"
   - Scheduler (future) answers "When should tasks run?"
2. **DAGs**: Graph nodes representing executions, tool calls, and conditions natively support complex dependency mapping, making topological sorting and parallel execution explicit and straightforward.
3. **Immutability**: The `ExecutionGraph` is an immutable snapshot preventing runtime mutation.
4. **Validation and DFS Cycle Detection**: Before scheduling, we mandate graph validation through DFS, guaranteeing cycle-free executions.

## Consequences
- **Pros**: Readily supports future parallel execution and distributed architecture; highly deterministic dependency resolution.
- **Cons**: Adds an intermediary transformation layer (Plan -> Graph -> Scheduler) introducing minor latency.

## Future Milestones
- **Graph Optimizer**: Implement optimization plugins to automatically parallelize independent nodes or prune redundant steps.
- **Distributed Execution**: The serializable nature of the `ExecutionGraph` allows distributing sub-graphs across worker nodes.
