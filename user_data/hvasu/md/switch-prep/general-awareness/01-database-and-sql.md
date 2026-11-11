# 1. Database & SQL

---

### 1.1 Difference between SQL and NoSQL

| Dimension | SQL (Relational) | NoSQL (Non-Relational) |
| :--- | :--- | :--- |
| **Data Model** | Tabular with structured rows and columns. Predefined, rigid schema enforced by DDL. | Flexible data models: Document (JSON/BSON), Key-Value, Wide-Column, Graph. Dynamic / schemaless. |
| **Query Language** | Declarative Structured Query Language (SQL) with standard joins, aggregations, and subqueries. | Database-specific query APIs (e.g., MongoDB Query Language, Cassandra CQL, Gremlin, Redis commands). |
| **Consistency Model** | Strict **ACID** (Atomicity, Consistency, Isolation, Durability) guarantees by default. | Often favors **BASE** (Basically Available, Soft state, Eventual consistency), following the CAP theorem. |
| **Scaling Mechanism** | Primarily **Vertical scaling** (scale-up: CPU, RAM, SSD). Horizontal scaling via read-replicas; sharding is complex. | Designed natively for **Horizontal scaling** (scale-out: sharding across commodity hardware clusters). |
| **Relationships** | Handles complex multi-table joins, foreign keys, and referential integrity natively. | Joins are typically avoided or un-supported; data is denormalized, embedded, or joined in application code. |
| **Examples** | PostgreSQL, MySQL, Oracle, Microsoft SQL Server. | MongoDB, Apache Cassandra, Redis, Amazon DynamoDB, Neo4j. |

**When to choose SQL:**
- Core transactional systems (fintech, banking, ledger, order processing) where ACID compliance and data integrity are non-negotiable.
- Highly structured data where entities have complex, many-to-many relationships that benefit from normalization and relational algebra.

**When to choose NoSQL:**
- High-velocity ingest and massive scale (IoT sensor telemetry, clickstreams, social feeds) requiring seamless horizontal scale-out.
- Rapidly evolving data models or polymorphic semi-structured payloads (catalogs, content management).
- Specialized access patterns (sub-millisecond key-value caching in Redis, graph traversals in Neo4j).

---

### 1.2 What are ACID properties?

ACID is a set of properties that guarantee database transactions are processed reliably in the presence of concurrent execution, software errors, or hardware failures:

1. **Atomicity ("All or Nothing"):**
   - Every transaction is treated as a single indivisible unit. Either all operations inside the transaction succeed, or the entire transaction is rolled back to its original state.
   - *How it works under the hood:* The database uses a **Write-Ahead Log (WAL)** or **Undo Log**. Before any physical data page is modified on disk, changes and reverse operations are recorded. If a crash or error occurs mid-transaction, the engine replays the undo logs to revert uncommitted modifications.

2. **Consistency ("Valid State to Valid State"):**
   - A transaction can only transition the database from one valid state to another valid state, maintaining all schema constraints, foreign keys, uniqueness, check constraints, and cascade triggers.
   - *How it works under the hood:* Enforced collaboratively by application-level invariant logic and database constraint validators before committing changes.

3. **Isolation ("Independent Execution"):**
   - The intermediate state of a transaction is invisible to other concurrent transactions until it is committed. Concurrent executions yield the same state as if they had executed serially.
   - *How it works under the hood:* Achieved via **Concurrency Control mechanisms**: **Two-Phase Locking (2PL)**, **Multi-Version Concurrency Control (MVCC)**, and configurable **Transaction Isolation Levels** (e.g., Read Committed, Repeatable Read, Serializable).

4. **Durability ("Permanent Once Committed"):**
   - Once a transaction is committed, its effects are permanent and will survive any subsequent system crash, power outage, or reboot.
   - *How it works under the hood:* Committed transaction records are flushed synchronously (or via group commit) to non-volatile storage in the **Write-Ahead Log (WAL)** / **Redo Log** before the database sends an acknowledgment back to the client. During post-crash recovery, the engine reads the redo log to re-apply committed changes that had not yet reached dirty data pages on disk.

