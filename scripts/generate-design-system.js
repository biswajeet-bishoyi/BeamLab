const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DESIGN_DIR = path.join(ROOT_DIR, 'docs', 'design');

if (!fs.existsSync(DESIGN_DIR)) {
  fs.mkdirSync(DESIGN_DIR, { recursive: true });
  console.log('Created directory: ' + DESIGN_DIR);
}

const FILES = {
  'BeamLab-Design-System.md': [
    '# BeamLab Design System',
    '',
    '## The Philosophy',
    'BeamLab is not a traditional web app; it is a desktop-class engineering OS running in the browser.',
    'It must feel as premium, responsive, and deterministic as Raycast or Linear, while serving the deep technical complexity of AutoCAD, Revit, and SAP2000.',
    '',
    '## Core Tenets',
    '- **Zero-Clutter**: UI elements must recede until needed.',
    '- **Engineering-First**: Data density is prioritized over whitespace, but controlled through typography.',
    '- **AI-Native, Not Chat-Native**: Archie is embedded into the context of the workspace, not just a chat sidebar.',
    '- **Deterministic**: Every action, even AI-generated, results in a strictly typed Execution Plan.'
  ].join('\n'),

  'BeamLab-UX-Principles.md': [
    '# BeamLab UX Principles',
    '',
    '## Inspiration & Research Extraction',
    '- **Linear**: Relentless focus on speed, keyboard-first navigation, and zero friction. We adopt their Command Palette architecture.',
    '- **Cursor**: Context-aware AI. We adopt their "diff-first" review and localized inline editing.',
    '- **ETABS / SAP2000**: High data density and specialized right-click context menus. We adopt their rigorous engineering data structures but shed their outdated visual noise.',
    '- **Figma**: Multiplayer cursor presence and infinite canvas performance. We adopt their property-panel layout.',
    '',
    '## Keyboard First',
    'Every major action must be accessible via the Command Palette (\`Cmd/Ctrl + K\`).'
  ].join('\n'),

  'BeamLab-Color-System.md': [
    '# BeamLab Color System',
    '',
    '## Semantic Palette',
    '- **Background**: Deep, calm darks (e.g., `#0C0C0C` for Dark Mode) to reduce eye strain during long engineering sessions.',
    '- **Surface**: Slightly elevated panels (`#1A1A1A`).',
    '- **Accent**: Electric Blue (`#2563EB`) representing execution, intelligence, and focus.',
    '- **Status Colors**: strictly mapped to structural engineering states (e.g., Yielding, Failed, Optimal, Pending).',
    '',
    '## Theme Architecture',
    'Tokens are mapped via CSS Variables. Initial sprint focuses strictly on a premium Dark Theme, expanding to Light Theme later.'
  ].join('\n'),

  'BeamLab-Typography.md': [
    '# Typography System',
    '',
    '## Typefaces',
    '- **Primary Interface**: Inter (Clean, highly legible at small sizes).',
    '- **Monospace / Code / Data**: JetBrains Mono or Geist Mono (Clear distinction of digits and decimals for engineering math).',
    '',
    '## Scale',
    'Emphasis on structural hierarchy. Section titles must be crisp; data tables must use tabular figures (`font-variant-numeric: tabular-nums`) to align decimal points.'
  ].join('\n'),

  'BeamLab-Spacing-System.md': [
    '# Spacing System',
    '',
    'Based on a strict 4px grid system.',
    '- `2px`: Micro-adjustments (borders, inline tags)',
    '- `4px`: Component internal spacing',
    '- `8px`: Standard element spacing',
    '- `16px`: Component grouping',
    '- `24px`: Section breaks'
  ].join('\n'),

  'BeamLab-Motion-System.md': [
    '# Motion System',
    '',
    'Motion must feel **subtle, fast, and explainable**.',
    '- **Durations**: No transition longer than 200ms.',
    '- **Easing**: Crisp, snappy easing curves (`cubic-bezier(0.2, 0.8, 0.2, 1)`).',
    '- **Archie Intelligence**: When the Planning Engine is working, utilize subtle, glowing skeletal loaders, NOT generic spinning circles.',
    '- **Execution Graph**: Nodes pulse gently when executing, snapping to solid green/red immediately upon completion.'
  ].join('\n'),

  'BeamLab-Accessibility.md': [
    '# Accessibility Guidelines',
    '',
    '- **Contrast**: Minimum AA contrast ratio for all structural data.',
    '- **Keyboard**: 100% navigability via Tab and Arrow keys.',
    '- **Reduced Motion**: Respect `prefers-reduced-motion` CSS media query.',
    '- **Screen Readers**: ARIA labels on all custom engineering canvas/graph elements.'
  ].join('\n'),

  'BeamLab-Interaction-Patterns.md': [
    '# Interaction Patterns',
    '',
    '## Selection',
    'Clicking a node in the Execution Graph populates the Context Panel.',
    '',
    '## Approvals',
    'High-risk AI Execution Plans halt and present a "Diff-style" Approval Dialog before mutating the model.',
    '',
    '## Streaming',
    'AI streaming responses must map directly to structured UI components (e.g., streaming a list of materials as actual UI cards, not raw markdown text).'
  ].join('\n'),

  'BeamLab-Layout-System.md': [
    '# BeamLab Layout System',
    '',
    'The permanent 4-pane desktop layout:',
    '',
    '```mermaid',
    'graph TD',
    '    TopNav[Top Navigation Bar]',
    '    LeftSidebar[Left Project Explorer]',
    '    CenterWorkspace[Center Engineering Workspace]',
    '    RightWorkspace[Right Archie Workspace]',
    '    BottomBar[Bottom Status Bar]',
    '',
    '    TopNav --- LeftSidebar',
    '    TopNav --- CenterWorkspace',
    '    TopNav --- RightWorkspace',
    '    LeftSidebar --- BottomBar',
    '    CenterWorkspace --- BottomBar',
    '    RightWorkspace --- BottomBar',
    '```',
    '',
    '- **Top Nav**: Global search, command palette trigger, workspace context.',
    '- **Left Explorer**: File tree, structure hierarchy, model components.',
    '- **Center Workspace**: Infinite canvas, 3D viewer, or code editor.',
    '- **Right Archie Workspace**: The intelligence panel.',
    '- **Bottom Status Bar**: System health, queue depth, metrics, diagnostics.'
  ].join('\n'),

  'Archie-Workspace.md': [
    '# Archie Workspace Architecture',
    '',
    'Archie is NOT a chatbot. It is a contextual engineering assistant.',
    '',
    '## Tabs',
    '1. **Chat**: Free-form reasoning and inquiry.',
    '2. **Plan**: Visual representation of the current immutable `ExecutionPlan`.',
    '3. **Execution**: Live DAG visualization of the `ExecutionGraph` running through the `TaskScheduler`.',
    '4. **Context**: Explains exactly what data Archie is currently seeing.',
    '5. **History**: Immutable audit log of all decisions.'
  ].join('\n'),

  'BeamLab-Design-Tokens.md': [
    '# Design Tokens',
    '',
    '## Colors (CSS Variables)',
    '- `--bg-app`: `#0C0C0C`',
    '- `--bg-panel`: `#1A1A1A`',
    '- `--border-subtle`: `#2A2A2A`',
    '- `--text-primary`: `#EDEDED`',
    '- `--text-muted`: `#888888`',
    '- `--accent-primary`: `#2563EB`'
  ].join('\n'),

  'BeamLab-Iconography.md': [
    '# Iconography',
    '',
    'Use **Lucide React**. Stroke width strictly set to `1.5px` for a crisp, technical look. Size restricted to `16px` for inline, `24px` for prominent actions.'
  ].join('\n'),

  'BeamLab-Illustration-Guidelines.md': [
    '# Illustration Guidelines',
    '',
    'No cartoonish illustrations. Use technical schematics, isometric grids, and wireframe representations for empty states.'
  ].join('\n'),

  'BeamLab-Empty-States.md': [
    '# Empty States',
    '',
    'Empty states must be **actionable**.',
    'Example: An empty Execution Graph should show a subtle grid background and a primary button: "Generate Plan with Archie" or "Draft Graph Manually".'
  ].join('\n'),

  'BeamLab-Loading-States.md': [
    '# Loading States',
    '',
    'Prefer skeletal loading over spinners. When the AI is generating a structural plan, pulse the corresponding components gently. Show exact metrics (e.g., "Queue insertion: 1.2ms") in the status bar.'
  ].join('\n'),

  'BeamLab-Error-States.md': [
    '# Error States',
    '',
    'Errors must be strictly typed. Red borders (`#EF4444`). Include an explicit "Revert" or "Explain Error" button for Archie to diagnose.'
  ].join('\n'),

  'BeamLab-Responsive-Guidelines.md': [
    '# Responsive Guidelines',
    '',
    'BeamLab is a desktop-first application. Mobile layouts gracefully degrade by collapsing the Left Explorer and Right Archie Workspace into slide-over panels.'
  ].join('\n'),

  'Component-Library.md': [
    '# Component Library',
    '',
    '## Standard UI Elements',
    '- **Command Palette**: Centralized keyboard-driven execution.',
    '- **Execution Graph Viewer**: React Flow-based DAG renderer with strict status color coding.',
    '- **Markdown Renderer**: For Archie\'s responses, strictly supporting LaTeX math formulas for engineering equations.'
  ].join('\n'),

  'Engineering-Components.md': [
    '# Engineering Components',
    '',
    'Custom semantic cards for Structural Engineering:',
    '- **Beam Card**: Visualizes I-beam cross sections with stress highlights.',
    '- **Load Card**: Displays point/distributed loads with magnitude badges.',
    '- **Material Card**: Density, Yield Strength, and Young\'s Modulus in tabular-nums.',
    '- **Code Compliance Card**: strictly shows Pass (Green) or Fail (Red) against specific building codes (e.g., AISC 360-16).'
  ].join('\n')
};

async function generateDesignDocs() {
  console.log('Generating BeamLab Design System Foundation...');

  for (const [filename, content] of Object.entries(FILES)) {
    const fullPath = path.join(DESIGN_DIR, filename);
    fs.writeFileSync(fullPath, content.trim() + '\\n');
    console.log('Created: ' + filename);
  }
  
  console.log('Sprint A1.1 Design System Generated Successfully!');
}

generateDesignDocs();
