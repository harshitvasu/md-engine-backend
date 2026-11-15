# 3. Collections Framework

## 16. ArrayList vs LinkedList?

### Core Architecture

Both `ArrayList` and `LinkedList` implement the `List` interface, but their underlying memory organization and performance profiles differ fundamentally.

* **`ArrayList`:** Backed by a contiguous, dynamically resizing array (`transient Object[] elementData`).
* **`LinkedList`:** Backed by a doubly-linked list of node objects (`Node<E>` containing `item`, `next`, and `prev` pointers). It implements both `List<E>` and `Deque<E>`.

```
ArrayList (Contiguous Memory):
+----+----+----+----+----+
| e0 | e1 | e2 | e3 | e4 |
+----+----+----+----+----+
  0    1    2    3    4

LinkedList (Dispersed Heap Nodes):
[null <- Node0 -> Node1] <-> [Node0 <- Node1 -> Node2] <-> [Node1 <- Node2 -> null]
```

### Time Complexity Comparison

| Operation | `ArrayList` | `LinkedList` |
| :--- | :--- | :--- |
| **Get by index (`get(i)`)** | **$O(1)$** (Direct memory offset math) | **$O(n)$** (Traverses from head or tail) |
| **Add at tail (`add(e)`)** | **Amortized $O(1)$** ($O(n)$ on resize) | **$O(1)$** |
| **Add at head (`add(0, e)`)** | **$O(n)$** (Shifts all elements right) | **$O(1)$** (Prepends head pointer) |
| **Insert/Delete in middle** | **$O(n)$** (Shifts elements via `arraycopy`) | **$O(n)$** traversal + **$O(1)$** pointer update |
| **Memory Overhead** | Low (unused capacity slots only) | High (24–32 bytes per node for pointers + headers) |
| **CPU Cache Locality** | **Excellent** (contiguous in L1/L2 cache) | **Poor** (scattered heap allocations cause cache misses) |

### Why `ArrayList` is Almost Always Preferred

Even for insertions and deletions, `ArrayList` frequently outperforms `LinkedList` in practical benchmarks:
1. **Cache Locality:** Modern CPUs fetch contiguous array memory lines into CPU L1/L2 caches ahead of time. `LinkedList` nodes are scattered randomly across the heap, triggering frequent CPU cache misses.
2. **`System.arraycopy` Speed:** Array shifting in `ArrayList` is implemented via native hardware memory block moves, which execute in microseconds.
3. **If queue or deque operations are needed:** Prefer `ArrayDeque` over `LinkedList` as it offers $O(1)$ head/tail operations backed by a circular array without node allocation overhead.

### Code Demonstration

```java
import java.util.*;

public class ListComparisonDemo {
    public static void main(String[] args) {
        List<Integer> arrayList = new ArrayList<>();
        List<Integer> linkedList = new LinkedList<>();

        // Fast random access
        for (int i = 0; i < 100_000; i++) {
            arrayList.add(i);
            linkedList.add(i);
        }

        long start = System.nanoTime();
        int val1 = arrayList.get(50_000); // O(1)
        long durationArray = System.nanoTime() - start;

        start = System.nanoTime();
        int val2 = linkedList.get(50_000); // O(N) traversal
        long durationLinked = System.nanoTime() - start;

        System.out.printf("ArrayList get: %d ns | LinkedList get: %d ns%n", 
            durationArray, durationLinked);
        // Typical result: ArrayList is 100x - 500x faster for indexed reads
    }
}
```

---

## 17. List vs Set vs Map?

### The Core Hierarchy

In the Java Collections Framework, `List` and `Set` inherit from the root `Collection` interface, while `Map` is an entirely distinct root interface because it models key-value associations rather than isolated elements.

```
                  Collection<E>
                   /         \
                  /           \
              List<E>        Set<E>                    Map<K, V>
             (Ordered,     (Unique,                  (Key-Value Pairs,
            Duplicates)   No Duplicates)              Unique Keys)
                 |              |                          |
           +-----+-----+   +----+----+               +-----+-----+
           |           |   |         |               |           |
       ArrayList   LinkedList HashSet TreeSet        HashMap   TreeMap
```

### Comparison Matrix

