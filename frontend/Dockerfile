# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Nginx runtime
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Metadata labels (OCI standard)
LABEL org.opencontainers.image.title="FST Pay Frontend" \
      org.opencontainers.image.description="Modern web application UI for FST Pay digital wallet platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="FST Pay Engineering" \
      org.opencontainers.image.licenses="Proprietary" \
      org.opencontainers.image.source="https://github.com/Burhan-21/FST_Pay"

# Copy compiled static assets & Nginx config
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security & non-root permissions
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /var/run/nginx.pid /etc/nginx/conf.d

USER nginx

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
