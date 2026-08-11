# FST Pay Container Topology & Architecture

This document describes the container layout, networking boundaries, profiles, and port mapping model for FST Pay.

---

## 1. Container Layout & Profiles Overview

FST Pay uses Docker Compose v2 profiles to allow modular runtime execution:

```
                  +-----------------------------------+
                  |        Nginx Reverse Proxy        |
                  |         fstpay-frontend           |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------+-----------------+
                  |       Spring Boot Backend         |
                  |         fstpay-backend            |
                  +--------+----------------+---------+
                           |                |
             +-------------+                +-------------+
             |                                            |
             v                                            v
+------------+------------+                  +------------+------------+
|        PostgreSQL       |                  |           Redis             |
|     fstpay-postgres     |                  |        fstpay-redis         |
+-------------------------+                  +-------------------------+
```

### Profile Matrix

| Profile | Services Included | Target Use Case |
| :--- | :--- | :--- |
| `core` | `fstpay-postgres`, `fstpay-redis`, `fstpay-backend`, `fstpay-frontend` | Base application execution |
| `messaging` | `fstpay-kafka`, `fstpay-kafka-ui` | Event-driven processing & topic inspection |
| `observability` | `fstpay-jaeger`, `fstpay-prometheus` | Distributed tracing & telemetry collection |
| `full` | All services | Complete platform test harness |

---

## 2. Networking Boundaries & Inter-Service Security

- **Network**: All containers belong to an isolated Docker bridge network `fstpay-network`.
- **Internal Communication**: Backend connects to PostgreSQL via `fstpay-postgres:5432`, Redis via `fstpay-redis:6379`, and Kafka via `fstpay-kafka:9092`.
- **Port Exposure**:
  - `8080`: Backend API & Actuator
  - `80`: Frontend UI / Health
  - `5434`: Host PostgreSQL mapping
  - `6380`: Host Redis mapping
  - `9092`: Host Kafka broker mapping

---

## 3. Storage Topology & Persistence

| Volume Name | Target Path | Description |
| :--- | :--- | :--- |
| `fstpay_pgdata` | `/var/lib/postgresql/data` | PostgreSQL relational transaction data |
| `fstpay_redis` | `/data` | Redis AOF cache & session persistence |
| `fstpay_kafka_data` | `/bitnami/kafka` | Kafka topic partitions & commit log offset storage |
