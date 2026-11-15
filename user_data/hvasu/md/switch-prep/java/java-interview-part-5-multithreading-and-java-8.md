# 5. Multithreading & Concurrency

## 29. Process vs thread?

### The Architectural Distinction

* **Process:** An independently executing instance of a computer program with its own **dedicated, isolated address space** managed by the Operating System.
* **Thread:** A **lightweight unit of execution** that runs *inside* the context of a process. A single process can spawn multiple concurrent threads that share its memory space.

```
+--------------------------------------------------------------------+
| Process (Isolated Address Space, PID, Heap, File Handles)          |
|                                                                    |
|  Shared Heap Memory & Metaspace / Code Segment                     |
|                                                                    |
|  +--------------------+  +--------------------+  +---------------+  |
|  | Thread 1           |  | Thread 2           |  | Thread 3      |  |
|  | - Stack Frame      |  | - Stack Frame      |  | - Stack Frame |  |
|  | - Registers / PC   |  | - Registers / PC   |  | - Registers/PC|  |
|  +--------------------+  +--------------------+  +---------------+  |
+--------------------------------------------------------------------+
```

### Detailed Comparison Table

| Attribute | Process | Thread |
| :--- | :--- | :--- |
| **Memory Isolation** | **Completely isolated**; one process cannot access another's memory | **Shared memory**; threads share Heap, Metaspace, and File Descriptors |
| **Creation Cost** | **Heavyweight**; allocates full OS page tables and descriptors | **Lightweight**; allocates only private call stack (~1MB default) |
| **Context Switching** | **Slow**; invalidates CPU TLB caches and swaps memory pages | **Fast**; retains shared memory mappings; swaps only registers and stack |
| **Communication** | Complex **Inter-Process Communication (IPC)** (Pipes, Sockets) | Effortless via **Shared Objects** (requires synchronization) |
| **Crash Impact** | If one process crashes, other processes remain unaffected | If an uncaught error corrupts shared heap state, the entire process can fail |

---

## 30. Thread vs Runnable?

### Two Ways to Create Threads in Java

Java allows defining concurrent execution either by subclassing `java.lang.Thread` or by implementing the `java.lang.Runnable` functional interface.

```
       [Thread Class]                      [@FunctionalInterface Runnable]
       - Implements Runnable               - Defines void run()
       - Couples execution & task          - Decouples task from execution vehicle
```

### Why Implementing `Runnable` is Industry Standard

1. **Single Inheritance Rule:** In Java, a class can extend only one superclass. If you `extend Thread`, your class cannot inherit from any other business domain class (e.g., `extends BaseService`).
2. **Separation of Concerns:** `Runnable` represents the **task / unit of work**, while `Thread` represents the **worker / execution mechanism**. Decoupling them allows running the same task across various execution frameworks (e.g., thread pools).
3. **Thread Pool Integration:** Modern Java uses the `ExecutorService` framework (`ThreadPoolExecutor`, `ForkJoinPool`, `CompletableFuture`). Thread pools manage and reuse worker threads and accept `Runnable` or `Callable` tasks; they cannot execute arbitrary `Thread` subclasses cleanly.
4. **Lambda Friendly:** Because `Runnable` is a functional interface (having only `void run()`), it can be written concisely as a lambda expression.

### Code Demonstration

```java
import java.util.concurrent.*;

public class ThreadVsRunnableDemo {

    // Approach 1: Extending Thread (Discouraged)
    static class WorkerThread extends Thread {
        @Override
        public void run() {
            System.out.println("Executing via Thread subclass: " + Thread.currentThread().getName());
        }
    }

    // Approach 2: Implementing Runnable (Recommended)
    static class TaskRunnable implements Runnable {
        @Override
        public void run() {
            System.out.println("Executing via Runnable interface: " + Thread.currentThread().getName());
        }
    }

    public static void main(String[] args) {
        // Running Thread subclass
        WorkerThread worker = new WorkerThread();
        worker.start();

        // Running Runnable via Thread
        Thread threadFromRunnable = new Thread(new TaskRunnable());
        threadFromRunnable.start();

        // Modern Best Practice: Runnable + ExecutorService + Lambda
        ExecutorService executor = Executors.newFixedThreadPool(2);
        executor.submit(() -> {
            System.out.println("Executing clean lambda task via ExecutorService pool");
        });
        executor.shutdown();
    }
}
```

---

## 31. What is synchronization?