| Attribute | `List<E>` | `Set<E>` | `Map<K, V>` |
| :--- | :--- | :--- | :--- |
| **Duplicates** | **Allowed** | **Prohibited** (enforced by `equals`) | **Keys:** No duplicates; **Values:** Duplicates allowed |
| **Ordering** | **Maintains insertion order** | `HashSet`: None; `LinkedHashSet`: Insertion; `TreeSet`: Sorted | `HashMap`: None; `LinkedHashMap`: Insertion; `TreeMap`: Sorted |
| **Positional Access** | Yes (`get(int index)`) | No index access | Key-based access (`get(Object key)`) |
| **Null Elements** | Multiple `null`s allowed | `HashSet`: 1 `null`; `TreeSet`: 0 `null` | `HashMap`: 1 `null` key, multiple `null` values; `TreeMap`: 0 `null` keys |
| **Common Classes** | `ArrayList`, `LinkedList`, `Vector` | `HashSet`, `LinkedHashSet`, `TreeSet` | `HashMap`, `LinkedHashMap`, `TreeMap`, `ConcurrentHashMap` |

### Code Demonstration

```java
import java.util.*;

public class CollectionHierarchyDemo {
    public static void main(String[] args) {
        // --- 1. List: Preserves insertion order, permits duplicates ---
        List<String> fruitsList = new ArrayList<>();
        fruitsList.add("Apple");
        fruitsList.add("Banana");
        fruitsList.add("Apple"); // Duplicate allowed
        System.out.println("List: " + fruitsList); // [Apple, Banana, Apple]

        // --- 2. Set: Prohibits duplicates ---
        Set<String> fruitsSet = new HashSet<>(fruitsList);
        System.out.println("Set: " + fruitsSet); // [Apple, Banana] (duplicates discarded)

        // --- 3. Map: Unique key mapping to values ---
        Map<String, Integer> inventory = new HashMap<>();
        inventory.put("Apple", 50);
        inventory.put("Banana", 30);
        inventory.put("Apple", 75); // Overwrites previous value for key "Apple"
        System.out.println("Map: " + inventory); // {Apple=75, Banana=30}
    }
}
```

---

## 18. How does HashMap work internally?

### Internal Architecture

A `HashMap` in Java is an array of hash buckets. Each bucket contains a collection of key-value pairs stored as `Node<K, V>` entries.

```
table (Node<K,V>[] of length n = 2^k)
+---+
| 0 | --> Node(K,V) -> null
+---+
| 1 | --> null
+---+
| 2 | --> Node(K,V) -> Node(K,V) -> Node(K,V) (Singly Linked List)
+---+
| 3 | --> TreeNode (Red-Black Tree when chain >= 8 and table capacity >= 64)
+---+
```

### Critical Parameters and Thresholds

1. **Default Initial Capacity:** `16` (must always be a power of two: $2^n$).
2. **Default Load Factor:** `0.75` (optimal trade-off between space and time complexity).
3. **Threshold:** $\text{Capacity} \times \text{Load Factor}$ ($16 \times 0.75 = 12$). When table size exceeds 12, resizing occurs.
4. **`TREEIFY_THRESHOLD` (Java 8+):** `8`. When a single bucket chain reaches 8 nodes AND the total table capacity is at least `64` (`MIN_TREEIFY_CAPACITY`), the bucket's linked list transforms into a balanced **Red-Black Tree (`TreeNode<K,V>`)**.
5. **`UNTREEIFY_THRESHOLD`:** `6`. During resizing, if a tree bucket splits and contains $\le 6$ nodes, it converts back to a linked list.

### 1. Hash and Bucket Index Calculation

To avoid clustering and achieve uniform distribution, `HashMap` applies a **perturbation function**:

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```
* **Bitwise XOR Shift:** XORs the higher 16 bits with the lower 16 bits. Since table sizes are typically small powers of 2 (e.g., 16, 32), without this shift, only the lowest bits of `hashCode()` would be used, causing excessive collisions.
* **Bucket Index:** Calculated using bitwise AND:
  $$\text{index} = (n - 1) \ \& \ \text{hash}$$
  Because $n$ is a power of 2, $(n - 1) \ \& \ \text{hash}$ is mathematically equivalent to $\text{hash} \pmod n$, but executes substantially faster at the CPU level.

### 2. Put Operation Lifecycle

1. If the table array is uninitialized (`table == null`), initialize it via `resize()` to default capacity 16.
2. Compute `hash(key)` and target bucket `index`.
3. **If bucket is empty:** Directly allocate and place a new `Node<K,V>`.
4. **If collision occurs (bucket occupied):**
   * Check if the head node matches the key (`hash` matches AND (`p.key == key` or `key.equals(p.key)`)). If yes, overwrite the value.
   * If the head node is a `TreeNode`, invoke `putTreeVal()` to insert into the Red-Black tree ($O(\log n)$).
   * Otherwise, traverse the linked list to the tail:
     * If matching key is found, update value and break.
     * Otherwise, append new `Node` at the tail (Java 8 appends at tail; Java 7 prepended at head).
     * If chain length $\ge 8$, invoke `treeifyBin()`.
5. If total entry count exceeds `threshold`, trigger `resize()`: table array doubles in size ($2n$), and elements are rehashed/re-indexed.

### Why Red-Black Trees in Java 8?
In Java 7, bad hash codes or malicious hash-collision attacks could degrade lookup performance from $O(1)$ to $O(n)$ (traversing a long linked list). In Java 8, treeification ensures worst-case lookup remains bounded at **$O(\log n)$**.

---

## 19. How does HashSet work internally?

### Internal Implementation: A HashMap in Disguise

A `HashSet` does not implement its own hashing or storage algorithms. Under the hood, **`HashSet` is simply an encapsulation wrapper around a `HashMap`**.

Examining OpenJDK's `java.util.HashSet` source code:

```java
public class HashSet<E> extends AbstractSet<E> implements Set<E> {
    // 1. Backing HashMap storage
    private transient HashMap<E, Object> map;

