# Entry point for both halves of the app and its images; `make` alone lists the targets.
# Each target only wraps the documented command (CONTRIBUTING.md), so nothing here is required to work.

.DEFAULT_GOAL := help
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.PHONY: help setup db backend frontend dev fix lint test verify e2e up down reset logs hash version

# Image used to hash a passphrase when the argon2 CLI is not installed; pinned like every other image.
ALPINE := alpine:3.24.2@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6

# Same parameters as backend/README.md: 32 MiB is the most the backend accepts.
ARGON2 := argon2 "$$salt" -id -t 3 -m 15 -p 1 -e

##@ Setup

help: ## List the targets
	@awk 'BEGIN { FS = ":.*## " } /^##@/ { printf "\n%s\n", substr($$0, 5) } /^[a-z0-9-]+:.*## / { printf "  %-10s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: ## First run: local settings (demo passphrase) and frontend dependencies
	test -f backend/.env || cp backend/.env.example backend/.env
	cd frontend && npx --yes npm@11 install

##@ Development

db: ## Development PostgreSQL on localhost:5433, kept between runs
	docker compose up --detach --wait postgres

backend: ## API on :8080, actuator on :8081
	cd backend && ./mvnw spring-boot:run

frontend: ## App on :4200, proxying /api to :8080
	cd frontend && npm start

dev: db ## Database, API and app together; Ctrl+C stops both
	$(MAKE) --no-print-directory -j2 backend frontend

##@ Quality

fix: ## Every auto-fix: ESLint, Stylelint, Prettier, Spotless
	cd frontend && npm run fix
	cd backend && ./mvnw --batch-mode --quiet spotless:apply

lint: ## Linters and format checks, without the tests
	cd frontend && npm run format:check && npm run lint
	cd backend && ./mvnw --batch-mode --no-transfer-progress spotless:check checkstyle:check

test: ## Unit and integration tests of both halves (Docker for the backend)
	cd frontend && npm test -- --watch=false
	cd backend && ./mvnw --batch-mode --no-transfer-progress test

verify: ## Every CI gate: format, lint, tests, coverage, SpotBugs, architecture, production bundle
	cd frontend && npm run format:check && npm run lint && npm run test:ci && npm run build
	cd backend && ./mvnw --batch-mode --no-transfer-progress clean verify

e2e: ## Browser tests against http://localhost:8000 (`make up` first)
	cd frontend && npm run e2e

##@ Images

up: ## Whole app from its images on http://localhost:8000, in the background
	docker compose up --build --detach --wait

down: ## Stop it, keeping the database
	docker compose down

reset: ## Stop it and drop its database, the development one included
	docker compose down --volumes

logs: ## Follow the logs of every container
	docker compose logs --follow

##@ Deployment and release

hash: ## Argon2id hash of a passphrase typed without echo, for FAMILY_PASSWORD_HASH
	@read -rsp 'Passphrase (16 characters or more): ' pass; echo >&2; \
	if [ "$${#pass}" -lt 16 ]; then echo 'Too short: 16 characters or more.' >&2; exit 1; fi; \
	salt="$$(head -c 18 /dev/urandom | base64)"; \
	if command -v argon2 > /dev/null; then \
	  printf '%s' "$$pass" | $(ARGON2); \
	else \
	  printf '%s' "$$pass" | docker run --rm --interactive --env salt="$$salt" $(ALPINE) \
	    sh -c 'apk add --quiet --no-progress argon2 > /dev/null && $(ARGON2)'; \
	fi

version: ## Set the version of both halves before tagging: make version VERSION=1.2.0
	@if [[ ! "$(VERSION)" =~ ^[0-9]+\.[0-9]+\.[0-9]+$$ ]]; then echo 'Usage: make version VERSION=x.y.z' >&2; exit 1; fi
	cd backend && ./mvnw --batch-mode --quiet versions:set -DnewVersion=$(VERSION) -DgenerateBackupPoms=false
	cd frontend && npm version $(VERSION) --no-git-tag-version
	@echo 'Commit, then tag: git tag v$(VERSION) && git push origin v$(VERSION)'
