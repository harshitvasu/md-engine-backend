# 4. System Design Fundamentals

---

### 4.1 Horizontal scaling vs vertical scaling

| Dimension | Vertical Scaling (Scale-Up) | Horizontal Scaling (Scale-Out) |
| :--- | :--- | :--- |
| **Concept** | Adding more computing power (CPU cores, RAM, NVMe SSDs) to an existing single server. | Adding more independent computing machines/nodes to the pool of resources. |
| **Architectural Impact** | Zero architectural changes; application code and deployment topology remain monolithic and identical. | High architectural impact; requires load balancers, stateless application design, and distributed data handling. |
| **Upper Limit / Ceiling** | Hard physical limit dictated by maximum server hardware capacity. | Virtually unlimited; capacity expands dynamically by adding commodity servers. |
| **Availability & SPOF** | High risk: The single machine represents a **Single Point of Failure (SPOF)**. Hardware upgrades cause downtime. | High fault tolerance: If one node crashes, load balancers seamlessly reroute traffic to surviving nodes. |
| **Financial Cost** | High-end enterprise hardware costs grow exponentially beyond a certain specification threshold. | Cost scales linearly using economical, commodity cloud virtual machines (e.g., AWS EC2). |
| **Data Consistency** | Simple: All threads share local memory and a single disk; strict ACID is straightforward. | Complex: Requires distributed consensus (Raft/Paxos), distributed transactions, or eventual consistency. |

---

### 4.2 What is caching? Explain cache-aside

Caching is the technique of storing copies of frequently accessed data or computationally expensive results in a high-speed, volatile in-memory storage layer (such as Redis or Memcached) to eliminate expensive database queries, disk I/O, or remote network latency.

#### The Cache-Aside (Lazy Loading) Pattern:
The application directly orchestrates the cache and database interactions:

```
[Client] ---> [App Server]
                  |
         +--------+--------+
         | (1. Read Key)   | (3. Cache Miss: Query DB)
         v                 v
     [Cache]           [Database]
  (2. Return Data)
```

1. **Read Workflow:**
   - The application receives a request for resource $K$.
   - It queries the cache first.
   - **Cache Hit:** If key $K$ exists, the cached data is returned directly to the client ($< 2\text{ms}$).
   - **Cache Miss:** If key $K$ does not exist in cache, the application queries the primary database, populates the returned data into the cache with a **Time-To-Live (TTL)**, and responds to the client.
2. **Write / Update Workflow:**
   - The application writes the update directly to the primary database.
   - The application **invalidates (deletes)** key $K$ from the cache (rather than updating it, to prevent race conditions).
3. **Key Advantages & Trade-Offs:**
   - *Pros:* Resilient against cache outages (if Redis crashes, queries fall back to DB); only requested data occupies memory.
   - *Cons:* Cache miss latency penalty on initial access; risk of reading stale data if cache deletion fails.

---

### 4.3 What is cache invalidation?

As Phil Karlton famously noted: *"There are only two hard things in Computer Science: cache invalidation and naming things."*

Cache invalidation is the process of purging or replacing cached data when the underlying source of truth (the database) changes, ensuring clients do not consume stale, incorrect state.

#### Core Cache Update & Invalidation Strategies:
1. **Cache Eviction on Write (Delete Key):**
   - The application commits updates to the database, then immediately deletes the key from the cache. The next read triggers a fresh cache-aside reload.
   - *Why delete instead of update?* If two concurrent writes occur, updating the cache can result in race conditions where an older write overwrites a newer write in the cache. Deleting avoids this concurrency conflict.
2. **Write-Through:**
   - Application writes to the cache; the cache synchronously writes to the database before acknowledging. Guarantees consistency, but adds write latency.
3. **Write-Behind (Write-Back):**
   - Application writes directly to the cache and acknowledges immediately. The cache asynchronously flushes updates to the database in batches. Extreme write speed, but risks data loss if the cache server crashes before flushing.
4. **Time-To-Live (TTL) Expiration:**
   - Every key is assigned an automatic expiration timestamp (e.g., 10 minutes) as a safety net against stale data.

#### In-Memory Eviction Policies (When Cache is Full):
- **LRU (Least Recently Used):** Evicts the item that has not been accessed for the longest period (standard default).
- **LFU (Least Frequently Used):** Evicts items with the lowest access frequency counter.
- **FIFO (First-In, First-Out):** Evicts the oldest loaded item regardless of access frequency.