    // 2. Dummy value associated with every key in the backing map
    private static final Object PRESENT = new Object();

    // Default constructor instantiates HashMap
    public HashSet() {
        map = new HashMap<>();
    }

    // Adding an element
    public boolean add(E e) {
        // Delegates to HashMap.put(key, dummyValue)
        // If key already existed, put() returns the previous value (PRESENT) -> returns false
        // If key was new, put() returns null -> returns true
        return map.put(e, PRESENT) == null;
    }

    public boolean contains(Object o) {
        return map.containsKey(o);
    }

    public boolean remove(Object o) {
        return map.remove(o) == PRESENT;
    }

    public int size() {
        return map.size();
    }

    public Iterator<E> iterator() {
        return map.keySet().iterator();
    }
}
```

### How Uniqueness is Guaranteed

When you call `hashSet.add(element)`:
1. `HashSet` invokes `map.put(element, PRESENT)`.
2. `HashMap` uses `element.hashCode()` and `element.equals()` to check for an existing key.
3. If the key already exists in the bucket, `map.put` updates the value and returns the old value (`PRESENT`). Because the return value is not `null`, `HashSet.add()` returns `false` (element not added).
4. If the key is new, `map.put` inserts the node and returns `null`. `HashSet.add()` returns `true`.

### Performance & Memory Implications
* Time complexity matches `HashMap`: $O(1)$ average time for `add()`, `remove()`, and `contains()`.
* Memory overhead is higher than an array because each entry allocates a `HashMap$Node` containing 4 references (`hash`, `key`, `value=PRESENT`, `next`).

---

## 20. HashMap vs ConcurrentHashMap?

### Concurrency Hazards with `HashMap`

`HashMap` is completely unsynchronized. In a multi-threaded application:
1. **Data Corruption & Lost Updates:** Concurrent writes to the same bucket can overwrite each other's nodes.
2. **Java 7 Infinite Loop Bug:** During concurrent resizing in Java 7, race conditions in head-insertion caused circular linked lists, pegging CPU utilization at 100%. (Java 8 fixed circular chaining via tail-insertion, but concurrent `HashMap` mutations in Java 8 still lead to corrupted sizes and node data loss).

### Why not `Hashtable` or `Collections.synchronizedMap()`?
`Hashtable` and `Collections.synchronizedMap(map)` synchronize every method using a single coarse-grained lock on the entire map object. When one thread reads or writes, all other threads are blocked, creating a severe performance bottleneck.

### How `ConcurrentHashMap` Solves Concurrency (Java 8+)

`ConcurrentHashMap` provides high concurrency and thread safety without locking the entire map:

```
ConcurrentHashMap Bucket Array (Java 8+)
Bucket 0: [CAS insertion] (No lock needed for empty bucket)
Bucket 1: [synchronized(headNode)] -> Node -> Node (Locks ONLY Bucket 1)
Bucket 2: [Non-blocking volatile read] (Readers never block!)
Bucket 3: [synchronized(treeRoot)] -> TreeNode (Locks ONLY Bucket 3)
```

1. **CAS (Compare-And-Swap) for Empty Buckets:**
   * When inserting into a bucket that is currently empty, `ConcurrentHashMap` uses lock-free hardware atomic instructions (`Unsafe.compareAndSwapObject` / `VarHandle`). Zero locking overhead!
2. **Node-Level Locking for Collisions:**
   * When a collision occurs (bucket is not empty), it locks **only the head node** of that specific bucket using intrinsic `synchronized(node)`.
   * Other threads can concurrently read or write to any other bucket in the map simultaneously!
3. **Lock-Free Reads:**
   * `get()` calls require **zero locks**. Node values and `next` pointers are declared `volatile`, guaranteeing immediate visibility of updates across CPU cores without synchronization delays.
4. **No Null Keys or Values:**
   * `ConcurrentHashMap` prohibits `null` keys and `null` values. In concurrent programming, returning `null` creates ambiguity: did the key map to `null`, or was the key absent? In single-threaded `HashMap`, `containsKey()` resolves this; in multi-threaded contexts, state can change between `get()` and `containsKey()`.

### Comparison Summary

| Feature | `HashMap` | `Hashtable` | `ConcurrentHashMap` (Java 8+) |
| :--- | :--- | :--- | :--- |
| **Thread Safe?** | No | Yes | **Yes** |
| **Locking Strategy** | None | Coarse-grained (locks entire map) | Fine-grained (locks only head of target bucket) |
| **Reads Block?** | No | Yes (reads lock entire map) | **No (Lock-free volatile reads)** |
| **Null Keys/Values** | 1 null key, many null values | No nulls allowed | **No nulls allowed** |
| **Performance Under Load**| High (single thread only) | Abysmal | **Extremely High** |

---

## 21. How do equals() and hashCode() work together?

### The Formal Contract

The contract between `equals(Object o)` and `hashCode()` defined in `java.lang.Object` mandates:

1. **Consistency:** If object fields do not change, repeated invocations of `hashCode()` must return the identical integer.
2. **If `a.equals(b) == true`:** Then `a.hashCode() == b.hashCode()` **MUST be true**.
3. **If `a.hashCode() == b.hashCode()`:** `a.equals(b)` is **NOT necessarily true** (Hash Collision). Different objects can share the same hash code.

### The Catastrophic Bug: Overriding `equals()` without `hashCode()`

If you override `equals()` without overriding `hashCode()`, your class inherits `Object.hashCode()`, which derives its integer from the object's physical heap memory address.

Consequently, two logically identical objects will produce **different hash codes**. When used in a `HashMap` or `HashSet`:
* `map.put(key1, value)` hashes `key1` and places it in Bucket A.
* `map.get(key2)` where `key1.equals(key2)` hashes `key2`, calculates a completely different Bucket B, and returns `null`!

### Code Demonstration

```java
import java.util.*;

