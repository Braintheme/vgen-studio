SHELL := /bin/bash
.DEFAULT_GOAL := help

# Host ports etc. for messages; compose reads .env on its own.
-include .env

COMPOSE ?= docker compose
# Service used to run one-off tooling commands (pnpm, typeorm, tests).
TOOLS := api
# Default service for `logs`, `shell`; override with s=<service>.
s ?=

RUN_TOOLS := $(COMPOSE) run --rm --no-deps $(TOOLS)

##@ Lifecycle

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m [s=<service>] [name=<migration>]\n"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' $(MAKEFILE_LIST)

.env:
	cp .env.example .env
	@echo "Created .env from .env.example"

.PHONY: install
install: .env ## Install workspace dependencies (inside a container)
	$(RUN_TOOLS) pnpm install --no-frozen-lockfile

node_modules: .env
	@$(MAKE) --no-print-directory install

.PHONY: up
up: .env node_modules ## Start all services in the background
	$(COMPOSE) up -d
	@echo "Admin:   http://localhost:$(or $(ADMIN_HOST_PORT),5173)"
	@echo "API:     http://localhost:$(or $(API_HOST_PORT),3800)/api/v1"
	@echo "Swagger: http://localhost:$(or $(API_HOST_PORT),3800)/api/docs"
	@sh scripts/lan-urls.sh $(or $(ADMIN_HOST_PORT),5173)

.PHONY: url
url: ## Print the admin URLs for this machine and for other devices on the local network
	@echo "Admin:   http://localhost:$(or $(ADMIN_HOST_PORT),5173)"
	@sh scripts/lan-urls.sh $(or $(ADMIN_HOST_PORT),5173)

.PHONY: down
down: ## Stop all services
	$(COMPOSE) --profile '*' down

.PHONY: build
build: .env ## Build docker images
	$(COMPOSE) --profile '*' build

.PHONY: rebuild
rebuild: .env ## Rebuild images without cache and start
	$(COMPOSE) --profile '*' build --no-cache
	@$(MAKE) --no-print-directory up

.PHONY: restart
restart: ## Restart services (all, or s=<service>)
	$(COMPOSE) restart $(s)

.PHONY: logs
logs: ## Follow logs (all, or s=<service>)
	$(COMPOSE) logs -f --tail=200 $(s)

.PHONY: ps
ps: ## Show container status
	$(COMPOSE) --profile '*' ps

.PHONY: shell
shell: ## Open a shell in a running service: make shell s=api
	@test -n "$(s)" || (echo "Usage: make shell s=<service>" && exit 1)
	$(COMPOSE) exec $(s) bash || $(COMPOSE) exec $(s) sh

.PHONY: clear
clear: ## Stop everything and DELETE containers, volumes (DB, media) and build outputs
	@read -r -p "This deletes containers, volumes (database, media) and build outputs. Continue? [y/N] " ans; \
		[[ "$$ans" == "y" || "$$ans" == "Y" ]] || (echo "Aborted." && exit 1)
	$(COMPOSE) --profile '*' down -v --remove-orphans
	find apps packages -name node_modules -prune -o -type d \( -name dist -o -name .remotion-bundle \) -prune -exec rm -rf {} +
	@echo "Cleared. node_modules kept; run 'rm -rf node_modules' manually if needed."

##@ Database

.PHONY: migrate
migrate: ## Run pending migrations
	$(COMPOSE) run --rm $(TOOLS) pnpm --filter @vgen/db migration:run

.PHONY: migration-revert
migration-revert: ## Revert the last migration
	$(COMPOSE) run --rm $(TOOLS) pnpm --filter @vgen/db migration:revert

.PHONY: migration-generate
migration-generate: ## Generate a migration from entity changes: make migration-generate name=AddFoo
	@test -n "$(name)" || (echo "Usage: make migration-generate name=<Name>" && exit 1)
	$(COMPOSE) run --rm $(TOOLS) pnpm --filter @vgen/db migration:generate src/migrations/$(name)
	@echo "Now register the new class in packages/db/src/migrations/index.ts"

.PHONY: seed
seed: ## Seed default style presets and music (from ./seed)
	$(COMPOSE) run --rm $(TOOLS) pnpm --filter @vgen/api seed

##@ Development

.PHONY: fake-on
fake-on: ## Enable the fake dev-stub engine (its worker + the "Test card" template)
	DISABLED_ENGINES= $(COMPOSE) --profile fake up -d api worker-fake

