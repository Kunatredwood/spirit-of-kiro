# Project Structure

## Architecture

Three-tier client-server architecture:
```
Client (Vue.js) <--> Server (WebSocket) <--> Item Images Service (HTTP)
```

## Root Directory

- `launch.ts`: Development launcher script
- `docker-compose.yml`: Container orchestration for local development
- `.env`: AWS credentials and configuration (not committed)
- `dev.env`: Development environment variables

## Core Components

### `/client` - Game Client (Vue.js)
Frontend game engine with component-based architecture.

**Key directories:**
- `src/`: Vue application source
- `public/`: Static assets
- `iac/`: Infrastructure as code for deployment

**Systems architecture:**
- Socket System: WebSocket connection management
- Game Object System: Tracks all rendered game objects
- Physics System: Collision detection, movement, gravity
- Item System: Item properties and state
- Inventory System: Item storage and transfers
- Persona System: Player character management
- Preloader System: Asset loading

### `/server` - Game Server (WebSocket)
Real-time game state synchronization and AI integration.

**Key directories:**
- `handlers/`: WebSocket message handlers
- `state/`: State management logic
- `utils/`: Utility functions
- `llm/`: AI/LLM integration code
- `mocks/`: Mock data for testing
- `iac/`: Infrastructure as code (DynamoDB tables, etc.)
- `__tests__/`: Test files

**Key files:**
- `server.ts`: WebSocket server entry point
- `config.ts`: Server configuration
- `types.ts`: TypeScript type definitions

### `/item-images` - Item Images Service (HTTP)
Image generation and vector matching service.

**Key directories:**
- `handlers/`: HTTP request handlers
- `lib/`: Core library code
- `state/`: State management
- `scripts/`: Utility scripts
- `iac/`: Infrastructure as code

**Key files:**
- `server.ts`: HTTP server entry point
- `config.ts`: Service configuration

## Supporting Directories

### `/docs`
Comprehensive documentation:
- `architecture.md`: System architecture overview
- `local-setup.md`: Development setup instructions
- `remote-deploy.md`: AWS deployment guide
- `server-messages.md`: WebSocket message protocol
- `client-events.md`: Client event system
- `appsec-overview.md`: Security architecture
- `guiding-principles.md`: Design philosophy
- `CHALLENGE.md`: Sample tasks for learning
- `ROADMAP.md`: Future feature ideas

### `/scripts`
Automation and deployment scripts:
- `bootstrap-local-dynamodb.js`: Initialize local DynamoDB tables
- `check-dependencies.sh`: Verify required dependencies
- `deploy-cognito.sh`: Deploy Cognito resources
- `prod-deploy.sh`: Production deployment

### `/docker`
Docker-related files:
- `dynamodb/`: Local DynamoDB data persistence

## Configuration Files

- `.dockerignore`: Docker build exclusions
- `.gitignore`: Git exclusions
- `bun.lock`: Bun dependency lock file
- `package.json`: Root project dependencies
- Each component has its own `package.json`, `.dockerignore`, and `Dockerfile`

## Infrastructure as Code

Each component has an `iac/` directory containing CloudFormation templates and deployment configurations for AWS resources.

## Development Workflow

1. Work is typically done within one of the three main components
2. Changes to server or client trigger hot reload in Docker watch mode
3. Tests are component-specific (run within each component directory)
4. Infrastructure changes require redeployment of affected stacks
