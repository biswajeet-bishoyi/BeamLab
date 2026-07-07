# ADR-025: Engineering Report Agent (ERA) Architecture

## Status
Approved

## Context
BeamLab needs an Engineering Report Agent capable of generating professional, explainable, and traceable engineering documentation (Structural Analysis Reports, Design Reports, Optimization Reports, Compliance Reports). This agent must be fully decoupled from specific rendering formats (Markdown, PDF, HTML) and should trace every statement back to its originating evidence.

## Decision
We implemented a provider-driven, decoupled Report Agent architecture with the following layers:
1. **Living Report**: A continuously updatable entity that contains both the pure engineering data and the structural document elements.
2. **Report Model**: Represents pure engineering data.
3. **Template Engine**: Transforms the Report Model into a Document Model based on registered templates.
4. **Document Model**: A generic representation of the report structure (Blocks: Headings, Paragraphs, Tables, Images).
5. **Renderer Registry**: Pluggable architecture for rendering the Document Model into formats like Markdown, HTML, PDF, or JSON.

To guarantee traceability without tight coupling, the Report Agent does NOT query other agents directly. Instead:
- All engineering processes publish evidence to a centralized **Evidence Registry**.
- The `EvidenceCollector` pulls all evidence mapped to a report ID from the registry.
- A **Citation Graph** maps paragraphs and statements directly to `Evidence`, `Knowledge`, `Policy`, `Clause`, and `AnalysisResult` nodes.

Additionally, a comprehensive set of registries manages plugins:
- `TemplateRegistry`
- `RendererRegistry`
- `SectionRegistry` (allows companies to plug in custom report sections like "Executive Summary")
- `CitationRegistry`
- `ReviewRegistry`
- `ExportRegistry`

An **Engineering Audit Trail** maintains the full history of where every statement came from, bridging the gap between generated documentation and real engineering artifacts.

## Consequences
- **Pros**: 
  - Complete format independence. 
  - Highly extensible for future BIM integration, enterprise templates, and digital signatures.
  - Bulletproof traceability for regulatory and peer reviews.
- **Cons**: 
  - Requires stringent adherence to evidence publishing by all other engineering agents.
  - Adding a new format requires implementing a new Renderer.