### The Core Concept: Mutual Exclusion & Memory Visibility

In a concurrent Java program, multiple threads accessing shared mutable state without coordination will interleave unpredictably, corrupting data.

**Synchronization** provides two essential guarantees:
1. **Mutual Exclusion (Mutex):** Ensures that only one thread can execute a critical section of code protected by a lock at any given instant.
2. **Memory Visibility (JMM Happens-Before Guarantee):**
   * When a thread enters a synchronized block, it invalidates its local CPU cache and reads the latest state from main memory.
   * When a thread exits a synchronized block, all modifications made inside are flushed back to main memory, ensuring immediate visibility to any other thread that subsequently acquires the lock.

### The Intrinsic Lock (Monitor Lock)

Every object in Java has an associated **Intrinsic Monitor Lock**:
* **Synchronized Instance Method:** Locks on the current instance (`this`).
* **Synchronized Static Method:** Locks on the class object (`ClassName.class`).
* **Synchronized Statement Block:** Locks on any designated explicit object monitor (`synchronized(lockObject)`).

```java
public class SynchronizationDemo {
    private int counter = 0;
    private final Object customLock = new Object();

    // 1. Synchronized instance method (locks on 'this')
    public synchronized void incrementMethod() {
        counter++;
    }

    // 2. Synchronized block (Locks ONLY on fine-grained custom monitor)
    // PREFERRED: Minimizes lock contention by keeping critical section small
    public void incrementBlock() {
        // Pre-processing...
        synchronized (customLock) {
            counter++; // Critical section protected
        }
        // Post-processing...
    }

    // 3. Synchronized static method (locks on ClassName.class)
    private static int globalCounter = 0;
    public static synchronized void incrementStatic() {
        globalCounter++;
    }
}
```

> **Best Practice:** Prefer fine-grained synchronized blocks over synchronizing entire methods. Synchronizing an entire method keeps locks held during expensive I/O or computations, destroying concurrency throughput.

---

## 32. What is a race condition?

### Definition

A **race condition** is a concurrency defect that occurs when the correctness of a program depends on the relative timing or non-deterministic interleaving of multiple concurrent threads.

### Common Patterns of Race Conditions

1. **Read-Modify-Write (e.g., `count++`):**
   Although `count++` appears to be a single operation in Java source code, at the JVM bytecode level it consists of **three distinct operations**:
   1. `GETFIELD` (read current count from memory into CPU register)
   2. `IADD` (increment value in CPU register)
   3. `PUTFIELD` (write incremented value back to heap memory)
   If Thread A and Thread B execute concurrently, both can read value `5`, increment to `6`, and write back `6`. Two increments occurred, but the counter only advanced by 1!

2. **Check-Then-Act (e.g., Lazy Initialization):**
   ```java
   if (instance == null) {         // Check
       instance = new Singleton(); // Act
   }
   ```
   If two threads check simultaneously when `instance == null`, both instantiate objects, creating multiple instances and violating the singleton guarantee.

### Code Demonstration: Race Condition & 3 Ways to Fix It

```java
import java.util.concurrent.atomic.AtomicInteger;

public class RaceConditionDemo {

    // BROKEN: Vulnerable to race condition
    static class BrokenCounter {
        int count = 0;
        public void increment() { count++; } // Non-atomic
    }

    // FIX 1: Synchronized method
    static class SynchronizedCounter {
        int count = 0;
        public synchronized void increment() { count++; }
    }

    // FIX 2: AtomicInteger (Lock-Free Hardware CAS - Fastest!)
    static class AtomicCounter {
        AtomicInteger count = new AtomicInteger(0);
        public void increment() { count.incrementAndGet(); }
    }

    public static void main(String[] args) throws InterruptedException {
        BrokenCounter broken = new BrokenCounter();
        AtomicCounter atomic = new AtomicCounter();

        int threadCount = 1000;
        Thread[] threads = new Thread[threadCount];

        for (int i = 0; i < threadCount; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 1000; j++) {
                    broken.increment();
                    atomic.increment();
                }
            });
            threads[i].start();
        }

        for (Thread t : threads) t.join();

        System.out.println("Expected count: 1,000,000");
        System.out.println("Broken count:   " + broken.count); // Frequently ~930,000 (Lost updates!)
        System.out.println("Atomic count:   " + atomic.count.get()); // Exactly 1,000,000
    }
}
```

---

## 33. What is deadlock, and how do you prevent it?

### Definition

