# Stage 1: Build stage
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /build

COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Layer extraction
FROM eclipse-temurin:17-jre-alpine AS extractor
WORKDIR /builder
COPY --from=builder /build/target/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract 2>/dev/null || \
    java -Djarmode=tools -jar app.jar extract 2>/dev/null || \
    (mkdir -p dependencies snapshot-dependencies spring-boot-loader application && unzip -q app.jar -d application)

# Stage 3: Lightweight non-root runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Metadata labels (OCI standard)
LABEL org.opencontainers.image.title="FST Pay Backend" \
      org.opencontainers.image.description="AI-powered digital wallet and virtual prepaid card platform backend service" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="FST Pay Engineering" \
      org.opencontainers.image.licenses="Proprietary" \
      org.opencontainers.image.source="https://github.com/NexusForge21/FST_Pay"

# Security: Non-root user setup (UID 10001)
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER 10001:10001

# Copy extracted application layers for optimal caching
COPY --from=extractor --chown=10001:10001 /builder/dependencies/ ./
COPY --from=extractor --chown=10001:10001 /builder/spring-boot-loader/ ./
COPY --from=extractor --chown=10001:10001 /builder/snapshot-dependencies/ ./
COPY --from=extractor --chown=10001:10001 /builder/application/ ./

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health/readiness || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS org.springframework.boot.loader.launch.JarLauncher --spring.profiles.active=${SPRING_PROFILES_ACTIVE:-prod}"]
