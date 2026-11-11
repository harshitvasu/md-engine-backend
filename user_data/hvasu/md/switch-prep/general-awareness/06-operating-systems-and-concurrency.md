# 6. Operating Systems & Concurrency

---

### 6.1 Process vs thread

| Dimension | Process | Thread |
| :--- | :--- | :--- |
| **Definition** | An independent, executing instance of a computer program managed by the OS. | The smallest unit of CPU execution scheduled by the OS scheduler (a lightweight process). |
| **Memory & Address Space** | Has its own **isolated virtual address space** (Text, Data, Heap, Stack). Cannot access another process's memory without explicit IPC. | **Shares the address space, Heap, code segment, and open files** of its parent process. Maintains only its private Stack and Program Counter (PC). |
| **Context Switching Overhead** | **High:** Requires invalidating the Translation Lookaside Buffer (TLB), switching memory page tables, and flushing CPU caches. | **Low:** Memory page tables and TLB remain valid since the virtual address space is shared. |
| **Creation Cost** | Expensive in time and memory (invokes `fork()` / `exec()`). | Inexpensive and fast; consumes minimal memory per thread stack. |
| **Fault Isolation** | High: If one process crashes (e.g., segmentation fault), other processes continue running uninterrupted. | Low: An unhandled memory fault or exception in one thread can crash the entire host process. |
| **Communication Mechanism** | Inter-Process Communication (IPC): Sockets, Pipes, Shared Memory, Message Queues. | Direct memory reads/writes to shared variables on the Heap (requires synchronization primitives). |

---

### 6.2 Concurrency vs parallelism

Rob Pike neatly summarized: *"Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."*

```
Concurrency (Single Core - Interleaved):
Task A: [==]     [==]     [==]
Task B:     [==]     [==]     [==]

Parallelism (Multi-Core - Simultaneous):
Core 1 (Task A): [===================]
Core 2 (Task B): [===================]
```

- **Concurrency (Structure):**
  - The architectural composition of independently executing processes or threads.
  - Can be executed on a **single CPU core** by interleaving execution time-slices via the operating system scheduler (time-division multiplexing).
  - Focuses on managing multiple I/O or computational tasks efficiently without blocking.
- **Parallelism (Execution):**
  - The physical, simultaneous execution of multiple computational tasks at the exact same instant across **multiple CPU cores** or physical processors.
  - Requires hardware support (multi-core architecture or distributed cluster).
  - Focuses on speeding up CPU-bound computational tasks (e.g., matrix multiplication, image processing) by dividing them into chunks.

---

### 6.3 What is a deadlock?

A deadlock is a permanent blocking condition in which two or more concurrent threads or processes are unable to proceed because each is waiting for a resource that is currently held by another thread in the set.

#### The 4 Coffman Conditions (Must all hold simultaneously for a deadlock to occur):
1. **Mutual Exclusion:** At least one resource must be held in a non-shareable mode (only one thread can hold it at any given time).
2. **Hold and Wait:** A thread is currently holding at least one resource and is actively waiting to acquire additional resources held by other threads.
3. **No Preemption:** Resources cannot be forcibly revoked from a holding thread; they can only be released voluntarily after the thread finishes its task.
4. **Circular Wait:** A closed chain of threads exists such that Thread $T_1$ waits for a resource held by $T_2$, $T_2$ waits for $T_3$, and $T_n$ waits for $T_1$.

#### How to Prevent Deadlocks:
- **Enforce Global Lock Ordering:** Always acquire multiple locks in the exact same predefined canonical order across the entire codebase (e.g., always lock account with lower ID first: `lock(min(id1, id2))`). This mathematically breaks the *Circular Wait* condition.
- **Use Timed Locks:** Use `tryLock(timeout)` instead of indefinite blocking locks. If a lock cannot be acquired within the time window, release all acquired locks and retry.

---

### 6.4 What is a race condition?

A race condition is an undesirable anomaly occurring in concurrent software when the correctness, output, or final state of a program depends on the uncontrollable timing, scheduling, or interleaving of multiple concurrent threads.

#### The "Check-Then-Act" & Read-Modify-Write Flaw:
Consider a simple shared counter increment: `count++`. At the assembly level, this translates into three distinct CPU instructions:
1. `LOAD count into Register`
2. `INCREMENT Register`
3. `STORE Register into count`