A **deadlock** is a state in multithreaded programming where two or more threads are permanently blocked, each holding a lock that the other thread requires, and waiting for the other thread to release it.

```
Thread 1 holds [Lock A] -------------> Waiting for [Lock B]
                                          |
Thread 2 holds [Lock B] -------------> Waiting for [Lock A]
```

### Coffman's Four Necessary Conditions for Deadlock

A deadlock can occur **only if all four** of the following conditions hold simultaneously:
1. **Mutual Exclusion:** At least one resource must be held in a non-shareable mode.
2. **Hold and Wait:** A thread holding a resource can request additional resources without releasing its current ones.
3. **No Preemption:** Resources cannot be forcibly revoked from a thread; they must be released voluntarily.
4. **Circular Wait:** A closed chain of threads exists such that each thread holds at least one resource needed by the next thread.

### Deadlock Code Example

```java
public class DeadlockDemo {
    private static final Object LockA = new Object();
    private static final Object LockB = new Object();

    public static void main(String[] args) {
        // Thread 1 locks LockA, then needs LockB
        Thread t1 = new Thread(() -> {
            synchronized (LockA) {
                System.out.println("Thread 1: Holding LockA...");
                try { Thread.sleep(50); } catch (InterruptedException ignored) {}
                System.out.println("Thread 1: Waiting for LockB...");
                synchronized (LockB) {
                    System.out.println("Thread 1: Acquired LockB!");
                }
            }
        });

        // Thread 2 locks LockB, then needs LockA
        Thread t2 = new Thread(() -> {
            synchronized (LockB) {
                System.out.println("Thread 2: Holding LockB...");
                try { Thread.sleep(50); } catch (InterruptedException ignored) {}
                System.out.println("Thread 2: Waiting for LockA...");
                synchronized (LockA) {
                    System.out.println("Thread 2: Acquired LockA!");
                }
            }
        });

        t1.start();
        t2.start();
        // PROGRAM HANGS INDEFINITELY IN DEADLOCK!
    }
}
```

### Deadlock Prevention Techniques

1. **Strict Lock Ordering (Breaks Circular Wait - Most Common):**
   Always acquire multiple locks in a fixed, globally consistent order across all threads (e.g., sort locks alphabetically or by object ID).
2. **Lock Timeouts (Breaks Hold and Wait):**
   Use `java.util.concurrent.locks.ReentrantLock` with `tryLock(long timeout, TimeUnit unit)`. If a thread cannot acquire the second lock within the timeout, it releases all held locks, backs off, and retries.
3. **Deadlock Detection:** Use JVM diagnostic tools (`jcmd <pid> Thread.print`, `jstack`, or `ThreadMXBean.findDeadlockedThreads()`) to detect deadlocks in running production systems.

```java
// FIX: Enforcing strict global lock ordering (LockA always before LockB)
public void safeMethod() {
    synchronized (LockA) {
        synchronized (LockB) {
            // Safe execution; circular wait is eliminated!
        }
    }
}
```

---

## 34. sleep() vs wait()?

### Architectural Differences

While both methods cause the executing thread to pause, they belong to different classes and serve distinct synchronization purposes:

* **`Thread.sleep(millis)` (`java.lang.Thread`):** Pauses execution for a specified duration. Crucially, **it DOES NOT release any held monitor locks** while sleeping.
* **`Object.wait()` (`java.lang.Object`):** Used for **inter-thread signaling and coordination**. The calling thread **releases the monitor lock** on that object, allowing other threads to acquire it, and suspends until another thread calls `notify()` or `notifyAll()`.

### Detailed Comparison Table

| Attribute | `Thread.sleep()` | `Object.wait()` |
| :--- | :--- | :--- |
| **Origin** | Static method on `java.lang.Thread` | Instance method on `java.lang.Object` |
| **Lock Handling** | **Retains all monitor locks** while sleeping | **Releases the monitor lock** of the target object |
| **Context** | Can be called from any block of code | **MUST be called inside a `synchronized` block** on that object |
| **Wake-up Trigger** | Timeout elapses or `interrupt()` called | `notify()`, `notifyAll()`, timeout, or spurious wakeup |
| **Primary Purpose** | Polling intervals, rate limiting, pauses | Inter-thread signaling (e.g., Producer-Consumer) |

### Why `wait()` Must ALWAYS Be in a `while` Loop (Never `if`)

Due to **Spurious Wakeups** (the OS or JVM waking up a waiting thread without an explicit notification), the condition being waited upon must always be re-evaluated inside a `while` loop:

```java
// CORRECT PATTERN
synchronized (lock) {
    while (!condition) {
        lock.wait(); // Re-checks condition upon waking up
    }
    // Perform action
}
```

### Classic Producer-Consumer Code Example

```java
import java.util.LinkedList;
import java.util.Queue;

public class ProducerConsumerDemo {
    private static final int CAPACITY = 2;
    private static final Queue<Integer> buffer = new LinkedList<>();
    private static final Object lock = new Object();

    static void produce(int value) throws InterruptedException {
        synchronized (lock) {
            // ALWAYS use while loop to guard wait()
            while (buffer.size() == CAPACITY) {
                System.out.println("Buffer full. Producer waiting...");
                lock.wait(); // Releases lock, sleeps until consumer notifies
            }
            buffer.add(value);
            System.out.println("Produced: " + value);
            lock.notifyAll(); // Signal waiting consumers
        }
    }

    static void consume() throws InterruptedException {
        synchronized (lock) {
            while (buffer.isEmpty()) {
                System.out.println("Buffer empty. Consumer waiting...");
                lock.wait(); // Releases lock, sleeps until producer notifies
            }
            int value = buffer.poll();
            System.out.println("Consumed: " + value);
            lock.notifyAll(); // Signal waiting producers
        }
    }

    public static void main(String[] args) {
        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 4; i++) {
                    produce(i);
                    Thread.sleep(100); // Pauses WITHOUT releasing lock
                }
            } catch (InterruptedException ignored) {}
        });

        Thread consumer = new Thread(() -> {
            try {
                for (int i = 1; i <= 4; i++) {
                    consume();
                    Thread.sleep(200);
                }
            } catch (InterruptedException ignored) {}
        });

        producer.start();
        consumer.start();
    }
}
```

---

## 35. What is the volatile keyword?

### The Java Memory Model (JMM) Context

Modern CPU architectures feature multi-level CPU caches (L1, L2, L3). When a thread reads or modifies a variable, it often works with a local cached copy in its CPU core registers rather than accessing main memory (RAM) directly.

Without synchronization, changes written by Thread 1 running on Core 1 may remain in Core 1's local cache and remain completely invisible to Thread 2 running on Core 2.

```
Core 1 (Thread 1)             Core 2 (Thread 2)
[L1/L2 Cache: flag=true]     [L1/L2 Cache: flag=false (Stale!)]
             \                 /
              \               /
            [Main Memory (RAM)]
            (Without volatile, changes linger in CPU caches)
```

### The Two Guarantees of `volatile`

1. **Memory Visibility:**
   * Every **write** to a `volatile` variable is immediately written through directly to main memory (RAM).
   * Every **read** of a `volatile` variable bypasses CPU caches and fetches the latest value directly from main memory.
   * Changes made by one thread are instantly visible to all other threads across all CPU cores.
2. **Instruction Reordering Prevention (Happens-Before Relationship):**
   * Compilers and out-of-order CPU execution engines routinely reorder instructions to optimize throughput.
   * Declaring a field `volatile` inserts hardware **Memory Barriers** (Fences):
     * Code written *before* a volatile write cannot be reordered to occur *after* the write.
     * Code written *after* a volatile read cannot be reordered to occur *before* the read.

### What `volatile` Does NOT Guarantee: ATOMICITY!

> **CRITICAL RULE:** `volatile` guarantees **visibility**, but it does **NOT guarantee atomicity**!

Operations like `volatileCount++` are compound read-modify-write actions. If two threads increment a `volatile int count` concurrently, race conditions still occur! For atomicity, use `AtomicInteger`, `ReentrantLock`, or `synchronized`.

### Ideal Use Case: The Shutdown / Status Flag

```java
public class VolatileShutdownDemo {

    // volatile ensures immediate visibility across threads
    private static volatile boolean running = true;

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            long count = 0;
            // Without 'volatile', the JIT compiler can optimize this loop to:
            // if (running) while(true) count++; (INFINITE LOOP!)
            while (running) {
                count++;
            }
            System.out.println("Worker thread terminated cleanly. Count: " + count);
        });

        worker.start();
        Thread.sleep(100);

        System.out.println("Main thread signaling shutdown...");
        running = false; // Immediately visible to worker thread!
        worker.join();
    }
}
```

### Classic Use Case: Double-Checked Locking in Singleton

