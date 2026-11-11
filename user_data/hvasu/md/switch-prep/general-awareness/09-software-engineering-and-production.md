# 9. Software Engineering & Production

---

### 9.1 Unit testing vs integration testing

| Dimension | Unit Testing | Integration Testing |
| :--- | :--- | :--- |
| **Scope** | Tests the smallest isolated unit of source code (a single function or class) in total isolation. | Tests the interaction and collaboration between multiple connected components, modules, or external systems. |
| **Dependencies** | All external dependencies (Databases, Kafka brokers, Redis, third-party REST APIs) are **mocked or stubbed** (using Mockito, Jest, etc.). | Interacts with **real (or test-containerized) dependencies** (e.g., spun up via Docker Testcontainers for PostgreSQL, Redis, or Kafka). |
| **Execution Speed** | **Extremely Fast:** Milliseconds per test. Thousands can run locally on every code compile or git commit. | **Slower:** Seconds per test due to network I/O, database table creation, connection handshakes, and disk writes. |
| **Failure Diagnosis** | Pinpoint precision: If a unit test fails, the exact line of broken algorithmic logic is immediately obvious. | Broad diagnosis: Failure could stem from schema migrations, network timeouts, serialization mismatches, or race conditions. |
| **Test Pyramid Role** | Forms the **broad base** of the Test Automation Pyramid (70%+ of total test suites). | Forms the **middle tier** (20% of total test suites). Validates wiring and integration contracts. |

---

### 9.2 What is CI/CD?

CI/CD represents the automated backbone of modern software engineering delivery, shifting manual validation into repeatable, automated pipelines.

```
+-------------------------------------------------------------------------+
| Continuous Integration (CI)                                             |
| [Code Commit] -> [Lint & Static Analysis] -> [Build] -> [Automated Tests]
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Continuous Delivery / Continuous Deployment (CD)                        |
| [Package Container / Helm] -> [Deploy Staging] -> [Canary / Production]  |
+-------------------------------------------------------------------------+
```

1. **Continuous Integration (CI):**
   - The practice of frequently merging developer code changes into a shared central repository (main/trunk) multiple times a day.
   - **Automated Pipeline Triggers:** Every Pull Request automatically initiates compilation, code formatting checks, static security analysis (SonarQube, Snyk), and runs the complete unit and integration test suites.
   - **Goal:** Identify integration regressions immediately, enforce quality gates, and prevent "merge hell".
2. **Continuous Delivery (CD):**
   - Ensures that every code build that passes the CI pipeline is automatically packaged into a release-ready artifact (e.g., Docker container image pushed to ECR) and deployed to staging/pre-production environments for automated integration and regression testing. The production deployment is ready to trigger via a single click.
3. **Continuous Deployment:**
   - An advanced extension of Continuous Delivery where changes that pass all automated validation gates are deployed directly to production customers with **zero human intervention**.
   - Supported by safe rollout strategies: **Canary Releases** (shifting 5% of traffic to new code and monitoring error rates), **Blue-Green Deployments**, and **Feature Flags**.

---

### 9.3 What is Docker and why is it used?

Docker is an open-source platform that packages applications and their entire runtime dependencies (binaries, system libraries, configuration files, and language runtimes) into lightweight, portable, self-contained units called **containers**.

#### Why Docker is Used:
1. **Eliminates the "It works on my machine" Problem:** Guarantees absolute behavioral parity across local developer laptops (macOS/Linux), automated CI pipelines, and production Kubernetes clusters.
2. **Lightweight Process Isolation vs. Virtual Machines (VMs):**
   - Unlike VMs that package a full guest operating system and run on top of a hypervisor (consuming gigabytes of RAM and taking minutes to boot), Docker containers **share the underlying host Linux kernel**.
   - Achieves process isolation using native Linux kernel primitives:
     - **Namespaces:** Isolates what a process can *see* (PID namespace for process IDs, NET for network interfaces, MNT for file systems).
     - **Control Groups (cgroups):** Isolates what a process can *use* (enforces hard limits on CPU cores, RAM allocation, disk I/O).
3. **Fast Startup & Density:** Containers boot in milliseconds and consume negligible memory overhead compared to full hypervisor VMs.
4. **Immutable Deployment Artifact:** The generated Docker image acts as the universal, versioned, immutable deployment package across modern cloud-native systems.

---

### 9.4 What is the difference between an image and a container?