---

### 4.4 What is CAP theorem?

Formulated by Eric Brewer, the CAP theorem states that any distributed data store can guarantee at most **two out of the following three** properties simultaneously in the presence of network failures:

```
                  Consistency
                     /\
                    /  \
                   /    \
                  /  CA  \   (Only possible in non-partitioned networks)
                 /        \
   Availability /__________\ Partition Tolerance
              AP            CP
```

1. **Consistency (Linearizability / Single-Copy Consistency):**
   - Every read receives the most recent committed write or returns an error. All nodes see identical data at the exact same instant.
2. **Availability:**
   - Every non-failing node returns a non-error response for every incoming request, with no guarantee that it contains the absolute most recent write.
3. **Partition Tolerance:**
   - The system continues to operate despite an arbitrary number of dropped, delayed, or partitioned network packets between nodes.

#### The Real-World Engineering Reality:
Network partitions are an inevitable physical reality of distributed infrastructure (fiber cuts, switch failures, network timeouts). Therefore, **Partition Tolerance ($P$) is non-negotiable**. A distributed system must choose between:
- **CP (Consistency over Availability):** If nodes cannot synchronize due to a network split, the system rejects writes/reads to prevent stale or conflicting data (e.g., HBase, Zookeeper, Google Spanner, MongoDB under `w: "majority"`).
- **AP (Availability over Consistency):** Nodes continue accepting reads and writes locally during a partition, sacrificing immediate consistency and reconciling conflicts later via eventual consistency (e.g., Apache Cassandra, DynamoDB, CouchDB).

---

### 4.5 Strong consistency vs eventual consistency

| Dimension | Strong Consistency (Linearizability) | Eventual Consistency |
| :--- | :--- | :--- |
| **Core Guarantee** | Once a write completes, **all subsequent reads** across any node will instantly reflect that write or a later one. | Replicas do not synchronize instantaneously; given enough time without new updates ($t \to \infty$), all replicas will eventually converge to identical data. |
| **User Experience** | Absolute data correctness. No user ever observes stale or out-of-order state. | Users may observe temporary stale data (e.g., user posts a comment, refreshes immediately, and does not see it for 300ms). |
| **Latency & Performance** | Higher latency: Requires multi-phase network round trips, quorum agreement (e.g., Raft/Paxos), or Two-Phase Commit before confirming writes. | Low latency: Writes return immediately after hitting a local replica; background asynchronous replication handles propagation. |
| **Availability Under Partition** | Low availability: Rejects operations if consensus cannot be reached during network splits. | High availability: Nodes accept writes and reads independently regardless of network partition states. |
| **Typical Implementations** | RDBMS transactions, CockroachDB, etcd, financial ledger systems. | DNS, Amazon DynamoDB, Apache Cassandra, social media feed likes/views. |

---

### 4.6 What is rate limiting?

Rate limiting is a defensive engineering mechanism that restricts the number of requests a client or service can submit to an API within a specified time window. It prevents resource starvation, protects against Denial-of-Service (DDoS) and brute-force attacks, mitigates noisy neighbor issues in multi-tenant systems, and enforces commercial API quotas.

#### Core Rate Limiting Algorithms:
1. **Token Bucket (Industry Standard - Stripe, AWS):**
   - A bucket has a maximum capacity of $B$ tokens and refills with tokens at a steady rate of $R$ tokens/second.
   - Each incoming request must capture 1 token to proceed; if the bucket is empty, the request is rejected with `HTTP 429 Too Many Requests`.
   - *Advantage:* Naturally handles short bursts of traffic up to the bucket capacity while maintaining a steady-state average rate.
2. **Leaky Bucket:**
   - Requests enter a FIFO queue (the bucket) of capacity $B$ and are processed (leaked) at a strictly constant, smoothed output rate. Excess requests overflow and are dropped.
   - *Advantage:* Completely flattens traffic spikes into a smooth, predictable processing flow.
3. **Fixed Window Counter:**
   - Divides time into fixed intervals (e.g., 1 minute) and counts requests within each window.
   - *Drawback:* A burst of requests occurring right at the window boundary (e.g., end of minute 1 and start of minute 2) can allow up to twice the rate limit.
4. **Sliding Window Log:**
   - Tracks the exact timestamp of every request in a sorted set (e.g., Redis `ZSET`). On a new request, elements older than $(now - window)$ are cleared, and the remaining count is checked.
   - *Drawback:* High memory consumption because every request timestamp is retained.
