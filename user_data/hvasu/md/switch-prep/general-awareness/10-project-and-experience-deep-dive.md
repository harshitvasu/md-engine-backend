# 10. Project & Experience Deep Dive

---

### 10.1 Explain the architecture of your most recent project

#### Architecture Overview: Real-Time Event-Driven Vehicle Telematics & Automated Health Scoring System
The system ingests high-frequency IoT telematics data from vehicle fleets (OBD-II diagnostic trouble codes, battery voltages, speed, braking patterns), calculates real-time mechanical health scores, and automates safety blocks to prevent customers from operating compromised vehicles.

```
+--------------------+
| Vehicle IoT Device |  (GPS, OBD-II DTC Codes, Telemetry @ 1Hz)
+--------------------+
          │  HTTPS / MQTT
          ▼
+--------------------+
| Ingestion Gateway  |  (Node.js / Express Proxy - Stateless)
+--------------------+
          │  Batch Writes
          ▼
+--------------------+
|   Kafka Cluster    |  Topic: `telemetry.raw` (Partition Key: `vehicle_id`)
+--------------------+
          │
          ├─────────────────────────────────────────────────┐
          ▼                                                 ▼
+--------------------+                            +--------------------+
| Health-Scoring Svc | (Java/Spring Boot Consumers)       | Telemetry Sink Svc |
| - Sliding window   |                            | - TimescaleDB / S3 |
| - DTC code lookup  |                            |   Cold historical  |
+--------------------+                            +--------------------+
          │
    (Score < 60)
          ▼
+--------------------+
| Kafka Event Topic  |  Topic: `vehicle.safety.critical`
+--------------------+
          │
          ▼
+--------------------+
| Safety-Block Svc   |  (Spring Boot / PostgreSQL)
| - Cancels booking  |  ---> Updates Booking DB with Pessimistic Lock
| - Relocates user   |  ---> Emits Notification Event to Customer
+--------------------+
```

#### Core Architectural Layers:
1. **Ingestion Layer:**
   - Stateless Ingestion Gateway built with high-throughput Node.js microservices terminating TLS, validating authentication headers, and batch-publishing raw telemetry payloads directly into Apache Kafka.
2. **Streaming & Event Backbone (Kafka):**
   - Topic `telemetry.raw` partitioned by `vehicle_id`, ensuring all chronological telemetry events for any individual vehicle are consumed sequentially by the same worker instance.
3. **Stream Evaluation & Health Scoring Engine:**
   - Java / Spring Boot consumer workers maintain an in-memory sliding window using Redis to evaluate rolling metrics (e.g., sudden voltage drop $< 11.5\text{V}$, active engine check light DTCs like `P0300` random misfire).
4. **Automated Action & Safety Blocking Service:**
   - When a vehicle's health score drops below safety thresholds, the engine publishes a `vehicle.safety.critical` event. The Safety Block service consumes this event, marks the vehicle unavailable for new reservations in PostgreSQL, and reassigns any impending customer booking to a nearby healthy vehicle.

---

### 10.2 Walk me through the lifecycle of an API request

**Scenario:** A customer hits `POST /api/v1/bookings` to reserve an available vehicle.

