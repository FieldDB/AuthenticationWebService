# AuthenticationWebService Testing Guide

## Architecture Overview

**Stack**: Express.js (v5) + CouchDB (v3.5.1) + Node.js (v25)

**Services**:
- **Auth App**: HTTPS server on port 3183
- **CouchDB**: HTTP on 5984, HTTPS on 6984
- **CouchDB Credentials**: `admin` / `none`

## Docker Setup

### Key Files
- `docker-compose.yml` - Orchestrates couchdb + app services
- `Dockerfile` - Builds the Node.js app container
- `Dockerfile-couchdb` - Builds CouchDB with custom config
- `config/default.js` - Default configuration with environment variable support
- `config/local.js` - Local overrides (takes precedence in `config` package)
- `config/localhost.js` - Localhost-specific config (NODE_ENV=localhost)

### Configuration Precedence

The `config` npm package loads files in this order:
1. `config/default.js` (base)
2. `config/{NODE_ENV}.js` (e.g., `localhost.js`)
3. `config/local.js` (**highest precedence**)

**Critical**: `config/local.js` overrides everything, including environment-specific configs. So if you have a `config/local.js` file, it will override the `config/localhost.js` file.

### Environment Variables

- `NODE_ENV=localhost` - Set in Dockerfile, determines which config file to load

## Running Tests

### Local Docker Testing

```bash
cd AuthenticationWebService

# Start services (rebuilds if needed)
docker compose up -d --build

# Run setup (creates test databases)
SOURCE_URL=https://public:none@corpusdev.example.org npm run setup

# Run E2E tests against Docker containers
npm run test:deprecated:e2e

# Stop services
docker compose down
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `test:docker` | Full Docker test suite (setup + e2e) |
| `test:docker:no-cache` | Same but forces rebuild without cache |
| `setup` | Initialize CouchDB databases for testing |
| `test:deprecated:e2e` | E2E tests for deprecated API routes |
| `test:deprecated:coverage` | Coverage report for deprecated routes |
| `start` | Start the auth service (non-Docker) |

### Test Suites

**`test/routes/deprecated-spec.js`** (39 tests):
- `/register` - User registration (8 tests)
- `/login` - Authentication (6 tests)
- `/changepassword` - Password changes (3 tests)
- `/forgotpassword` - Password reset (3 tests)
- `/addroletouser` - Role management (6 tests)
- `/updateroles` - Bulk role updates (2 tests)
- `/corpusteam` - Corpus team permissions (4 tests)
- `/newcorpus` - Corpus creation (4 tests)
- `/syncDetails` - User corpus sync (1 test)

**Test Environment**:
- Uses `replay` library for HTTP mocking (bloody mode = record/replay)
- Creates test users: `testuser1-9`, `testingdisabledusers`, `testingprototype`, etc.
- Tests against `https://localhost:3183` (app in Docker)
- CouchDB fixtures in `test/fixtures/`

## Common Issues & Solutions

### Issue: Tests fail with 500 errors (error codes 816, 1289)

**Root Cause**: App container can't connect to CouchDB service.

**Symptoms**:
```
"Server erred, please report this 816"
"Server is not responding for request to query corpus permissions. Please report this 1289"
```

**Solution**: Ensure `COUCHDB_URL=http://couchdb:5984` is set in `docker-compose.yml` and both `config/default.js` and `config/local.js` support `process.env.COUCHDB_URL`.

### Issue: Config changes not reflected in container

**Root Cause**: Docker uses cached image with old config files.

**Solution**: Rebuild with `--build` flag:
```bash
docker compose up -d --build
```

### Issue: `config/local.js` overrides Docker settings

**Root Cause**: `config/local.js` has highest precedence and hardcodes `localhost:5984`.

**Solution**: Update `config/local.js` to use environment variable:
```javascript
module.exports = { 
  usersDbConnection: { 
    url: process.env.COUCHDB_URL || "http://localhost:5984" 
  } 
};
```

## GitHub Actions CI

The `.github/workflows/node.js.yml` workflow runs:

1. **Integration tests** - Unit tests with mocked HTTP
2. **Deploy job**:
   - Creates `config/localhost.js` with `http://couchdb:5984`
   - Starts Docker Compose services
   - Runs setup to initialize databases
   - Runs E2E tests against containerized app
   - Switches to `http://localhost:5984` for local tests
   - Runs integration tests with app outside container
   - Runs UI tests with Playwright

**Key difference from local**: GitHub Actions creates `config/localhost.js` dynamically before building, ensuring correct CouchDB URL.

## Verification Commands

```bash
# Check config is correct inside container
docker compose exec app node -e "const config = require('config'); console.log(config.usersDbConnection);"

# Check environment variables
docker compose exec app printenv | grep COUCHDB

# View app logs
docker compose logs app --tail 50

# View CouchDB logs
docker compose logs couchdb --tail 50

# Check running containers
docker ps
```

## Test Data

**Sample Users** (from `config/default.js`):
- `public` - Public access
- `lingllama` / `teammatetiger` - Field linguist users
- `alakazou` / `valeriebilleentete` - Gamified users

**Test Corpora**:
- Created dynamically during tests
- Format: `{username}-{title_as_url}`
- Example: `testuser6-testing_v3_32_01`

## Success Criteria

✅ All 39 tests passing in ~5 minutes
✅ No 500 errors or "Server erred" messages
✅ App logs show: `Using corpus url: http://admin:none@couchdb:5984`
✅ Test output shows corpus creation and role management working