5. **Sliding Window Counter (Hybrid):**
   - Blends the request count of the previous window with the current window using a weighted percentage:
     $$\text{Count} = \text{Current Window Count} + \text{Previous Window Count} \times (1 - \text{elapsed time ratio})$$
   - *Advantage:* Memory-efficient, prevents boundary spikes, low CPU overhead.

---

### 4.7 What is a circuit breaker pattern?

The Circuit Breaker pattern prevents cascading failures across distributed microservices by failing fast when a downstream dependency is unhealthy or unresponsive, allowing the failing service time to recover.

```
       +---------------------------------------------+
       |                                             |
       v                                             |
  [ CLOSED ] ---(Failures > Threshold)---> [ OPEN ]  |
       ^                                      |      |
       |                               (Sleep Window Elapsed)
       |                                      |      |
       |                                      v      |
       +-------(All Probes Succeed)---- [ HALF-OPEN ]+
                                              |
                                      (Probe Fails)
```

#### The Three Operational States:
1. **Closed (Normal Operation):**
   - All requests are forwarded to the downstream dependency.
   - The circuit breaker tracks success and failure rates. If the failure rate (e.g., timeouts, HTTP 500s) exceeds a predefined threshold (e.g., 50% failures over 10 seconds), the circuit **trips to Open**.
2. **Open (Failing Fast):**
   - All incoming requests fail immediately without attempting to call the downstream service.
   - The breaker instantly executes a fallback logic (e.g., returning cached stale data, degraded defaults, or an explicit error).
   - This relieves pressure on the struggling downstream service and frees up caller thread pools. A timer (e.g., 30s `sleepWindow`) begins.
3. **Half-Open (Testing Recovery):**
   - Once the timer expires, the breaker transitions to Half-Open and allows a limited number of trial/probe requests through.
   - If the trial requests succeed, the breaker resets to **Closed**.
   - If any trial request fails, the breaker immediately returns to **Open** for another cooldown interval.

---

### 4.8 What is a distributed system?

A distributed system is a collection of autonomous, networked computers (nodes) that communicate and coordinate exclusively via **message passing**, presenting themselves to end-users as a single, coherent computing system.

#### The 8 Fallacies of Distributed Computing (L. Peter Deutsch):
Architects of distributed systems often fail because they assume:
1. The network is reliable.
2. Latency is zero.
3. Bandwidth is infinite.
4. The network is secure.
5. Topology doesn't change.
6. There is one administrator.
7. Transport cost is zero.
8. The network is homogeneous.

#### Fundamental Challenges:
- **No Shared Memory or Clock:** Nodes cannot observe a single physical clock; clock drift requires logical clocks (Lamport timestamps, Vector clocks, TrueTime).
- **Partial Failure:** Parts of the system can crash while other parts continue running, creating ambiguity over whether a remote operation succeeded, failed, or timed out.
- **Network Asynchrony & Partitions:** Packets can be duplicated, reordered, delayed indefinitely, or dropped.

---

### 4.9 What is database connection pooling?

Database connection pooling is a performance optimization pattern where a pool of pre-established, persistent database connections is kept open and reused across multiple sequential requests, eliminating the expensive overhead of creating and destroying connections for every query.

#### The Cost of Opening a Direct Connection:
Establishing a database connection involves:
1. Operating system TCP 3-way handshake.
2. TLS/SSL cryptographic negotiation.
3. Database authentication and role authorization checks.
4. Memory allocation on the database server (spawning a backend worker process/thread, allocating session memory, sorting buffers).

#### How the Pool Operates (e.g., HikariCP, pgBouncer):
- When an application thread executes a database query, it borrows an idle connection from the pool.
- The thread executes the query and returns the connection back to the pool via `connection.close()` (which intercepts the call and resets the connection state rather than severing the underlying TCP socket).

#### Sizing Rule of Thumb (PostgreSQL / HikariCP Formula):
$$\text{Pool Size} = 2 \times \text{CPU cores} + \text{Disk Spindle Count}$$
Counter-intuitively, configuring 1,000 application threads to hit 1,000 concurrent database connections severely degrades throughput due to OS CPU context switching and disk I/O thrashing. A small, well-tuned pool (e.g., 20–50 connections) saturates CPU hardware efficiently without queue overload.
