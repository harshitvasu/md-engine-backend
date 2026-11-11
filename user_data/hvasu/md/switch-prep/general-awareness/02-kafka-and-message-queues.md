# 2. Kafka & Message Queues

---

### 2.1 What is Kafka and why is it used?

Apache Kafka is an open-source, distributed event streaming platform architected around an **append-only, immutable commit log**. Unlike traditional message brokers that store transient messages in memory queues, Kafka writes events sequentially to persistent disk storage, organized into topics and distributed partitions.

#### Why Kafka is Used:
1. **Massive Throughput & Low Latency:** Capable of processing millions of events per second with sub-millisecond latencies using hardware-efficient design patterns:
   - **Sequential Disk I/O:** Bypasses random disk seeks, allowing standard disks to achieve near-memory speeds.
   - **Zero-Copy Optimization:** Leverages Linux `sendfile()` system calls to stream data directly from the OS Page Cache to the network socket, avoiding user-space memory copies.
   - **Batching & Compression:** Producers batch records together before transmission, maximizing network packet efficiency and amortizing disk writes.
2. **Durability and Replayability:** Messages are retained on disk for a configurable period (hours, days, or indefinitely) regardless of whether they have been consumed. Consumers can replay events by rewinding their offsets.
3. **Microservice Decoupling:** Acts as the central event backbone, enabling asynchronous, event-driven architectures where publishers and subscribers scale independently.

---

### 2.2 Why does Kafka use partitions?

Partitions are the fundamental unit of **scalability, concurrency, and fault tolerance** in Kafka:

1. **Horizontal Scalability (Storage):** A single topic can hold petabytes of data because its partitions are distributed across multiple brokers in the cluster, breaking past the physical disk capacity of any single machine.
2. **Parallel Processing (Throughput):** 
   - Producers can publish to multiple partitions concurrently.
   - Kafka enforces that **each partition is consumed by only one consumer within a consumer group** at any given time. Thus, the number of partitions defines the maximum degree of consumer parallelism.
3. **Partition-Level Ordering:** Kafka guarantees strict sequential ordering of messages within an individual partition. By partitioning data using a consistent routing key (e.g., `user_id` or `order_id`), all events for a given entity always land in the same partition in chronological order.

---

### 2.3 What are Kafka consumer groups?

A Consumer Group is a logical collection of consumers working collaboratively to subscribe to and process messages from one or more Kafka topics.

```
Topic: [Partition 0] [Partition 1] [Partition 2] [Partition 3]
              |             |             |             |
        +-----+-----+ +-----+-----+ +-----+-----+       |
        | Consumer 1| | Consumer 2| | Consumer 3|-------+
        +-----------+ +-----------+ +-----------+
             Consumer Group "Order-Processing-Group"
```

#### Key Rules & Characteristics:
- **Load Sharing:** Each partition of a topic is assigned to exactly **one consumer** within the consumer group.
  - If `Consumers == Partitions`: Each consumer reads from exactly 1 partition (optimal balanced state).
  - If `Consumers < Partitions`: Some consumers will be assigned multiple partitions.
  - If `Consumers > Partitions`: Excess consumers sit completely idle as hot standbys.
- **Independent Consumption:** Multiple distinct consumer groups can subscribe to the same topic independently. Group A (e.g., `Billing-Service`) and Group B (e.g., `Analytics-Pipeline`) each maintain their own independent consumer offsets, processing the same event stream at their own pace without interference.
- **Dynamic Rebalancing:** If a consumer crashes or a new consumer joins the group, the Group Coordinator broker triggers a **Consumer Group Rebalance**, dynamically redistributing partition assignments across the healthy active members.

---

### 2.4 How does Kafka maintain message ordering?

- **Partition-Level Ordering Guarantee:** Kafka provides strict total ordering **only within a single partition**, never globally across multiple partitions of a topic.
- **Partition Key Routing:** When a producer publishes a message, it provides a message key:
  $$\text{partition} = \text{hash}(\text{key}) \pmod{\text{number of partitions}}$$
  All events carrying the same key (e.g., `vehicle_uuid` or `customer_id`) are deterministically routed to the identical partition, guaranteeing FIFO ordering for that specific entity.
