# ADR 015: Engineering Knowledge Platform (EKP)

## Status
Accepted

## Context
BeamLab needs a robust, long-term memory system to serve as Archie's engineering brain. Unlike the `Engineering Context Engine` which focuses on volatile workspace state (what the user is currently doing), the Engineering Knowledge Platform (EKP) manages permanent, structured engineering principles, design codes, material properties, and best practices.

It was necessary to establish this architecture decoupled from the UI and Runtime so that any feature (Report Generation, Archie Queries, Code Checks) can retrieve and reason about engineering knowledge consistently.

## Decision
We have established two packages to form the EKP:
- `@beamlab/knowledge-platform`: The core engine, registry, cache, and provider abstractions.
- `@beamlab/knowledge-client`: A typed transport layer for consumers (like Archie and the UI) to query the EKP.

### 1. IKnowledgeRetrievalEngine over ISearchEngine
Retrieval is broader than search. We implemented `IKnowledgeRetrievalEngine` to explicitly support future capabilities such as Vector Search (RAG), Graph Traversal, and Agentic Retrieval. The first implementation is an in-memory `KeywordRetrievalEngine`.

### 2. Explainable Retrieval
Every retrieval result returns:
- `item`: The matched knowledge.
- `relatedKnowledge`: The immediate graph neighbors (derived from `KnowledgeRelationship`).
- `rationale`: Why this item was returned.
- `confidence`: Confidence score (0.0 to 1.0).
- `version`: Version metadata.
- `source`: Origin of the knowledge.

This is critical for AI explainability. Archie must always cite its sources.

### 3. Knowledge Relationships
Knowledge items are not isolated. We implemented `KnowledgeRelationship` with strongly typed edges (`Depends On`, `Uses`, `Checked By`, `Defined In`, etc.). This graph architecture allows the retrieval engine to pull in prerequisite and related knowledge, providing Archie with a broader context.

### 4. Provider Agnostic
Knowledge is ingested through `IKnowledgeProvider`. Currently, we implemented `StaticProvider` containing the BeamLab Core Knowledge Pack v0.1. Future providers can be `MarkdownProvider` or `PostgresProvider`.

## Consequences
- **Positive**: We now have a central nervous system for engineering facts.
- **Positive**: Future implementation of Vector Search (RAG) requires zero changes to the client or the knowledge model; we only need to implement a new `IKnowledgeRetrievalEngine`.
- **Negative**: Manual curation of the Knowledge Graph can be tedious without an automated LLM extraction pipeline, which must be built later to populate the platform at scale.