```java
public class SafeDoubleCheckedSingleton {
    // 'volatile' is mandatory to prevent instruction reordering!
    // Without volatile, a thread might see a partially constructed instance
    // because object allocation can be reordered: allocate -> assign reference -> invoke constructor.
    private static volatile SafeDoubleCheckedSingleton instance;

    private SafeDoubleCheckedSingleton() {}

    public static SafeDoubleCheckedSingleton getInstance() {
        if (instance == null) { // 1st check (no lock)
            synchronized (SafeDoubleCheckedSingleton.class) {
                if (instance == null) { // 2nd check (with lock)
                    instance = new SafeDoubleCheckedSingleton();
                }
            }
        }
        return instance;
    }
}
```

---

# 6. Java 8 Features

## 36. What are lambda expressions and functional interfaces?

### 1. Functional Interfaces

A **Functional Interface** is an interface that contains **exactly one abstract method** (known as the Single Abstract Method or SAM). It may contain any number of `default` methods or `static` methods.

* Annotated with `@FunctionalInterface` (optional, but informs the compiler to generate an error if more than one abstract method is declared).
* Serves as the target type for **Lambda Expressions** and **Method References**.

#### Core Built-In Functional Interfaces (`java.util.function`)

| Interface | Method Signature | Purpose | Example |
| :--- | :--- | :--- | :--- |
| **`Predicate<T>`** | `boolean test(T t)` | Evaluates a boolean condition | `s -> s.length() > 5` |
| **`Function<T, R>`** | `R apply(T t)` | Transforms input `T` into output `R` | `String::toUpperCase` |
| **`Consumer<T>`** | `void accept(T t)` | Consumes value, performs side-effects | `System.out::println` |
| **`Supplier<T>`** | `T get()` | Generates/supplies a value | `() -> UUID.randomUUID()` |
| **`BiFunction<T, U, R>`** | `R apply(T t, U u)` | Transforms two inputs into output | `(a, b) -> a + b` |
| **`UnaryOperator<T>`** | `T apply(T t)` | `Function<T, T>` where input and output types match | `n -> n * 2` |

### 2. Lambda Expressions

A **Lambda Expression** is an anonymous function (a block of code without a declared method name, return type, or access modifier) that can be passed around as if it were a first-class object.

* **Syntax:** `(parameters) -> expression` or `(parameters) -> { statements; }`
* **Under the Hood (JVM Execution):** In Java, lambdas are **not** anonymous inner classes. The Java compiler generates an `invokedynamic` (JSR 292) bytecode instruction calling `LambdaMetafactory`. The JVM dynamically generates the call-site linkage at runtime, avoiding unnecessary `.class` file generation and classloading overhead.

### Code Demonstration

```java
import java.util.*;
import java.util.function.*;

public class LambdasAndFunctionalInterfacesDemo {

    @FunctionalInterface
    interface MathOperation {
        double calculate(double a, double b); // Single abstract method
    }

    public static void main(String[] args) {
        // 1. Custom Functional Interface via Lambda
        MathOperation addition = (a, b) -> a + b;
        MathOperation power = Math::pow; // Method reference

        System.out.println("Add: " + addition.calculate(10, 5)); // 15.0
        System.out.println("Pow: " + power.calculate(2, 3));     // 8.0

        // 2. Built-in: Predicate (Filter)
        Predicate<String> isLongWord = s -> s.length() > 4;

        // 3. Built-in: Function (Transform)
        Function<String, Integer> stringLength = String::length;

        // 4. Built-in: Consumer (Side-Effect)
        Consumer<String> printer = word -> System.out.println("Word: " + word);

        // 5. Built-in: Supplier (Factory)
        Supplier<Double> randomGenerator = Math::random;

        List<String> words = List.of("Java", "Stream", "API", "Lambda");
        for (String w : words) {
            if (isLongWord.test(w)) {
                printer.accept(w + " (Length: " + stringLength.apply(w) + ")");
            }
        }
    }
}
```

---

## 37. What is the Stream API?

### Definition and Purpose

Introduced in Java 8, the **Stream API** (`java.util.stream.Stream`) provides a declarative, functional approach to processing sequences of elements. It allows developers to express complex data transformation pipelines with readability, conciseness, and built-in parallelization capabilities.

### Key Characteristics of Streams