---

### 1.3 What are database indexes and how do they work?

A database index is an auxiliary, sorted data structure that improves the speed of data retrieval operations on a database table at the cost of additional storage and write amplification (slower `INSERT`, `UPDATE`, and `DELETE` operations).

#### How it works under the hood: B+ Trees
Most relational database management systems (RDBMS) implement indexes using **B+ Trees**:
- **Balanced Multi-Way Search Tree:** All leaf nodes are located at the exact same depth ($O(\log N)$ search, insertion, and deletion complexity).
- **Internal Nodes:** Store search keys and routing pointers to child nodes, allowing large fan-out factors (often 100 to 1,000 children per page), which keeps tree height minimal (usually 3 to 4 levels for millions of records).
- **Leaf Nodes:** Store actual data or pointers to data rows. Crucially, all leaf nodes are connected in a **doubly-linked list**, enabling highly efficient $O(\log N + K)$ range queries and sequential scans (`BETWEEN`, `>`, `<`).

```
                [ 20 | 50 ]              <-- Root Node
               /     |     \
    [ 10 | 15 ]  [ 25 | 40 ]  [ 60 | 80 ]  <-- Internal Nodes
      /    \       /    \       /    \
  [Leaves linked sequentially via pointers: [10]<->[15]<->[20]<->[25]...]
```

#### Clustered vs. Non-Clustered Indexes:
- **Clustered Index:** 
  - Dictates the physical storage order of rows on disk.
  - A table can have **only one** clustered index (typically created automatically on the Primary Key).
  - The leaf nodes of a clustered index contain the actual data rows themselves.
- **Non-Clustered (Secondary) Index:**
  - A separate structure that stores the indexed column key values along with a "row locator" pointer.
  - In PostgreSQL, the row locator is a Tuple ID (Heap pointer: block number + offset). In MySQL InnoDB, the row locator is the Primary Key value (which then triggers a secondary B+ Tree lookup called a "bookmark lookup").
  - A table can maintain multiple non-clustered indexes.

---

### 1.4 What is database normalization?

Database normalization is the systematic design technique of organizing tables and attributes in a relational database to **minimize data redundancy** and **eliminate update, insertion, and deletion anomalies** while preserving data integrity.

#### The Normal Forms:
1. **First Normal Form (1NF):**
   - Each column contains only **atomic** (indivisible) values.
   - No repeating groups or arrays stored in a single field.
   - Each row is uniquely identifiable by a Primary Key.
2. **Second Normal Form (2NF):**
   - Meets 1NF requirements.
   - Eliminates **partial functional dependencies**: every non-key column must depend on the *entire* Primary Key (relevant when the primary key is composite).
3. **Third Normal Form (3NF):**
   - Meets 2NF requirements.
   - Eliminates **transitive functional dependencies**: non-key columns must depend *only* on the Primary Key, and not on other non-key columns ($X \to Y$ and $Y \to Z$ where $Z$ is non-key is decomposed).
4. **Boyce-Codd Normal Form (BCNF):**
   - An advanced, stricter version of 3NF.
   - For every functional dependency $X \to Y$, $X$ must be a **super key** (candidate key).

#### When to Denormalize:
Normalization increases table fragmentation, requiring multi-table `JOIN` operations that become CPU and memory bottlenecks at high read volumes. **Denormalization** intentionally introduces controlled redundancy (e.g., embedding user display names inside order records, maintaining pre-aggregated summary tables, or caching materialized views) to satisfy high-throughput read-heavy access patterns.

---

### 1.5 What are transaction isolation levels?

Transaction isolation levels define the degree to which changes made by one transaction are visible to other concurrent transactions, navigating the fundamental trade-off between **concurrency throughput** and **data anomalies**.

#### The Three Core Concurrency Anomalies:
1. **Dirty Read:** Transaction A reads data modified by Transaction B that has not yet been committed. If Transaction B rolls back, Transaction A operated on invalid data.
2. **Non-Repeatable Read (Fuzzy Read):** Transaction A reads a row value. Transaction B updates or deletes that row and commits. Transaction A re-reads the row and finds modified or missing values.
3. **Phantom Read:** Transaction A executes a range query (`WHERE age > 30`). Transaction B inserts new rows matching that criteria and commits. Transaction A re-executes the query and discovers "phantom" rows.

