# BeamLab

BeamLab is an interactive structural engineering workspace built for the web.

## Quickstart

### Prerequisites
- Node.js >= 18
- pnpm >= 8

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the local development environment (spins up Postgres & Redis):
   ```bash
   docker-compose up -d
   ```

3. Run the development server (Frontend and API Gateway):
   ```bash
   pnpm dev
   ```

## Workspaces
- `apps/web`: The React (Vite) frontend application.
- `apps/api-gateway`: The Express routing layer and entry point.
- `packages/*`: Shared utilities, types, and configurations.

See `CONTRIBUTING.md` for guidelines on how to contribute, and `ARCHITECTURE.md` for a technical overview.