1. **Streams Do Not Store Data:** A stream is not a data structure. It carries values from a source (a collection, array, or I/O channel) through a pipeline of computational steps.
2. **Functional and Non-Mutating:** Operations on a stream produce a result without mutating the underlying data source.
3. **Lazy Evaluation:** Intermediate operations are not executed when defined. They are only executed when a **terminal operation** is triggered.
4. **Consumable Once:** A stream cannot be traversed or reused after a terminal operation has executed. Doing so throws `IllegalStateException: stream has already been operated upon or closed`.

### The Three Stages of a Stream Pipeline

```
[ Data Source ]  -->  [ Intermediate Operations (Lazy) ]  -->  [ Terminal Operation (Eager) ]
(List, Set, File)       filter() -> map() -> sorted()            collect() / forEach() / reduce()
```

1. **Source:** Where data originates (`list.stream()`, `Arrays.stream()`, `Stream.of()`, `Files.lines()`).
2. **Intermediate Operations (Lazy - Return `Stream<T>`):**
   * `filter(Predicate<T>)`
   * `map(Function<T, R>)`
   * `flatMap(Function<T, Stream<R>>)`
   * `distinct()`, `sorted()`, `limit()`, `skip()`
3. **Terminal Operations (Eager - Produce Result or Side-Effect):**
   * Collections: `collect(Collectors.toList())`, `collect(Collectors.toSet())`
   * Aggregations: `reduce()`, `count()`, `min()`, `max()`
   * Iteration: `forEach()`, `forEachOrdered()`
   * Short-circuit matches: `findFirst()`, `findAny()`, `anyMatch()`, `allMatch()`

### Code Demonstration

```java
import java.util.*;
import java.util.stream.Collectors;

public class StreamApiPipelineDemo {

    record Employee(String name, String department, double salary) {}

    public static void main(String[] args) {
        List<Employee> employees = List.of(
            new Employee("Alice", "Engineering", 120_000),
            new Employee("Bob", "Marketing", 75_000),
            new Employee("Charlie", "Engineering", 140_000),
            new Employee("Diana", "Sales", 90_000),
            new Employee("Evan", "Engineering", 110_000)
        );

        // Scenario: Find the names of all Engineers earning > $115k, sorted alphabetically
        List<String> highEarningEngineers = employees.stream()
            .filter(emp -> "Engineering".equals(emp.department())) // Intermediate: Filter by department
            .filter(emp -> emp.salary() > 115_000)                // Intermediate: Filter by salary
            .map(Employee::name)                                  // Intermediate: Extract name (Transform)
            .sorted()                                             // Intermediate: Sort alphabetically
            .collect(Collectors.toList());                        // Terminal: Collect to List

        System.out.println("High earning engineers: " + highEarningEngineers); // [Alice, Charlie]

        // Grouping aggregation: Average salary per department
        Map<String, Double> avgSalaryPerDept = employees.stream()
            .collect(Collectors.groupingBy(
                Employee::department,
                Collectors.averagingDouble(Employee::salary)
            ));

        System.out.println("Average salary per department: " + avgSalaryPerDept);
    }
}
```

---

## 38. map() vs flatMap()?

### Conceptual Difference

Both `map()` and `flatMap()` are intermediate Stream operations used for transformation, but they differ in their structural handling of dimensions and nesting:

* **`map()` (One-to-One Transformation):**
  * Function signature: `Function<T, R>`
  * Takes each element of type `T` and transforms it into an element of type `R`.
  * Preserves the stream structure. If the mapping function returns a collection or another stream, you end up with a **nested stream**: `Stream<List<R>>` or `Stream<Stream<R>>`.
* **`flatMap()` (One-to-Many Transformation: Mapping + Flattening):**
  * Function signature: `Function<T, Stream<R>>`
  * Takes each element of type `T`, transforms it into a `Stream<R>`, and then **flattens** all the sub-streams into a single continuous stream of type `Stream<R>`.
  * Used to unpack and flatten nested structures (e.g., converting `List<List<T>>` into `List<T>`).

```
map():
[ ["A", "B"], ["C", "D"] ]  ---> map()  ---> [ Stream["A", "B"], Stream["C", "D"] ]  (Nested!)

flatMap():
[ ["A", "B"], ["C", "D"] ]  ---> flatMap() ---> [ "A", "B", "C", "D" ]               (Flattened!)
```

### Detailed Comparison Table