```
[Browser / App] 
      │ 1. DNS Resolution (Route 53)
      ▼
[AWS CloudFront / WAF]  (DDoS inspection, TLS Termination)
      │ 2. Forward clean HTTPS
      ▼
[AWS Application Load Balancer] (Round Robin / Health Checks)
      │ 3. Forward to internal VPC
      ▼
[API Gateway (Envoy / Spring Cloud)]
      │ - Validates JWT Signature via JWKS
      │ - Rate Limiting (Token Bucket in Redis)
      │ - Attaches `X-User-Id`, `X-Trace-Id` headers
      ▼
[Booking Microservice (Spring Boot)]
      │ 4. Controller Layer: Deserializes JSON, validates DTO (@Valid)
      │ 5. Filter/Interceptor: Logs request with Trace ID
      │ 6. Service Layer (@Transactional):
      │    a. Cache Check: Verifies vehicle status in Redis
      │    b. DB Lock: SELECT * FROM vehicles WHERE id = :id FOR UPDATE;
      │    c. Invariant Check: Ensures vehicle is active and slot is open
      │    d. Database Write: INSERT INTO bookings (...);
      │    e. Audit Event: Emits `booking.created` to Kafka
      │ 7. Transaction Commit: DB releases row lock
      ▼
[Response Pipeline]
      │ 8. Serializes JSON DTO (HTTP 201 Created)
      │ 9. Returns headers (ETag, Content-Type) through ALB to Client
      ▼
[Client receives 201 Created with Booking Details]
```

---

### 10.3 What was the most challenging production bug you resolved?

#### The "Ghost Lock & Connection Pool Starvation" Outage (STAR Method):

- **Situation:**
  During a major holiday booking surge, the primary Booking API response latency suddenly degraded from a baseline p95 of $75\text{ms}$ to over $15{,}000\text{ms}$, ultimately triggering widespread `HTTP 500` connection timeout errors. Database CPU was hovering at only 25%, yet the application connection pool (`HikariCP`) was completely exhausted.
- **Task:**
  Identify the root cause of connection starvation under moderate database load and restore service availability before the peak traffic window closed.
- **Action:**
  1. Captured multiple JVM thread dumps using `jstack` during the incident and analyzed them in a thread analyzer tool.
  2. Discovered over 80 application worker threads in a `WAITING` state on a socket read (`java.net.SocketInputStream.socketRead0`).
  3. Traced the call stack to a third-party SMS/Payment verification HTTP client call executed *inside* an open `@Transactional` service method.
  4. The downstream third-party partner was experiencing a severe latency spike ($8\text{s}$ response times). Because the external REST call was wrapped inside the Spring `@Transactional` boundary, the application thread had already checked out a live database connection from the HikariCP pool and held it completely idle for 8 seconds while waiting for the network socket!
  5. As hundreds of concurrent users hit the endpoint, all 50 pool connections were held hostage waiting for third-party HTTP responses, starving all other quick SQL queries across the entire microservice.
- **Resolution:**
  - **Refactored Transactional Boundaries:** Restructured the code using programmatic transactions or separated service methods so that database transactions were opened *only* for the few milliseconds required to execute SQL writes, strictly moving external HTTP network calls outside the database transaction.
  - **Defensive Timeouts & Circuit Breakers:** Configured aggressive socket timeouts ($1{,}200\text{ms}$) on all external HTTP clients and wrapped calls in a Resilience4j circuit breaker with fallback queues.
- **Result:**
  HikariCP active connections dropped from 100% saturation to $< 15\%$ under peak load. API p95 latency returned to $65\text{ms}$, completely eliminating pool exhaustion outages.

---

### 10.4 How did you handle database consistency and concurrent requests?

To prevent race conditions—such as two users concurrently booking the exact same vehicle for the same time window (the "Double Booking" problem)—a multi-layered concurrency architecture was implemented:

1. **Database Row-Level Exclusion (Pessimistic Locking):**
   - For high-contention reservation workflows, the booking transaction executes an exclusive lock:
     ```sql
     SELECT id, status FROM vehicles 
     WHERE id = :vehicleId 
     FOR UPDATE;
     ```
   - The second concurrent transaction is forced to wait until the first transaction commits or rolls back, verifying the updated status before proceeding.
2. **PostgreSQL Exclusion Constraints (GiST):**
   - To prevent overlapping reservation time slots even if application locks fail, a native database constraint was enforced using PostgreSQL range types:
     ```sql
     ALTER TABLE bookings 
     ADD CONSTRAINT no_overlapping_bookings 
     EXCLUDE USING gist (
       vehicle_id WITH =,
       booking_time_range WITH &&
     );
     ```
   - If two transactions race past the application layer, the database engine physically rejects the second write at the storage engine level with a constraint violation.
