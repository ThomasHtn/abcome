# syntax=docker/dockerfile:1

# Base images are pinned by version and digest for reproducible builds; Dependabot bumps both.

# ---- Build stage ------------------------------------------------------------
# Builds the executable jar. Quality gates (Checkstyle, SpotBugs, tests, JaCoCo) already run in CI
# via `./mvnw verify` before an image is ever built here, so this stage only packages the artifact.
FROM eclipse-temurin:26.0.2_10-jdk-noble@sha256:abe71c9b7140affd9a80d6ed313c428e3393d4d18c235823b1745670d4702053 AS build
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
RUN ./mvnw --batch-mode --no-transfer-progress -DskipTests clean package \
  && cp target/littlewords-*.jar littlewords.jar \
  && java -Djarmode=tools -jar littlewords.jar extract --layers --destination extracted

# ---- Runtime stage ------------------------------------------------------------
FROM eclipse-temurin:26.0.2_10-jre-noble@sha256:0140636ef128fa014041fa12dae3a9de53b6a6c6f055271f4e6a7417ea34012c AS runtime
WORKDIR /app

# Unprivileged user with a fixed numeric id, so a runtime can check it is not root without a passwd lookup.
RUN groupadd --system --gid 10001 littlewords && useradd --system --uid 10001 --gid 10001 littlewords
USER 10001:10001

# One layer per Spring Boot layer, least to most frequently changed: a code change only ships the last one.
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./

# 8080 serves the API and /livez, /readyz; 8081 serves the actuator and must never be routed publicly.
EXPOSE 8080 8081

# Probes the main port, so a stuck API fails even if the management port answers. No curl in this
# image, so bash speaks HTTP over /dev/tcp. The start period covers JVM startup and Flyway migrations.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["bash", "-c", "exec 3<>/dev/tcp/127.0.0.1/8080 && printf 'GET /readyz HTTP/1.0\\r\\nHost: localhost\\r\\n\\r\\n' >&3 && read -r status <&3 && [[ $status == *' 200 '* ]]"]

# Heap takes 60 % of the container memory limit; the rest is for metaspace, threads and buffers.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=60", "-jar", "littlewords.jar"]