| Feature | `map()` | `flatMap()` |
| :--- | :--- | :--- |
| **Mapping Ratio** | **$1 \to 1$** (one input produces one output) | **$1 \to N$** (one input produces zero, one, or multiple outputs) |
| **Function Type** | `Function<T, R>` | `Function<T, Stream<R>>` |
| **Output Type** | `Stream<R>` | `Stream<R>` (flattened) |
| **Common Use Case** | Extracting object fields, formatting strings | Flattening lists, splitting sentences to words, unwrapping `Optional` |

### Code Demonstration

```java
import java.util.*;
import java.util.stream.Collectors;

public class MapVsFlatMapDemo {

    static class Order {
        private final int orderId;
        private final List<String> items;

        public Order(int orderId, List<String> items) {
            this.orderId = orderId;
            this.items = items;
        }

        public List<String> getItems() { return items; }
    }

    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order(101, List.of("Laptop", "Mouse")),
            new Order(102, List.of("Keyboard", "Monitor")),
            new Order(103, List.of("Headphones", "Mouse"))
        );

        // --- 1. Using map() ---
        // Returns a Stream of Lists: Stream<List<String>>
        List<List<String>> nestedItems = orders.stream()
            .map(Order::getItems) // 1-to-1: Order -> List<String>
            .collect(Collectors.toList());

        System.out.println("map() result (Nested Lists): " + nestedItems);
        // Output: [[Laptop, Mouse], [Keyboard, Monitor], [Headphones, Mouse]]

        // --- 2. Using flatMap() ---
        // Flattens all individual item lists into a single continuous Stream<String>
        List<String> allUniqueItems = orders.stream()
            .flatMap(order -> order.getItems().stream()) // 1-to-N: Order -> Stream<String>
            .distinct()                                  // Remove duplicate "Mouse"
            .sorted()
            .collect(Collectors.toList());

        System.out.println("flatMap() result (Flattened): " + allUniqueItems);
        // Output: [Headphones, Keyboard, Laptop, Monitor, Mouse]
    }
}
```

---

## 39. filter() vs map()?

### Comparison of Roles

In functional stream processing, `filter()` and `map()` represent the two core operations of relational algebra: **Selection** and **Projection**.

* **`filter()` (Selection):** Selects which elements pass through the pipeline based on a boolean condition. It **never modifies** the elements or their type; it only discards elements that fail the predicate.
* **`map()` (Projection / Transformation):** Transforms every element that passes through into a new form or type. It **never discards** elements; the output count always matches the input count.

```
Input: [ 1, 2, 3, 4, 5 ]

filter(x -> x % 2 == 0):
  Evaluates condition: 1(false), 2(true), 3(false), 4(true), 5(false)
  Output: [ 2, 4 ]  (Count decreases, Type stays Integer)

map(x -> "Number: " + x):
  Transforms value: 2 -> "Number: 2", 4 -> "Number: 4"
  Output: [ "Number: 2", "Number: 4" ]  (Count preserved, Type changes to String)
```

### Detailed Comparison Table

| Dimension | `filter()` | `map()` |
| :--- | :--- | :--- |
| **Functional Parameter** | `Predicate<T>` (returns `boolean`) | `Function<T, R>` (returns value of type `R`) |
| **Output Stream Type** | `Stream<T>` (element type remains identical) | `Stream<R>` (element type can change) |
| **Output Stream Size** | $\le N$ (can be $0$ up to $N$) | Exactly $= N$ (strictly 1-to-1) |
| **Role** | Inclusion / Exclusion criteria | Data transformation / Field extraction |

### Code Demonstration

```java
import java.util.*;
import java.util.stream.Collectors;

public class FilterVsMapDemo {
    public static void main(String[] args) {
        List<String> emails = List.of(
            "alice@example.com",
            "invalid-email",
            "bob@company.org",
            "charlie@example.com"
        );

        // Pipeline chaining filter() followed by map()
        List<String> domains = emails.stream()
            // 1. filter(): Discard invalid strings (Predicate: String -> boolean)
            // Output size <= input size; elements remain Strings
            .filter(email -> email.contains("@"))
            
            // 2. map(): Extract domain name (Function: String -> String)
            // Output size == filtered size; transforms each email into its domain
            .map(email -> email.substring(email.indexOf("@") + 1))
            .distinct()
            .collect(Collectors.toList());

        System.out.println("Extracted domains: " + domains); // [example.com, company.org]
    }
}
```

> **Performance Tip:** Always place `filter()` **before** expensive `map()` transformations in your stream pipeline. Filtering early eliminates unwanted elements before CPU cycles are spent computing transformations on them.

---