.PHONY: fake-off
fake-off: ## Hide the fake dev-stub engine again (default)
	-$(COMPOSE) --profile fake stop worker-fake
	$(COMPOSE) up -d api

.PHONY: studio
studio: .env node_modules ## Start Remotion Studio (http://localhost:3801)
	$(COMPOSE) --profile studio up -d studio
	@echo "Studio: http://localhost:$(or $(STUDIO_HOST_PORT),3801)"

.PHONY: fixtures
fixtures: ## Prepare the before/after photo pair for Studio and demos (fixtures/)
	$(RUN_TOOLS) pnpm --filter @vgen/engine-remotion fixtures

.PHONY: demo
demo: ## Render demo videos into fixtures/renders: make demo args="--formats=9:16,16:9"
	$(COMPOSE) run --rm --no-deps worker-remotion pnpm --filter @vgen/engine-remotion demo $(args)

.PHONY: reference
reference: ## Analyze a reference video for template work: make reference file=references/<file>.mp4
	@test -n "$(file)" || (echo "Usage: make reference file=references/<file>.mp4" && exit 1)
	$(RUN_TOOLS) pnpm --filter @vgen/devtools reference --file="$(file)" $(args)

.PHONY: reference-compare
reference-compare: ## Compare a render with its reference: make reference-compare file=references/<slug>/<video>.mp4 render=<render>.mp4
	@test -n "$(file)" -a -n "$(render)" || (echo "Usage: make reference-compare file=<reference>.mp4 render=<render>.mp4" && exit 1)
	$(RUN_TOOLS) pnpm --filter @vgen/devtools reference-compare --file="$(file)" --render="$(render)" $(args)

.PHONY: render
render: ## Render via queue + worker without the API: make render args="--media=before:fixtures/before.jpg --media=after:fixtures/after.jpg"
	$(COMPOSE) run --rm api pnpm --filter @vgen/devtools render $(args)

.PHONY: test
test: ## Run unit tests
	$(RUN_TOOLS) pnpm test

.PHONY: test-e2e
test-e2e: ## End-to-end smoke on the running stack (make up first): upload, render, ffprobe checks
	$(COMPOSE) exec -T $(TOOLS) pnpm --filter @vgen/devtools e2e

.PHONY: check-jitter
check-jitter: ## Render check: slowly moving overlays must not snap to the pixel grid (run after Remotion/Chromium upgrades)
	$(COMPOSE) run --rm --no-deps worker-remotion pnpm --filter @vgen/engine-remotion check-jitter $(args)

.PHONY: lint
lint: ## Run ESLint, Prettier check and type checks
	$(RUN_TOOLS) bash -c "pnpm lint && pnpm typecheck"

.PHONY: format
format: ## Auto-fix lint and formatting issues
	$(RUN_TOOLS) pnpm lint:fix

.PHONY: check
check: .env node_modules ## ALL checks (required before and after upgrading dependencies): lint, test, check-jitter, test-e2e
	@echo "==> 1/4 lint (catalog, ESLint, Prettier, types)"
	@$(MAKE) --no-print-directory lint
	@echo "==> 2/4 unit tests"
	@$(MAKE) --no-print-directory test
	@echo "==> 3/4 render smoothness (check-jitter)"
	@$(MAKE) --no-print-directory check-jitter
	@echo "==> 4/4 end-to-end smoke (starts the stack if needed and waits until it is healthy)"
	$(COMPOSE) up -d --wait --wait-timeout 300
	@$(MAKE) --no-print-directory test-e2e
	@echo "==> All checks passed."

##@ Production images

PROD_COMPOSE := $(COMPOSE) -f docker-compose.prod.yml

.PHONY: prod-build
prod-build: .env ## Build production images (api, worker-remotion, admin)
	$(PROD_COMPOSE) build

.PHONY: prod-up
prod-up: .env ## Start the production stack (http://localhost:8080 by default)
	$(PROD_COMPOSE) up -d
	@echo "Admin + API: http://localhost:$(or $(PROD_HOST_PORT),8080)"

.PHONY: prod-down
prod-down: ## Stop the production stack (data volumes are kept)
	$(PROD_COMPOSE) down

.PHONY: prod-logs
prod-logs: ## Follow production logs (all, or s=<service>)
	$(PROD_COMPOSE) logs -f --tail=200 $(s)

.PHONY: prod-seed
prod-seed: ## Seed the production stack (default presets, music from ./seed)
	$(PROD_COMPOSE) run --rm api node dist/cli/seed.js
