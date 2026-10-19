# syntax=docker/dockerfile:1

# ---- Build stage ------------------------------------------------------------
# Builds the executable jar. Quality gates (Checkstyle, SpotBugs, tests, JaCoCo) already run in CI
# via `./mvnw verify` before an image is ever built here, so this stage only packages the artifact.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace

# Copied and resolved before the source tree, so this layer is only invalidated when a dependency
# actually changes rather than on every code change.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw --batch-mode --no-transfer-progress dependency:go-offline

# Checkstyle (bound to the `validate` phase, still run below despite -DskipTests) reads its config
# from here.
COPY config config
COPY src src
RUN ./mvnw --batch-mode --no-transfer-progress -DskipTests clean package

# ---- Runtime stage ------------------------------------------------------------
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

# Runs as an unprivileged user rather than the image's default root.
RUN groupadd --system abcome && useradd --system --gid abcome abcome
USER abcome

COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080

# Healthy once the database answers. No curl in this image, so bash speaks HTTP over /dev/tcp.
# The start period covers JVM startup and Flyway migrations.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /actuator/health/readiness HTTP/1.0\\r\\nHost: localhost\\r\\n\\r\\n' >&3 && read -r status <&3 && [[ $status == *' 200 '* ]]"]

# Heap takes 60 % of the container limit (docker-compose.prod.yml); the rest is for metaspace, threads and buffers.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60", "-jar", "app.jar"]
