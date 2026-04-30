# Onyx private deployment Makefile
#
# Drives the docker-compose stack composed of:
#   deployment/docker_compose/docker-compose.yml
#   deployment/docker_compose/docker-compose.private.override.yml
#
# Run `make help` for a listing of available targets.

# ----- Variables -----

COMPOSE_FILE      := deployment/docker_compose/docker-compose.yml
COMPOSE_OVERRIDE  := deployment/docker_compose/docker-compose.private.override.yml
ENV_FILE          := deployment/docker_compose/.env
ENV_EXAMPLE       := deployment/docker_compose/.env.private.example

COMPOSE := docker compose -f $(COMPOSE_FILE) -f $(COMPOSE_OVERRIDE) --env-file $(ENV_FILE)

# Subset of services brought up via `make dev-deps` to support local dev mode.
DEV_DEPS_SERVICES := relational_db cache index minio searxng

.DEFAULT_GOAL := help

.PHONY: help init \
        up build pull \
        logs logs-api logs-celery logs-web logs-search ps down stop restart restart-celery \
        shell-api shell-db migrate clean clean-all \
        dev-deps dev-api dev-celery dev-web dev-down

# ----- Help -----

help: ## Show this help listing
	@awk 'BEGIN { FS = ":.*## "; printf "Usage: make <target>\n\nTargets:\n" } \
	     /^[a-zA-Z0-9_-]+:.*## / { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ----- init -----

init: ## Bootstrap .env and fill empty secret values (idempotent)
	@if ! command -v docker >/dev/null 2>&1; then \
	  echo "ERROR: 'docker' is not installed or not in PATH."; \
	  echo "Install Docker Desktop or Docker Engine, then re-run 'make init'."; \
	  exit 1; \
	fi
	@if ! docker compose version >/dev/null 2>&1; then \
	  echo "ERROR: 'docker compose' (v2 plugin) is not available."; \
	  echo "Install the Docker Compose v2 plugin and re-run 'make init'."; \
	  exit 1; \
	fi
	@if [ ! -f "$(ENV_FILE)" ]; then \
	  if [ -f "$(ENV_EXAMPLE)" ]; then \
	    echo "Copying $(ENV_EXAMPLE) -> $(ENV_FILE)"; \
	    cp "$(ENV_EXAMPLE)" "$(ENV_FILE)"; \
	  else \
	    echo "NOTE: $(ENV_EXAMPLE) does not exist yet (added in a later task)."; \
	    echo "      Skipping .env bootstrap. Re-run 'make init' once the example file is present."; \
	    exit 0; \
	  fi; \
	fi
	@echo "Filling empty secret values in $(ENV_FILE) (existing values preserved)..."
	@tmpfile=$$(mktemp) && \
	  awk 'BEGIN { OFS="" } \
	       /^USER_AUTH_SECRET=$$/      { cmd="openssl rand -hex 32"; cmd | getline v; close(cmd); print "USER_AUTH_SECRET=", v; next } \
	       /^ENCRYPTION_KEY_SECRET=$$/ { cmd="openssl rand -hex 32"; cmd | getline v; close(cmd); print "ENCRYPTION_KEY_SECRET=", v; next } \
	       { print } \
	      ' "$(ENV_FILE)" > "$$tmpfile" && \
	  mv "$$tmpfile" "$(ENV_FILE)"
	@echo "init complete."

# ----- One-shot stack -----

up: ## Bring the full stack up in the background
	$(COMPOSE) up -d

build: ## Build (or rebuild) all service images
	$(COMPOSE) build

pull: ## Pull latest images for all services
	$(COMPOSE) pull

# ----- Operations -----

logs: ## Tail logs for all services
	$(COMPOSE) logs -f --tail=200

logs-api: ## Tail logs for the api_server service
	$(COMPOSE) logs -f --tail=200 api_server

logs-celery: ## Tail logs for the background (celery via supervisord) service
	$(COMPOSE) logs -f --tail=200 background

logs-web: ## Tail logs for the web_server service
	$(COMPOSE) logs -f --tail=200 web_server

logs-search: ## Tail logs for the searxng service
	$(COMPOSE) logs -f --tail=200 searxng

ps: ## List running services
	$(COMPOSE) ps

down: ## Stop and remove containers (volumes preserved)
	$(COMPOSE) down

stop: ## Stop containers without removing them
	$(COMPOSE) stop

restart: ## Restart all services
	$(COMPOSE) restart

restart-celery: ## Restart the background (celery) service
	$(COMPOSE) restart background

shell-api: ## Open a bash shell inside the api_server container
	$(COMPOSE) exec api_server bash

shell-db: ## Open a psql shell inside the relational_db container
	$(COMPOSE) exec relational_db psql -U postgres

migrate: ## Run alembic migrations inside api_server (upgrade head)
	$(COMPOSE) exec api_server alembic upgrade head

# ----- Local dev mode -----

dev-deps: ## Bring up only the deps needed for local dev (db/cache/index/minio/searxng)
	$(COMPOSE) up -d $(DEV_DEPS_SERVICES)

dev-api: ## Print the uvicorn command for running api_server locally
	@echo "# Run from repo root after 'source .venv/bin/activate':"
	@echo "uvicorn onyx.main:app --reload --host 0.0.0.0 --port 8080 --app-dir backend"

dev-celery: ## Print the command for running celery workers locally
	@echo "# Run from repo root after 'source .venv/bin/activate':"
	@echo "python backend/scripts/dev_run_background_jobs.py"

dev-web: ## Run the Next.js dev server in web/
	cd web && npm run dev

dev-down: ## Stop the dev-deps subset of services
	$(COMPOSE) stop $(DEV_DEPS_SERVICES)

# ----- Cleanup -----

clean: ## Remove containers and networks (volumes preserved)
	$(COMPOSE) down --remove-orphans

clean-all: ## DESTRUCTIVE: remove containers, networks, AND volumes (requires 'yes' confirmation)
	@printf 'This will DELETE all docker volumes for this stack (Postgres, Vespa, MinIO, etc.).\n'
	@printf 'Type "yes" to confirm: '
	@read confirm && [ "$$confirm" = "yes" ] || { echo "Aborted."; exit 1; }
	$(COMPOSE) down --volumes --remove-orphans