- **Producer In-Flight Invariance:** In older Kafka clients, network retries could re-order batches if `max.in.flight.requests.per.connection > 1`. To prevent this, modern Kafka enables **Idempotent Producers** (`enable.idempotence=true`). Each producer is assigned a unique Producer ID (PID), and each batch is stamped with a monotonically increasing sequence number. The broker automatically drops duplicate sequence numbers and rejects out-of-order writes.
- **Consumer Processing:** A consumer assigned to a partition reads messages strictly in the order of their continuous offsets.

---

### 2.5 What happens when a consumer crashes?

When a consumer instance fails or becomes unresponsive, the following sequence of events occurs:

1. **Heartbeat Failure & Failure Detection:**
   - Active consumers run a background thread sending periodic heartbeats to the broker acting as the **Group Coordinator** (`heartbeat.interval.ms`, typically 3s).
   - If the coordinator does not receive a heartbeat within `session.timeout.ms` (typically 45s), or if the consumer takes longer than `max.poll.interval.ms` between consecutive `poll()` invocations (indicating processing thread deadlock), the consumer is marked dead.
2. **Triggering Group Rebalance:**
   - The coordinator informs the remaining group members to pause and initiates a rebalance protocol (e.g., Cooperative Sticky Assignor).
   - Partitions previously assigned to the crashed consumer are reassigned to the remaining healthy consumers.
3. **Offset Resumption:**
   - The newly assigned consumer queries the internal `__consumer_offsets` topic to determine the last successfully committed offset for the reassigned partition.
   - **Duplicate vs. Missed Messages:**
     - If the crashed consumer had processed records but *crashed before committing the offset*, the new consumer will re-read and re-process those records from the last committed offset (causing duplicates—requiring consumer idempotency).
     - If the consumer committed offsets *before* finishing processing, messages will be lost.

---

### 2.6 Difference between at-most-once, at-least-once, and exactly-once delivery

| Delivery Semantic | Core Guarantee | Implementation Strategy | Failure Outcome |
| :--- | :--- | :--- | :--- |
| **At-Most-Once** | Messages may be lost, but will **never be duplicated**. | Producer sends with no retries (`retries=0`). Consumer commits offsets *before* processing message payloads. | If consumer crashes mid-processing, uncompleted records are skipped on restart. |
| **At-Least-Once** *(Industry Standard)* | Messages are **never lost**, but may be delivered or processed more than once. | Producer enables retries with `acks=all`. Consumer commits offsets *after* successfully processing the message and saving state. | If consumer crashes after processing but before offset commit, messages are re-processed upon rebalance. Requires idempotent consumer handlers. |
| **Exactly-Once (EOS)** | Messages are processed **strictly once**, eliminating both data loss and duplicate side effects. | Producer enables `enable.idempotence=true` and Kafka **Transactional API** (`initTransactions`, `sendOffsetsToTransaction`). | Atomic write of processed data and committed offsets across Kafka topics. For external DBs, requires atomic Two-Phase Commit or DB-level deduplication table. |

---

### 2.7 Difference between Kafka and RabbitMQ

| Dimension | Apache Kafka | RabbitMQ |
| :--- | :--- | :--- |
| **Design Architecture** | Distributed, partitioned append-only log. Pull-based consumer model. | Traditional message broker based on AMQP. Push-based consumer model. |
| **Message Storage** | Messages persist on disk according to a retention policy (e.g., 7 days), regardless of consumption status. | Messages reside in queues (memory/disk) and are **deleted immediately** once acknowledged by a consumer. |
| **Replayability** | Natively supported. Any consumer can reset its offset and replay days of historical data. | Not supported. Once a message is ACKed and purged from a queue, it cannot be re-read. |
| **Routing Flexibility** | Topic and partition key-based routing. Basic filtering. | Highly sophisticated routing using **Exchanges** (Direct, Fanout, Topic, Headers-based matching). |
| **Throughput & Scale** | Extremely high (1,000,000+ events/sec). Leverages batching, zero-copy, and sequential disk I/O. | Moderate to high (20,000 to 100,000 msgs/sec). Queue state is CPU/memory bound. |
| **Priority Queues** | No native support for message priority within a partition. | Native support for prioritized messages in queues. |
| **Primary Use Cases** | Event streaming, telemetry, audit logs, real-time analytics, event sourcing pipelines. | Complex asynchronous task dispatching, point-to-point worker queues, RPC patterns. |