public class EqualsHashCodeContractDemo {

    // BROKEN CLASS: Overrides equals() but NOT hashCode()
    static class BrokenKey {
        private final String id;
        public BrokenKey(String id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            return Objects.equals(id, ((BrokenKey) o).id);
        }
        // hashCode() missing!
    }

    // CORRECT CLASS: Overrides both consistently
    static class CorrectKey {
        private final String id;
        public CorrectKey(String id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            return Objects.equals(id, ((CorrectKey) o).id);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id); // Consistent with equals
        }
    }

    public static void main(String[] args) {
        // --- Testing BrokenKey ---
        Map<BrokenKey, String> brokenMap = new HashMap<>();
        brokenMap.put(new BrokenKey("USER_101"), "Harshit");

        // Attempt retrieval with logically EQUAL key:
        String result1 = brokenMap.get(new BrokenKey("USER_101"));
        System.out.println("BrokenKey retrieval: " + result1); // null (FAILED!)

        // --- Testing CorrectKey ---
        Map<CorrectKey, String> correctMap = new HashMap<>();
        correctMap.put(new CorrectKey("USER_101"), "Harshit");

        String result2 = correctMap.get(new CorrectKey("USER_101"));
        System.out.println("CorrectKey retrieval: " + result2); // Harshit (SUCCESS!)
    }
}
```

### The Mutable Key Danger
Never mutate fields that are used in `hashCode()` after an object is stored as a key in a `HashMap` or `HashSet`. Mutating fields alters the hash code, leaving the entry trapped in the wrong bucket and rendering it unretrievable.

---

## 22. Comparable vs Comparator?

### Conceptual Breakdown

Both interfaces allow sorting objects, but they address different architectural requirements:

* **`Comparable<T>` (`java.lang`):** Defines the **natural ordering** of a domain class. Implemented directly by the class itself.
* **`Comparator<T>` (`java.util`):** Defines **custom / external ordering strategies**. Decoupled from the domain class, allowing multiple sorting sequences.

### Detailed Comparison Table

| Attribute | `Comparable<T>` | `Comparator<T>` |
| :--- | :--- | :--- |
| **Package** | `java.lang` | `java.util` |
| **Method Signature** | `int compareTo(T o)` | `int compare(T o1, T o2)` |
| **Sorting Sequences** | **Single** (natural default ordering) | **Multiple** (sort by name, salary, date, etc.) |
| **Source Code Access** | Requires modifying the class source code | Does not require modifying the class source code |
| **Method Chaining** | Not applicable | Supports `thenComparing()`, `reversed()` |
| **Common Invocation**| `Collections.sort(list)` | `list.sort(comparator)` or `Stream.sorted(comparator)`|

### Code Demonstration

```java
import java.util.*;

