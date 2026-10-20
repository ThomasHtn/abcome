# Little Words backend

The part that remembers. Every word, every stage, every tiny voice: kept by a Spring Boot API on Java 25, with PostgreSQL holding the receipts.

## Start

From the backend folder, the first time:

```bash
cp .env.example .env
```

Then every day:

```bash
make -C .. db
./mvnw spring-boot:run
```

The API answers on http://localhost:8080. Sign in with the demo passphrase **littlewords-demo-passphrase**.

## Before committing

```bash
./mvnw spotless:apply
./mvnw clean verify
```

The second one runs every check the CI runs, so GitHub has nothing left to tell you. Keep Docker up: the tests bring their own PostgreSQL.

## Run a single test class

```bash
./mvnw test -Dtest=WordApiTest
```

## Browse the API

Add this line to your .env, restart, and open http://localhost:8080/swagger-ui.html

```properties
API_DOCS_ENABLED=true
```

## Family password

No hash, no notebook: the backend refuses to start without one. To make it:

```bash
make -C .. hash
```

Paste it as is in your .env. In a Docker Compose .env, wrap it in single quotes, or Compose eats its dollar signs.

No make at hand, on a server for instance:

```bash
read -rs PASSPHRASE && printf '%s' "$PASSPHRASE" | argon2 "$(openssl rand -base64 18)" -id -t 3 -m 15 -p 1 -e; unset PASSPHRASE
```

## Use your own PostgreSQL

Create the role and the database once:

```bash
sudo -u postgres psql -c "CREATE ROLE littlewords LOGIN PASSWORD 'littlewords';" -c "CREATE DATABASE littlewords OWNER littlewords;"
```

Then point your .env at it:

```properties
DB_URL=jdbc:postgresql://localhost:5432/littlewords
```

## Packages

One package per feature, stacked like a family tree: each row may lean on the rows above it, never on a sibling of its own row.

```text
shared                        config, errors, security, helpers
auth   branding   dictionary  sign-in, app name, word suggestions
word                          words, sentences, pronunciation stages
recording                     the sounds
export                        the whole notebook as a zip
```

Inside a feature, a controller calls a service, and only services touch repositories. A new package gets its row in ArchitectureTest, or the build throws a tantrum.

## Banana peels

**Running from the IDE**: the .env is only read by Maven. Add this program argument and run from the backend folder:

```text
--spring.config.import=optional:file:.env[.properties]
```

**Quotes in .env**: none. Values are read verbatim, quotes included.

**One test passes alone, fails in the suite**: never use csrf() from spring-security-test, use xsrf() from PostgreSqlIntegrationTest.

**Weird compilation errors**: the IDE may leave broken classes in target. Run with clean.