If Thread A and Thread B execute these steps concurrently without synchronization:
- Both threads read `count = 5`.
- Both increment their local registers to `6`.
- Both write `6` back to memory.
- Two increments took place, but the final value is `6` instead of `7` (Lost Update).

#### Prevention:
- **Mutual Exclusion:** Guard the critical section using synchronized blocks or Mutex locks.
- **Atomic Variables:** Use hardware-supported atomic primitives (e.g., `AtomicInteger` in Java) that rely on CPU-level **CAS (Compare-And-Swap)** instructions (`LOCK CMPXCHG`).

---

### 6.5 Mutex vs semaphore

| Dimension | Mutex (Mutual Exclusion Lock) | Semaphore |
| :--- | :--- | :--- |
| **Core Concept** | A **locking mechanism** designed to protect a shared critical section so only one thread executes it. | A **signaling mechanism** that manages access to a finite pool of identical resources. |
| **Ownership Semantics** | **Has Ownership:** The specific thread that acquired/locked the mutex **must be the one to unlock it**. | **No Ownership:** Any thread can increment/signal the semaphore counter (`release()` / `V()`), even if another thread acquired it (`acquire()` / `P()`). |
| **Capacity / State** | Binary state: Locked (1) or Unlocked (0). | Holds an integer value representing available resource permits: **Counting Semaphore** ($N \ge 0$) or **Binary Semaphore** ($0$ or $1$). |
| **Primary Use Cases** | Protecting shared in-memory data structures (e.g., linked list, account balance). | Regulating connection pool capacity, producer-consumer coordination, thread signaling. |

---

### 6.6 Stack vs heap memory

| Dimension | Stack Memory | Heap Memory |
| :--- | :--- | :--- |
| **Allocation Mechanism** | Static, contiguous memory allocation managed automatically by the CPU using a Stack Pointer register. | Dynamic memory allocation managed at runtime by application code or runtime allocators/garbage collectors. |
| **Stored Contents** | Method call frames, primitive local variables, and reference pointers to heap objects. | Objects, class instances, dynamically sized arrays, collections. |
| **Access Speed** | **Extremely Fast:** Allocation and deallocation require adjusting a single CPU pointer (LIFO order). | **Slower:** Involves searching free lists, memory fragmentation management, and cache misses. |
| **Scope & Thread Safety** | **Thread-Private:** Each thread allocates its own independent execution stack. Completely thread-safe. | **Globally Shared:** Shared across all threads within the process. Requires synchronization primitives to avoid races. |
| **Error Modes** | Throws `StackOverflowError` (e.g., infinite recursion or excessive stack frame depth). | Throws `OutOfMemoryError` (heap memory exhausted due to memory leaks). |

---

### 6.7 What is garbage collection?

Garbage Collection (GC) is an automated runtime memory management process (found in JVM, V8, Go, .NET) that detects and reclaims heap memory occupied by objects that are no longer accessible or referenced by any active path of the running application.

#### How It Works: Tracing Reachability & GC Roots:
1. **GC Roots:** A set of fundamental reference pointers known to be alive:
   - Local variables and parameters currently on active thread execution stacks.
   - Static/class variables.
   - JNI (Java Native Interface) global references.
2. **Mark Phase:** The collector traverses object reference graphs starting from the GC Roots. Every visited object is marked as "live".
3. **Sweep / Compact Phase:** Objects not marked as live are unreachable ("garbage") and their memory is reclaimed. Compact algorithms shift live objects together to eliminate external heap fragmentation.

#### The Generational Hypothesis:
Empirical data shows that **most allocated objects die very young** (e.g., temporary variables in a method):
- **Young Generation (Eden + Survivor Spaces):** New objects are allocated in Eden. Minor GCs run frequently here, scanning only a fraction of the heap quickly. Surviving objects age and are promoted.
- **Old (Tenured) Generation:** Holds long-lived objects (e.g., caches, singletons). Major / Full GCs scan this region less frequently to minimize CPU pause times ("Stop-The-World" latency). Modern collectors (G1, ZGC) perform concurrent marking and compaction to achieve sub-millisecond pauses.