#### The ANSI SQL Isolation Levels:

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read | Mechanism Under the Hood |
| :--- | :---: | :---: | :---: | :--- |
| **Read Uncommitted** | Allowed | Allowed | Allowed | Reads data without acquiring shared locks; reads dirty pages from memory. |
| **Read Committed** *(Default in PostgreSQL, Oracle)* | **Prevented** | Allowed | Allowed | Uses MVCC; each query inside the transaction takes a snapshot of committed data at the start of that query statement. |
| **Repeatable Read** *(Default in MySQL InnoDB)* | **Prevented** | **Prevented** | Prevented in InnoDB via Next-Key locks | Snapshot is taken at the start of the *transaction*; MVCC read view is preserved throughout the transaction lifecycle. |
| **Serializable** | **Prevented** | **Prevented** | **Prevented** | Strictest isolation. Achieved via Strict Two-Phase Locking (S2PL) or Serializable Snapshot Isolation (SSI). Concurrent transactions run as if executed sequentially. |

---

### 1.6 How do you lock a row in SQL?

Row-level locking allows transactions to isolate individual rows during read-modify-write workflows, preventing concurrent workers from causing lost updates.

#### 1. Exclusive Lock (`FOR UPDATE`):
Acquires an exclusive lock on the selected rows. Other transactions cannot modify, delete, or acquire locks on these rows until the current transaction commits or rolls back:
```sql
BEGIN;
SELECT * FROM accounts 
WHERE account_id = 101 
FOR UPDATE;

-- Perform business logic & calculations
UPDATE accounts 
SET balance = balance - 200 
WHERE account_id = 101;

COMMIT;
```

#### 2. Shared Lock (`FOR SHARE`):
Acquires a shared read lock. Other transactions can read and acquire shared locks, but no transaction can update or acquire an exclusive lock until all shared locks release:
```sql
SELECT * FROM inventory 
WHERE item_id = 45 
FOR SHARE;
```

#### 3. Non-Blocking Variants:
- `NOWAIT`: Fails immediately with an error (e.g., lock timeout / serialization error) if a target row is already locked by another transaction instead of waiting.
- `SKIP LOCKED`: Skips currently locked rows and returns only available unlocked rows. This is the industry-standard primitive for high-throughput distributed worker queues implemented on relational tables:
```sql
SELECT * FROM task_queue 
WHERE status = 'PENDING' 
LIMIT 1 
FOR UPDATE SKIP LOCKED;
```

---

### 1.7 Difference between optimistic and pessimistic locking

| Dimension | Pessimistic Locking | Optimistic Locking |
| :--- | :--- | :--- |
| **Core Philosophy** | "Conflicts are frequent; block others upfront to guarantee safety." | "Conflicts are rare; proceed without blocking and validate before writing." |
| **Locking Mechanism** | Uses explicit database-level row or table locks (`SELECT ... FOR UPDATE`). | Application-level check using a version counter or timestamp column; **no database lock is held** during user think time. |
| **Concurrency Impact** | Locks hold connections and block competing transactions, leading to potential queueing and deadlocks. | High throughput and non-blocking reads; eliminates database-level lock contention. |
| **Failure Handling** | Transactions wait in line until the lock is released or a timeout fires. | If a collision is detected (row version changed), the write fails ($0$ rows affected), requiring an application retry. |
| **Best Used For** | High contention, high-value financial transactions, booking seat reservations where rollbacks are costly. | Low-to-moderate contention, long user-facing workflows (e.g., user editing a form in a web UI). |

#### Optimistic Locking Implementation Pattern:
1. Add a `version INT DEFAULT 0` column to the table.
2. Read the record: `SELECT id, balance, version FROM accounts WHERE id = 1;` (returns version = 3).
3. Update with condition:
```sql
UPDATE accounts 
SET balance = balance - 100, version = version + 1 
WHERE id = 1 AND version = 3;
```
4. Check affected rows: If affected rows = 1, success. If affected rows = 0, another process updated the record concurrently; abort or reload and retry.