| Dimension | Docker Image | Docker Container |
| :--- | :--- | :--- |
| **Analogy** | Like a **Class** in OOP, a blueprint, or a compiled binary file on disk. | Like an **Object Instance** in OOP, or a living running process in the OS. |
| **Mutability** | **Read-Only & Immutable:** Once built, an image layer cannot be modified. Built from a `Dockerfile`. | **Stateful & Mutable:** Running instance. Docker places a thin, read-write container layer on top of the image. |
| **File System Structure** | Stacked read-only file system layers created by UnionFS / OverlayFS. | The combined stacked image layers plus an active ephemeral read-write layer where changes are written. |
| **Lifecycle State** | Stored in an image registry (Docker Hub, AWS ECR). Has no operational runtime state. | Has active lifecycle states: `Created`, `Running`, `Paused`, `Stopped`, `Exited`. |
| **Creation Command** | Generated via `docker build -t my-app:v1 .` | Instantiated via `docker run -d --name my-app-instance my-app:v1` |

---

### 9.5 How do you debug a production issue?

A systematic, 6-stage engineering troubleshooting methodology:

1. **Triage & Mitigate First ("Stop the Bleeding"):**
   - Prioritize customer and system stability over immediate root cause analysis.
   - If a recent deployment caused the regression: **Roll back the release immediately** or toggle off the responsible Feature Flag.
   - If instances are running out of resources due to traffic: Scale out replicas, increase CPU/memory limits, or enable rate-limiting throttles.
2. **Correlate Timelines with Telemetry (Metrics):**
   - Inspect APM dashboards (Datadog, Grafana) to pinpoint the exact minute the degradation began.
   - Correlate the incident window with: Deployments, infrastructure auto-scaling events, database connection spikes, cache hit-rate drops, or external API partner degradations.
3. **Trace & Isolate (Logs & Distributed Traces):**
   - Search centralized log aggregators (ELK, CloudWatch) filtered by `level: ERROR` during the failure window.
   - Follow distributed transaction IDs (`trace_id`) across microservices to isolate which specific downstream service, SQL query, or external endpoint failed or timed out.
4. **Collect Diagnostic Artifacts (If Still Reproducible):**
   - In case of high CPU or deadlocks: Generate JVM thread dumps (`jstack <pid>`).
   - In case of memory exhaustion: Capture heap dumps (`jcmd <pid> GC.heap_dump`) before restarting to analyze memory leak dominator trees via Eclipse MAT.
5. **Reproduce in Non-Production:**
   - Replicate the exact bug in a staging or local environment using sanitized production input payloads and database state.
6. **Blameless Post-Mortem & Preventative Hardening:**
   - Write a detailed post-mortem: Root cause breakdown (using the "5 Whys"), impact timeline, customer impact metrics.
   - Implement preventative action items: Missing regression tests, circuit breaker additions, database indexing, and improved alerting monitors.

---

### 9.6 What are logs, metrics, and distributed tracing?

Together, these represent the **Three Pillars of Observability**:

```
                 Observability
                  /    |    \
                 /     |     \
          Metrics    Logs    Tracing
             │         │        │
             ▼         ▼        ▼
       "THAT" it    "WHY" it  "WHERE" it
       is broken    happened   happened
```

1. **Metrics (Aggregatable Time-Series Data):**
   - Numerically aggregatable measurements recorded at regular intervals over time (e.g., CPU utilization, Request Rate, Latency p95/p99, Error Rate, HikariCP active connections).
   - *Characteristics:* Extremely lightweight, compact, cheap to store, optimized for mathematical querying and real-time alerts.
   - *Tools:* Prometheus, Datadog, InfluxDB, CloudWatch.
   - *Role:* Answers **"THAT"** a problem is occurring right now.
2. **Logs (Discrete Timestamped Events):**
   - Text-based, contextual records emitted when a specific event occurs in software execution (e.g., `{"timestamp": "...", "level": "ERROR", "userId": 42, "msg": "Payment authorization rejected"}`).
   - *Characteristics:* High cardinality and rich context; heavy storage and indexing footprint. Structured JSON logging is production standard.
   - *Tools:* Elasticsearch, Logstash, Kibana (ELK Stack), Grafana Loki.
   - *Role:* Answers **"WHY"** a specific transaction failed.
3. **Distributed Tracing (End-to-End Request Journey):**
   - Records the end-to-end execution path of a single client request as it traverses distributed microservices, messaging brokers, databases, and caches.
   - *How it works:* A unique `trace_id` is generated at the API gateway and passed across services via HTTP/gRPC headers (W3C Trace Context). Each microservice creates nested `span_id`s measuring the execution duration of individual operations.
   - *Tools:* OpenTelemetry, Jaeger, Zipkin.
   - *Role:* Answers **"WHERE"** in the distributed dependency graph the latency bottleneck or error occurred.
