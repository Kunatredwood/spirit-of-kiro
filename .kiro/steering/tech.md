# Technology Stack

## Runtime & Build System

- **Bun**: Primary JavaScript runtime and package manager for all components
- **Docker/Podman**: Container orchestration for local development
- **Vite**: Build tool and dev server for the client

## Frontend (client/)

- **Vue 3**: UI framework using Composition API
- **Pinia**: State management
- **TypeScript**: Type safety
- **Vitest**: Unit testing
- **ESLint + Prettier**: Code quality and formatting

## Backend (server/)

- **Bun**: Runtime for WebSocket server
- **ws**: WebSocket library
- **TypeScript**: Type safety

## Item Images Service (item-images/)

- **Bun**: Runtime for HTTP server
- **Sharp**: Image processing

## AWS Services

- **Amazon Bedrock**: AI/LLM integration
  - Amazon Nova Pro, Claude Sonnet 3.7, Claude Sonnet 4 (item generation, crafting, appraisal)
  - Amazon Titan Text Embeddings v2 (vector embeddings)
  - Amazon Nova Canvas (image generation)
- **DynamoDB**: State persistence (inventories, item metadata)
- **Amazon Cognito**: Authentication and authorization
- **MemoryDB**: Vector database for image matching
- **S3 + CloudFront**: Image storage and delivery

## Common Commands

### Development
```bash
# Launch full stack with hot reload
docker compose up --watch --remove-orphans --timeout 0 --force-recreate
# or
podman compose up --watch --remove-orphans --timeout 0 --force-recreate

# Root project
bun launch.ts

# Client only
cd client && bun run dev

# Server only
cd server && bun --watch server.ts

# Item images service
cd item-images && bun --watch server.ts
```

### Testing
```bash
# Server tests
cd server && bun test --bail

# Client tests
cd client && bun run test:unit
```

### Setup
```bash
# Check dependencies
./scripts/check-dependencies.sh

# Deploy Cognito
./scripts/deploy-cognito.sh game-auth

# Bootstrap DynamoDB tables
bun ./scripts/bootstrap-local-dynamodb.js
```

### Build
```bash
# Client production build
cd client && bun run build

# Type checking
cd client && bun run type-check

# Linting
cd client && bun run lint
```

## Package Management

Use `bun install` in three locations:
1. Project root
2. `client/` directory
3. `server/` directory