## 40. What is Optional, and why is it used?

### The Problem: The "Billion-Dollar Mistake"

In 1965, Sir Tony Hoare invented the null pointer, later calling it his "billion-dollar mistake". In Java, unchecked `null` references routinely cause `NullPointerException` (NPE) at runtime, crashing production systems.

Historically, defensive programming required verbose nested null-checks:
```java
if (user != null) {
    Address address = user.getAddress();
    if (address != null) {
        Country country = address.getCountry();
        if (country != null) {
            return country.getIsoCode();
        }
    }
}
```

### What is `Optional<T>`?

Introduced in Java 8, `java.util.Optional<T>` is a **value-based container object** that may or may not contain a non-null value of type `T`:
* If a value is present: `isPresent()` returns `true`, and `get()` retrieves the value.
* If no value is present: the object is empty.

### Why is it used?

1. **Explicit API Design:** `Optional` is designed to be used as a **method return type** to clearly signal to the caller that the result might legitimately be absent (e.g., `userRepository.findById("101")`).
2. **Eliminates Silent NPEs:** Forces the client developer to actively think about and handle the empty scenario, making error handling intentional and visible at compile time.
3. **Fluent Functional Transformations:** Supports functional methods like `map()`, `flatMap()`, `filter()`, `orElse()`, and `orElseGet()`.

### Key APIs in `Optional`

* **Creation:**
  * `Optional.of(value)`: Throws NPE immediately if `value == null`.
  * `Optional.ofNullable(value)`: Returns populated `Optional` if value is present; returns `Optional.empty()` if null.
  * `Optional.empty()`: Returns an empty instance.
* **Retrieval & Fallbacks:**
  * `orElse(defaultValue)`: Returns value if present, otherwise returns `defaultValue` (eagerly evaluated).
  * `orElseGet(Supplier<T>)`: Returns value if present, otherwise invokes `Supplier` (lazily evaluated).
  * `orElseThrow(Supplier<Exception>)`: Returns value if present, otherwise throws custom exception.
* **Functional Pipelines:**
  * `map(Function<T, R>)`, `flatMap(Function<T, Optional<R>>)`, `filter(Predicate<T>)`.

### Code Comparison: Legacy Null Checking vs. Modern Optional

```java
import java.util.Optional;

public class OptionalMechanicsDemo {

    static class Country {
        private final String isoCode;
        public Country(String isoCode) { this.isoCode = isoCode; }
        public String getIsoCode() { return isoCode; }
    }

    static class Address {
        private final Country country;
        public Address(Country country) { this.country = country; }
        public Optional<Country> getCountry() { return Optional.ofNullable(country); }
    }

    static class User {
        private final Address address;
        public User(Address address) { this.address = address; }
        public Optional<Address> getAddress() { return Optional.ofNullable(address); }
    }

    public static void main(String[] args) {
        User validUser = new User(new Address(new Country("US")));
        User userWithoutAddress = new User(null);

        // Elegant, null-safe navigation using map and flatMap
        String iso1 = extractIsoCode(validUser);
        String iso2 = extractIsoCode(userWithoutAddress);

        System.out.println("User 1 ISO: " + iso1); // US
        System.out.println("User 2 ISO: " + iso2); // UNKNOWN (Handled cleanly without NPE!)
    }

    public static String extractIsoCode(User user) {
        return Optional.ofNullable(user)
            .flatMap(User::getAddress)
            .flatMap(Address::getCountry)
            .map(Country::getIsoCode)
            .orElse("UNKNOWN"); // Fallback default value
    }
}
```

### Best Practices & Anti-Patterns (Item 55, *Effective Java*)

* **DO:** Use `Optional` as a **return type** for methods that might not find a result (e.g., search queries, cache lookups).
* **DON'T call `.get()` blindly:** Calling `opt.get()` without checking `isPresent()` throws `NoSuchElementException`, completely defeating the purpose of `Optional`. Prefer `orElse()`, `orElseGet()`, or `orElseThrow()`.
* **DON'T use `Optional` as method arguments or constructor parameters:** It forces callers to wrap values unnecessarily (`findUser(Optional.of("id"))`). Use method overloading instead.
* **DON'T use `Optional` as class instance fields:** `Optional` does not implement `java.io.Serializable` and incurs additional heap object pointer overhead.
* **DON'T wrap collections in `Optional`:** Never return `Optional<List<T>>`. Return an empty list (`Collections.emptyList()`) instead.