// Domain class implementing Comparable (Natural order: by ID)
class Product implements Comparable<Product> {
    private final int id;
    private final String name;
    private final double price;

    public Product(int id, String name, double price) {
        this.id = id;
        this.name = name;
        this.price = price;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public double getPrice() { return price; }

    @Override
    public int compareTo(Product other) {
        // Natural order: ascending by ID
        return Integer.compare(this.id, other.id);
    }

    @Override
    public String toString() {
        return String.format("[%d, %s, $%.2f]", id, name, price);
    }
}

public class SortingComparisonDemo {
    public static void main(String[] args) {
        List<Product> products = new ArrayList<>(List.of(
            new Product(103, "Monitor", 300.0),
            new Product(101, "Keyboard", 80.0),
            new Product(102, "Mouse", 45.0),
            new Product(104, "Laptop", 1200.0)
        ));

        // 1. Natural Sort via Comparable (by ID)
        Collections.sort(products);
        System.out.println("Natural Sort (by ID): " + products);

        // 2. Custom Sort via Comparator lambda (by Price Ascending)
        products.sort((p1, p2) -> Double.compare(p1.getPrice(), p2.getPrice()));
        System.out.println("Custom Sort (by Price): " + products);

        // 3. Modern Fluent Comparator Chaining (by Name then Price descending)
        Comparator<Product> multiComparator = Comparator
            .comparing(Product::getName)
            .thenComparing(Comparator.comparingDouble(Product::getPrice).reversed());

        products.sort(multiComparator);
        System.out.println("Chained Sort: " + products);
    }
}
```

---

## 23. ArrayList vs HashSet: when would you use each?

### Technical Comparison

| Metric | `ArrayList` | `HashSet` |
| :--- | :--- | :--- |
| **Data Model** | Ordered sequence of elements | Unordered mathematical set of unique elements |
| **Duplicates** | Permits duplicate elements | Prohibits duplicate elements |
| **Indexed Access (`get(i)`)** | **$O(1)$** instant access | Unsupported (must iterate) |
| **Membership Check (`contains`)** | **$O(n)$** linear scan | **$O(1)$** constant time hash lookup |
| **Insertion (`add`)** | Amortized $O(1)$ at end | $O(1)$ average hash insertion |
| **Memory Consumption** | Minimal (contiguous array storage) | High (allocates a `HashMap$Node` per item) |
| **Iteration Performance** | Fast (cache-friendly contiguous memory) | Slower (iterates over empty table buckets) |

### Decision Framework: When to Use Which?

* **Choose `ArrayList` when:**
  1. Element **order** must be maintained (e.g., chronological logs, sorted items).
  2. You need fast, random **indexed access** (`list.get(index)`).
  3. **Duplicates** are valid business data.
  4. Memory footprint is a primary constraint or frequent sequential iterations occur.
* **Choose `HashSet` when:**
  1. **Uniqueness** is a strict business rule (e.g., set of unique user IDs).
  2. You need high-frequency **membership testing** (`contains()`). Looking up elements in an `ArrayList` of 100,000 items requires up to 100,000 comparisons; in a `HashSet`, it takes 1 comparison.

### Practical Performance Benchmark Scenario

```java
import java.util.*;

public class ArrayListVsHashSetLookup {
    public static void main(String[] args) {
        int elementCount = 100_000;
        List<Integer> arrayList = new ArrayList<>(elementCount);
        Set<Integer> hashSet = new HashSet<>(elementCount);

        for (int i = 0; i < elementCount; i++) {
            arrayList.add(i);
            hashSet.add(i);
        }

        int target = 99_999; // Worst-case item at the tail

        // Benchmark ArrayList.contains() -> O(N)
        long start = System.nanoTime();
        boolean foundInList = arrayList.contains(target);
        long listTime = System.nanoTime() - start;

        // Benchmark HashSet.contains() -> O(1)
        start = System.nanoTime();
        boolean foundInSet = hashSet.contains(target);
        long setTime = System.nanoTime() - start;

        System.out.printf("ArrayList contains() took: %,d ns%n", listTime);
        System.out.printf("HashSet contains() took:   %,d ns%n", setTime);
        // Typical Output:
        // ArrayList contains() took: 1,850,000 ns (Linear scan of 100,000 items)
        // HashSet contains() took:        4,500 ns (Direct O(1) bucket check)
    }
}
```
