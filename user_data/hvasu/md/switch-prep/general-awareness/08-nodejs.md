# 8. Node.js

---

### 8.1 How does the Node.js event loop work?

Node.js executes JavaScript on a single thread using an **event-driven, non-blocking I/O model** powered under the hood by **libuv**. The event loop continuously cycles through distinct execution phases in a standardized sequence:

```
   ┌───────────────────────────┐
┌─>│          timers           │  setTimeout(), setInterval()
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  I/O callbacks deferred from previous loop
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  Internal libuv coordination
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │  Retrieve I/O events (epoll/kqueue); execute I/O callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │  setImmediate() callbacks
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  socket.on('close', ...)
   └───────────────────────────┘
```

#### The 6 Event Loop Phases:
1. **Timers:** Executes callbacks scheduled by expired `setTimeout()` and `setInterval()` threshold timers.
2. **Pending Callbacks:** Executes system-level I/O callbacks deferred from the prior iteration (e.g., TCP socket errors like `ECONNREFUSED`).
3. **Idle, Prepare:** Internal libuv housekeeping routines.
4. **Poll:** Calculates how long to block and wait for I/O; processes incoming network data, file read completions, and new connection sockets.
5. **Check:** Executes callbacks explicitly scheduled via `setImmediate()`.
6. **Close Callbacks:** Executes resource teardown events (e.g., `socket.on('close')`).

#### The Immediate Inter-Phase Microtask Queues:
Between *every single step* of the event loop, Node drains two microtask queues completely before moving on:
1. **`process.nextTick` Queue:** Highest priority; runs immediately after the current operation finishes.
2. **Promise Microtask Queue:** Executes resolved `Promise.then()`, `catch()`, `finally()`, and `queueMicrotask()` callbacks.

---

### 8.2 What is libuv?

`libuv` is a high-performance, multi-platform C library originally built for Node.js (and now used by Julia, Luvit, and others) that provides the engine's core asynchronous I/O capabilities.

#### Key Functions of libuv:
1. **Operating System Non-Blocking I/O Abstraction:**
   - Provides a unified API wrapping platform-specific event multiplexing primitives: **`epoll`** on Linux, **`kqueue`** on macOS/FreeBSD, and **`IOCP` (I/O Completion Ports)** on Windows.
2. **The Event Loop Engine:**
   - Implements the timer heaps, socket poller, and event dispatch loop that drives Node.js execution.
3. **The Worker Thread Pool:**
   - Maintains a background thread pool (default size: **4 threads**, expandable up to 1024 via the `UV_THREADPOOL_SIZE` environment variable).
   - Handles operations that OS kernels cannot execute purely asynchronously:
     - **File System Operations:** `fs.readFile`, `fs.writeFile`, `fs.stat`.
     - **DNS Lookups:** `dns.lookup()` (which calls the blocking C-library `getaddrinfo`).
     - **CPU-Intensive Crypto:** `crypto.pbkdf2()`, `crypto.scrypt()`, `crypto.randomBytes()`.
     - **Compression:** `zlib` compression streams.
   - *(Note: Network socket I/O does NOT use the thread pool; it uses OS non-blocking network sockets directly).*

---

### 8.3 Promise vs callback

| Dimension | Callback (Error-First Callback) | Promise / Async-Await |
| :--- | :--- | :--- |
| **Concept** | A function passed as an argument to another function, to be invoked once an asynchronous task completes. | An object representing the eventual state (`Pending`, `Fulfilled`, `Rejected`) and result of an async task. |
| **Code Structure** | Leads to deeply nested, unreadable code: **"Callback Hell" / "Pyramid of Doom"**. | Clean, linear chaining via `.then()` or synchronous-looking syntax via `async/await`. |
| **Error Handling** | Fragmented and repetitive: Requires manual error propagation (`if (err) return callback(err);`) at every level. | Centralized and robust: Caught automatically using standard `try/catch` blocks or `.catch()` handlers. |
| **Control Flow & Composition** | Extremely tedious to coordinate multiple parallel or sequential async operations. | Native composition combinators: `Promise.all()`, `Promise.allSettled()`, `Promise.race()`, `Promise.any()`. |
| **Execution Timing** | Invoked when the caller executes it (can be synchronous or asynchronous). | Always executed asynchronously in the **Microtask queue**, ensuring predictable timing. |

---

### 8.4 Microtasks vs macrotasks

In the Node.js runtime environment, asynchronous tasks are segregated into two distinct queues with vastly different execution priorities:

| Dimension | Microtasks | Macrotasks (Tasks) |
| :--- | :--- | :--- |
| **Sources** | `process.nextTick()`, `Promise.then()`, `Promise.catch()`, `queueMicrotask()`. | `setTimeout()`, `setInterval()`, `setImmediate()`, I/O callbacks, OS socket events. |
| **Host Environment** | Managed by the V8 Engine and Node.js microtask checkpoint runner. | Managed by the distinct phases of the **libuv Event Loop**. |
| **Execution Priority** | **Highest Priority:** Drained immediately after the currently running JS script finishes, and after *every single callback* in the event loop. | Executed one-by-one as the event loop transitions through its corresponding phases. |
| **Starvation Risk** | **High:** Recursively queuing microtasks (e.g., an infinite `process.nextTick` loop) will completely starve the event loop, freezing all I/O and timers. | None: The event loop visits macrotask phases sequentially without getting stuck in a single phase indefinitely. |

```
Execution Order Flow:
Current Synchronous JS Code
       │
       ▼
Drain all process.nextTick callbacks
       │
       ▼
Drain all Promise microtasks
       │
       ▼
Execute ONE Macrotask (e.g., from Timer or Poll phase)
       │
       ▼
Drain all process.nextTick callbacks (again)
       │
       ▼
Drain all Promise microtasks (again)
```

---

### 8.5 How does Node.js handle concurrent requests?

Node.js achieves high concurrency on a single JavaScript execution thread by adopting a **Single-Threaded Event Loop with Non-Blocking I/O Multiplexing**:

```
[Concurrent HTTP Clients] (10,000+ requests)
            │
            ▼
┌────────────────────────────────────────────────────────┐
│  Node.js Main Thread (Event Loop)                       │
│  - Receives request                                    │
│  - Registers socket with OS kernel (epoll/kqueue)      │
│  - Does NOT wait for response                          │
│  - Immediately accepts next incoming request           │
└────────────┬─────────────────────────────┬─────────────┘
             │ (Async Network I/O)         │ (Blocking Task / File I/O)
             ▼                             ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│ OS Kernel (epoll/kqueue)  │ │ libuv Worker Thread Pool │
│ - Monitors DB / Sockets   │ │ - File system, Crypto    │
│ - Fires event when ready  │ │ - Returns result when done│
└────────────┬──────────────┘ └────────────┬─────────────┘
             │                             │
             └──────────────┬──────────────┘
                            ▼
              Callback pushed to Poll Queue
                            │
                            ▼
      Main Thread executes callback & sends response
```

1. **Non-Blocking Registration:** When an incoming HTTP request or database query begins, Node.js does not block the CPU thread waiting for network packets. Instead, it delegates the socket descriptor to the OS kernel via libuv (`epoll_ctl`).
2. **Instant Event Loop Turnaround:** The single main thread immediately moves on to process other incoming client connections, rendering request handling non-blocking.
3. **Kernel Event Notification:** When the database returns bytes or a client uploads data, the OS kernel signals libuv. Libuv places the corresponding callback into the event loop's Poll phase queue.
4. **Callback Dispatch:** The event loop executes the callback, serializes the response, and flushes it back to the client socket.

---

### 8.6 What happens when CPU-intensive work runs on the main thread?

Because Node.js executes JavaScript on a **single execution thread**, running CPU-intensive operations (such as calculating cryptographic hashes, parsing 200MB JSON strings, video compression, or tight mathematical loops) results in **Event Loop Starvation / Blocking**:

#### Direct Production Consequences:
- **Total Latency Spike:** The event loop is physically frozen inside the CPU-bound function. It cannot process incoming HTTP connections, cannot fire timers, and cannot read database callbacks.
- **Cascading Connection Timeouts:** Load balancers (e.g., AWS ALB, Nginx) flag the instance as unhealthy because health-check endpoints (`/healthz`) stop responding, triggering cascading restarts and dropouts.

#### How to Solve CPU Bottlenecks in Node.js:
1. **Worker Threads (`worker_threads` module):**
   - Offload heavy computation to dedicated OS worker threads that run in parallel on separate CPU cores while sharing memory via `SharedArrayBuffer`:
   ```javascript
   const { Worker } = require('worker_threads');
   const worker = new Worker('./heavy-calculation.js', { workerData: data });
   ```
2. **Child Processes (`child_process.fork()`):**
   - Spawn a separate isolated Node.js child process to execute the heavy task and communicate results via IPC messages.
3. **Task Splitting / Chunking:**
   - Break large loops into smaller slices interleaved with `setImmediate()`, allowing the event loop to breathe and process I/O between chunks.
4. **External Service Offloading:**
   - Architecture best practice: Delegate heavy computational workloads (PDF rendering, image transcoding) to an external worker service written in Go, Java, or Rust via Kafka or RabbitMQ queues.
