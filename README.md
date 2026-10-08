# 🏗️ BeamLab — Interactive Structural Engineering & Analysis Studio

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Turborepo](https://img.shields.io/badge/Monorepo-Turborepo-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express.js-black?logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**A high-performance, web-native structural analysis workspace designed for civil & structural engineers, educators, and students.**

[Report Bug](https://github.com/biswajeet-bishoyi/BeamLab/issues) • [Request Feature](https://github.com/biswajeet-bishoyi/BeamLab/issues)

</div>

---

## 🌟 Overview

**BeamLab** is an interactive, browser-based structural engineering calculation engine and analysis workspace. It bridges theoretical structural mechanics with modern web technologies, providing instant calculation of reactions, dynamic Shear Force Diagrams (SFD), Bending Moment Diagrams (BMD), and slope-deflection curves under arbitrary loading conditions.

Built as an enterprise-grade monorepo powered by Turborepo and pnpm workspaces, BeamLab features a modular decoupled architecture: an ultra-responsive client application, a resilient API gateway with strict Zod schema validation, and dedicated computation packages.

---

## 🚀 Key Features

- **⚡ Real-Time Structural Solvers**: Instant calculation of support reactions, internal shear, and bending moments for simply supported, cantilever, propped cantilever, and continuous multi-span beams.
- **📊 Dynamic Vector Diagramming**: Interactive high-resolution SVG/Canvas SFD and BMD visualizations with peak value markers, inflection points, and zero-crossings.
- **🔄 Flexible Load Combinations**: Superposition support for concentrated point loads, uniformly distributed loads (UDL), triangular/trapezoidal loads, and concentrated moments.
- **🛡️ Strict Schema Validation**: End-to-end type safety and boundary verification via Zod across API and domain packages.
- **🐳 Containerized Microservices**: Multi-stage Docker deployment for API gateway with automated pruning and production optimization.

---

## 🏛️ System Architecture

BeamLab is organized as a Turborepo monorepo:

```
BeamLab/
├── apps/
│   ├── web/                     # React (Vite) UI with real-time vector canvas
│   └── api-gateway/             # Express.js API gateway, authentication & telemetry
├── packages/
│   ├── @beamstudio/types        # Global DTOs and domain interfaces
│   ├── @beamstudio/validation   # Zod validation schemas
│   ├── @beamstudio/utils        # Helper routines, error handling & Pino logger
│   └── @beamstudio/events       # Standardized event bus payloads
└── docker-compose.yml           # Local orchestration (Postgres, Redis, Gateway)
```

---

## 🛠️ Quick Start

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose (optional, for database & gateway services)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/biswajeet-bishoyi/BeamLab.git
   cd BeamLab
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Spin up local infrastructure (Postgres & Redis):**
   ```bash
   docker-compose up -d
   ```

4. **Start the development server:**
   ```bash
   pnpm dev
   ```

The web application will launch at `http://localhost:5173` and the API Gateway at `http://localhost:4000`.

---

## 🧪 Testing & Quality Assurance

```bash
# Run linting across all packages
pnpm lint

# Run TypeScript typechecks
pnpm typecheck

# Run test suites
pnpm test
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Developed with ❤️ by <a href="https://github.com/biswajeet-bishoyi">Biswajeet Bishoyi</a>
</div>
