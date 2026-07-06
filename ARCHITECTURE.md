# BeamLab Architecture

BeamLab is architected as a robust pnpm workspace monorepo managed by TurboRepo.

## High-Level Components

### Apps

1. **Web (`apps/web`)**: 
   The main user interface built with React. It communicates primarily with the API Gateway.
   
2. **API Gateway (`apps/api-gateway`)**:
   An Express server that handles incoming HTTP requests, performs authentication, validates schemas using Zod, and routes traffic to internal microservices or handles business logic directly.

### Packages (Shared Libraries)

- **`@beamlab/types`**: Global TypeScript interfaces (DTOs, domain models).
- **`@beamlab/validation`**: Zod schemas used by the gateway to strictly validate all incoming data.
- **`@beamlab/utils`**: Pure helper functions, error classes, and the global Pino logger instance.
- **`@beamlab/events`**: Standardized definitions for event-driven architecture payloads.

## Dependency Flow

`apps/web` --> `apps/api-gateway`
`apps/api-gateway` --> `@beamlab/validation`, `@beamlab/utils`, `@beamlab/types`
`packages/*` --> `@beamlab/types`, `@beamlab/utils`

## CI/CD Pipeline

- **GitHub Actions**: Lint, typecheck, test, and build on every Pull Request.
- **Changesets**: Automates versioning and changelog generation upon merging to main.
- **Docker**: The API Gateway is containerized using a multi-stage Dockerfile that leverages `turbo prune` to build minimal, secure production images.