---

### 1.8 What is database replication vs sharding?

| Dimension | Replication | Sharding (Horizontal Partitioning) |
| :--- | :--- | :--- |
| **Definition** | Copying the entire dataset across multiple database nodes (Primary-Replica / Multi-Primary). | Dividing a large dataset into smaller, independent subsets (shards) across multiple database instances. |
| **Primary Goal** | **High Availability**, fault tolerance, disaster recovery, and scaling **read throughput**. | Scaling **write throughput** and **storage capacity** beyond the limits of a single machine. |
| **Data Distribution** | Every replica holds a full (or near-full) duplicate copy of the database. | Each shard contains a distinct partition of the data based on a **Shard Key** (e.g., `hash(user_id) % num_shards`). |
| **Write Scaling** | Does **not** scale writes in primary-replica topologies; all writes still funnel through the single primary node. | Scales writes linearly by distributing write traffic across independent shard primaries. |
| **Architectural Complexity** | Low to moderate. Handled natively by database engines (Postgres streaming replication, MySQL binlog replication). | High. Requires shard routing logic, complex distributed transactions (Two-Phase Commit / Saga), and re-sharding strategies. |

---

### 1.9 How would you optimize a slow SQL query?

A systematic 6-step engineering framework to identify and resolve query performance bottlenecks:

1. **Profile and Measure with Execution Plans:**
   - Execute `EXPLAIN (ANALYZE, BUFFERS)` in PostgreSQL or `EXPLAIN FORMAT=JSON` in MySQL.
   - Inspect the actual execution cost: Look for `Seq Scan` (Table Scan) on large tables, excessive disk spills (`Sort Method: external merge Disk`), high buffer reads, and mismatched estimated vs. actual row counts (indicating stale optimizer statistics).

2. **Index Optimization & Coverage:**
   - **Target Filter Columns:** Create indexes on columns present in `WHERE`, `JOIN`, and `ORDER BY` clauses.
   - **Composite Index Order:** Adhere to the *Leftmost Prefix Rule*—order columns in composite indexes starting with high-cardinality equality columns, followed by range filter columns.
   - **Covering Index:** Include queried columns in an `INDEX ... INCLUDE (...)` clause to achieve **Index Only Scans**, eliminating secondary heap lookups completely.
   - **Avoid Index Invalidation:** Avoid wrapping indexed columns in functions (e.g., `WHERE DATE(created_at) = '2026-01-01'` ignores an index on `created_at`; rewrite to range `WHERE created_at >= '2026-01-01' AND created_at < '2026-01-02'`). Avoid leading wildcards (`LIKE '%abc'`).

3. **Query Refactoring:**
   - Avoid `SELECT *`: Retrieve only explicitly required columns to reduce network serialization, memory allocation, and enable covering indexes.
   - Eliminate Correlated Subqueries: Rewrite nested row-by-row subqueries using set-based `JOIN` operations or Common Table Expressions (CTEs).
   - Use `LIMIT` and pagination properly: Avoid high-offset pagination (`OFFSET 1000000`); replace with keyset pagination (`WHERE id > last_seen_id LIMIT 20`).

4. **Statistics & Maintenance:**
   - Run `ANALYZE table_name;` to update cost-based query optimizer (CBO) statistics so the database engine accurately chooses index scans over table scans.

5. **Schema and Data Tier Adjustments:**
   - Partition large tables horizontally by range (e.g., time-series partitioning by month) to enable **Partition Pruning**.
   - Denormalize or maintain materialized views for heavy, repetitive analytical aggregations (`SUM`, `COUNT`).

6. **Connection & Resource Tuning:**
   - Verify connection pool sizing to eliminate connection establishment overhead.
   - Check engine memory allocations (e.g., increasing `work_mem` in PostgreSQL prevents queries from spilling sort/hash operations to disk).