3. **Optimistic Locking with Versioning:**
   - For lower-contention administrative updates (e.g., updating vehicle pricing or hub locations), an `@Version` column was utilized:
     ```sql
     UPDATE vehicles 
     SET daily_rate = 1500, version = version + 1 
     WHERE id = :id AND version = :currentVersion;
     ```
   - If another process updated the record concurrently, the update returns $0$ affected rows, prompting an immediate retry without holding database locks.
4. **Distributed Idempotency Keys:**
   - Every reservation request required a unique client-generated UUID in the `Idempotency-Key` header, cached in Redis via `SET NX` to reject accidental duplicate user double-clicks.

---

### 10.5 How did you handle failures between services?

A robust resilience strategy combining synchronous circuit breaking with asynchronous event-driven decoupling:

1. **The Transactional Outbox Pattern (Eliminating Dual-Write Failures):**
   - *The Problem:* Writing to a database and publishing an event to Kafka within the same flow can fail midway (e.g., DB commits, but Kafka broker is unreachable, causing data inconsistency).
   - *The Solution:* The microservice writes the entity update and an outbox event record into an `outbox` table inside the **exact same local ACID database transaction**.
   - A dedicated background process (or Debezium CDC via PostgreSQL Write-Ahead Log) reads the outbox table and streams events reliably to Kafka with at-least-once delivery guarantees.
2. **Circuit Breakers with Graceful Fallbacks (Resilience4j):**
   - Wrapped inter-service REST and gRPC calls with circuit breakers. If the Vehicle Scoring or Recommendation service degraded, the breaker tripped to Open, immediately returning cached fallback data (or default configurations) rather than failing customer requests.
3. **Dead-Letter Queues (DLQ) & Exponential Retries:**
   - Asynchronous Kafka consumers were configured with a retry topic hierarchy: `telemetry.raw` $\to$ `telemetry.retry.1` (10s backoff) $\to$ `telemetry.retry.2` (60s backoff) $\to$ `telemetry.dlq`.
   - Poison-pill messages that failed repeatedly were routed to the DLQ, triggering Slack alerts for engineering triage without stalling the primary consumer partition offsets.

---

### 10.6 What technical decision would you change if you rebuilt your project?

#### "Premature Microservice Decomposition vs. Modular Monolith"

- **The Mistake / Initial Decision:**
  Early in the architecture phase, the engineering team split the system into five fine-grained microservices (User Service, Vehicle Catalog Service, Booking Service, Telematics Service, Pricing Service) based on theoretical domain boundaries before traffic scale demanded it.
- **The Operational Penalties Incurred:**
  1. **Distributed Transaction Overhead:** Simple operations like booking a car required complex distributed transaction choreography (Saga pattern) across the Booking, Pricing, and Catalog services, increasing code complexity and error states.
  2. **Network Serialization Latency:** What should have been in-memory function calls turned into HTTP/REST network hops, adding $20\text{ms}$–$40\text{ms}$ of latency per user request.
  3. **DevOps & Deployment Friction:** Running five independent CI/CD pipelines, managing service discovery, and configuring distributed tracing across separate codebases slowed down team feature velocity significantly.
- **What I Would Do Differently Today:**
  - Build the core business domains (Booking, Pricing, Catalog, User) as a **Modular Monolith** within a single codebase using strict domain-driven package boundaries (e.g., Java packages or NestJS modules).
  - High-traffic database queries would execute as fast in-memory calls or direct relational joins within a single database schema.
  - Carve out **only the truly independent, high-throughput streaming component**—the raw Telematics IoT Ingestion & Processing Pipeline—as a standalone microservice, because its throughput (50,000 events/sec) and scaling characteristics were fundamentally distinct from the transactional booking workflows.
