# Top 25 Data Structure Internals

A comprehensive, deep-dive guide into the **under-the-hood implementation mechanics**, memory layouts, algorithmic time complexities, and JVM internals of fundamental data structures in **Java**.

---

# 1. Arrays & Linked Lists

## 1. How are arrays stored in memory, and why is accessing an element O(1)?

### Internal Memory Layout
An array is a **contiguous block of memory** allocated on the heap (in Java) or stack/data segment (in low-level languages). When you create an array `int[] arr = new int[5]`:
1. The JVM allocates a single, unbroken sequence of memory bytes sufficient to hold the array object header plus all elements.
2. In Java (HotSpot JVM on 64-bit architecture with Compressed OOPs enabled):
   - **Object Header**: 12 to 16 bytes (Mark Word + Klass Word + 4 bytes array length).
   - **Elements**: Placed back-to-back in memory without gaps or padding between adjacent primitive elements.

```
Memory Address:  0x1000   0x1004   0x1008   0x100C   0x1010
Array Indices:   arr[0]   arr[1]   arr[2]   arr[3]   arr[4]
Byte Offset:     +0       +4       +8       +12      +16
```

### Why Element Access is O(1)
Element access does not require scanning or traversing memory. The CPU directly computes the exact physical memory address of any element at index $i$ using a single constant-time mathematical formula:

$$	ext{Address}(arr[i]) = 	ext{Base Address} + (i 	imes 	ext{Element Size in Bytes})$$

Because addition and multiplication are executed in a single CPU instruction cycle (often mapped directly to hardware addressing modes like Base-Index-Scale-Displacement), calculating the target address takes $O(1)$ time regardless of the array's size or the index accessed.

### Hardware Cache Locality (Spatial Locality)
Because array elements reside contiguously:
- Accessing `arr[0]` causes the CPU to load an entire **Cache Line** (typically 64 bytes) from RAM into L1/L2 cache.
- For a 32-bit `int` array (4 bytes per element), one cache line preloads 16 contiguous integers. Subsequent reads to `arr[1]` through `arr[15]` result in near-instantaneous **L1 cache hits** (approx. 1 ns vs ~100 ns for main memory RAM access).

### Java Demonstration
```java
public class ArrayMemoryDemo {
    public static void main(String[] args) {
        int[] arr = new int[]{10, 20, 30, 40, 50};
        
        // Direct O(1) random access via memory offset calculation
        int element = getElementAt(arr, 3); // arr[3]
        System.out.println("Element at index 3: " + element);
    }
    
    // Conceptually equivalent to: Base_Address + (index * 4 bytes)
    public static int getElementAt(int[] array, int index) {
        if (index < 0 || index >= array.length) {
            throw new ArrayIndexOutOfBoundsException("Index: " + index);
        }
        return array[index]; // O(1) direct address dereference
    }
}
```

---

## 2. What is a Dynamic Array? How does Java's ArrayList resize internally?

### What is a Dynamic Array?
A standard array has a fixed capacity fixed at instantiation. A **Dynamic Array** (such as Java's `ArrayList<E>`) is an abstraction built on top of a fixed-size primitive array that provides the illusion of infinite capacity by automatically allocating a larger backing array and copying elements over when capacity is exhausted.

### How Java's `ArrayList` Works Internally
1. **Backing Array**: Internally, `ArrayList` encapsulates an `Object[] elementData`.
2. **Default Initial Capacity**: 
   - When constructed with `new ArrayList<>()`, `elementData` points to an empty shared array constant `DEFAULTCAPACITY_EMPTY_ELEMENTDATA`.
   - On the very **first insertion** (`add()`), it lazily initializes `elementData` with capacity **10** (`DEFAULT_CAPACITY = 10`).
3. **The Growth Factor (1.5x)**:
   - When `size == elementData.length`, adding another element triggers `grow()`.
   - The growth formula in Java source code:
     ```java
     int newCapacity = oldCapacity + (oldCapacity >> 1); // 1.5x increase
     ```
   - For example: $10 	o 15 	o 22 	o 33 	o 49 	o 73 \dots$
4. **Memory Reallocation**: A new `Object[]` of size `newCapacity` is allocated on the heap, and `Arrays.copyOf(elementData, newCapacity)` (which delegates to native `System.arraycopy`) bulk-copies old references into the new buffer. The old array becomes unreachable and is reclaimed by the Garbage Collector.

### Amortized Time Complexity
- While resizing takes $O(n)$ time to copy $n$ elements, resizing happens exponentially infrequently.
- Across $N$ consecutive appends starting from empty, the total copying operations sum to:
  $$N + rac{N}{2} + rac{N}{4} + \dots \le 2N$$
- Distributing $2N$ operations over $N$ insertions yields an **amortized time complexity of $O(1)$** per append.

### Java Source Code Reproduction
```java
import java.util.Arrays;

public class CustomDynamicArray<E> {
    private Object[] elementData;
    private int size = 0;
    private static final int DEFAULT_CAPACITY = 10;

    public CustomDynamicArray() {
        this.elementData = new Object[DEFAULT_CAPACITY];
    }

    public void add(E element) {
        if (size == elementData.length) {
            grow(); // Capacity exhausted, resize!
        }
        elementData[size++] = element;
    }

    private void grow() {
        int oldCapacity = elementData.length;
        // Growth formula: newCapacity = oldCapacity * 1.5
        int newCapacity = oldCapacity + (oldCapacity >> 1);
        
        // Native System.arraycopy under the hood
        elementData = Arrays.copyOf(elementData, newCapacity);
    }

    @SuppressWarnings("unchecked")
    public E get(int index) {
        if (index < 0 || index >= size) throw new IndexOutOfBoundsException();
        return (E) elementData[index];
    }

    public int size() { return size; }
    public int capacity() { return elementData.length; }
}
```

---

## 3. Why is insertion in the middle of an array O(n)?

### The Mechanical Reality of Contiguous Memory
Arrays maintain an unbroken, contiguous sequence of elements so that index arithmetic remains valid. When inserting a new element at index $k$ in an array of size $n$:
1. The memory slot at index $k$ is currently occupied.
2. In order to free up slot $k$ without overwriting data, **every single element from index $k$ to $n-1$ must be shifted one position to the right** (from right to left, to prevent clobbering).
3. The number of shift operations required is $n - k$:
   - If inserting at index 0 (front): $n$ elements must shift $\implies O(n)$ worst case.
   - If inserting at index $n/2$ (middle): $n/2$ elements must shift $\implies O(n)$ average case.
   - If inserting at index $n$ (end): $0$ shifts $\implies O(1)$ best case.

```
Insert 99 at index 2 in array [10, 20, 30, 40, 50] (size = 5):
Step 1: Shift 50 -> index 5: [10, 20, 30, 40, 50, 50]
Step 2: Shift 40 -> index 4: [10, 20, 30, 40, 40, 50]
Step 3: Shift 30 -> index 3: [10, 20, 30, 30, 40, 50]
Step 4: Overwrite index 2:   [10, 20, 99, 30, 40, 50]
Total shifts = 3 elements shifted.
```

### Native Copying in Java
Java optimizes this shift using the native JNI method `System.arraycopy()`, which uses SIMD/vectorized assembly CPU instructions (e.g. `memmove` with 256-bit AVX registers). However, while the constant factor is very small, the algorithmic complexity remains strictly **$O(n)$**.

### Java Demonstration
```java
public class ArrayInsertDemo {
    public static void insertAt(int[] arr, int currentSize, int index, int value) {
        if (index < 0 || index > currentSize || currentSize >= arr.length) {
            throw new IllegalArgumentException("Invalid insertion parameters");
        }
        
        // Must shift (currentSize - index) elements to the right: O(n)
        for (int i = currentSize; i > index; i--) {
            arr[i] = arr[i - 1];
        }
        
        arr[index] = value;
    }
}
```

---

## 4. How is a Linked List implemented internally? Array vs Linked List?

### Internal Implementation
A Linked List is a linear collection of discrete **Node objects** scattered non-contiguously throughout the JVM heap. Each node encapsulates:
1. `item`: The data payload or object reference.
2. `next`: Reference (pointer) to the subsequent node in memory.
3. `prev`: Reference to the preceding node (in a doubly linked list, like `java.util.LinkedList`).

```
[Head] -> Node 1 (0x3A20)          Node 2 (0x7B10)          Node 3 (0x1F40)
          +-------------+          +-------------+          +-------------+
          | item: "A"   |          | item: "B"   |          | item: "C"   |
          | next: 0x7B10| -------> | next: 0x1F40| -------> | next: null  |
          +-------------+          +-------------+          +-------------+
```

### Comprehensive Comparison Table

| Attribute | Array / `ArrayList` | Linked List / `LinkedList` |
| :--- | :--- | :--- |
| **Memory Allocation** | Single contiguous block | Dispersed nodes linked via pointers |
| **Random Access (`get(i)`)** | **$O(1)$** via index math | **$O(n)$** sequential pointer chasing |
| **Insertion at Head** | $O(n)$ (all elements shift) | **$O(1)$** (update head pointer) |
| **Insertion at Tail** | $O(1)$ amortized | **$O(1)$** (with tail pointer) |
| **Insertion in Middle** | $O(n)$ shifts | $O(1)$ insert once node is found (finding takes $O(n)$) |
| **Memory Overhead** | Minimal (only backing array capacity slack) | **High**: Each node has 24–32 bytes overhead (object header + references) |
| **CPU Cache Locality** | **Excellent** (spatial prefetching) | **Poor** (pointer chasing causes frequent CPU cache misses) |

### Java Doubly Linked List Node Structure (as in `java.util.LinkedList`)
```java
public class DoublyLinkedList<E> {
    private static class Node<E> {
        E item;
        Node<E> next;
        Node<E> prev;

        Node(Node<E> prev, E element, Node<E> next) {
            this.item = element;
            this.next = next;
            this.prev = prev;
        }
    }

    private Node<E> first;
    private Node<E> last;
    private int size = 0;

    public void addFirst(E e) {
        final Node<E> f = first;
        final Node<E> newNode = new Node<>(null, e, f);
        first = newNode;
        if (f == null) last = newNode;
        else f.prev = newNode;
        size++;
    }
}
```

---

## 5. Why is accessing an element in a Linked List O(n)?

### The Mechanism of "Pointer Chasing"
In a Linked List:
1. Individual nodes are allocated dynamically at arbitrary memory locations across the JVM heap. Node 0 might reside at memory address `0x1000`, Node 1 at `0x8F50`, Node 2 at `0x2110`, etc.
2. Because there is no mathematical correlation between a node's logical index $i$ and its physical memory address, the CPU cannot calculate the target address in constant time.
3. To access node at index $k$, the program has no choice but to start at `head` (index 0) and traverse link-by-link:
   ```java
   Node<E> x = head;
   for (int i = 0; i < k; i++) {
       x = x.next; // Follow memory pointer to next node
   }
   ```
4. This sequential traversal requires following $k$ successive pointer references, resulting in an algorithmic time complexity of **$O(n)$**.

### Hardware Impact: Cache Misses
- When the CPU follows `x = x.next`, the next node is almost certainly located in a completely different, non-cached page or cache line.
- The CPU experiences a **Cache Miss**, stalls CPU pipeline execution, and waits ~50 to 100 ns to fetch the node from RAM.
- Therefore, traversing an $n$-element `LinkedList` in practice is orders of magnitude slower than iterating over an $n$-element `ArrayList` due to memory latency.

```java
// Java standard library optimization in java.util.LinkedList:
// Searches from the head or tail depending on which is closer to the index
Node<E> node(int index) {
    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++) x = x.next;
        return x;
    } else {
        Node<E> x = last;
        for (int i = size - 1; i > index; i--) x = x.prev;
        return x;
    }
}
```

---

# 2. HashMap & Hashing (Highest Priority)

## 6. How does HashMap work internally in Java?

### Core Architecture
A Java `HashMap<K, V>` is a hash-table-based implementation of the `Map` interface. Internally, it is organized as an **array of buckets**:
```java
transient Node<K,V>[] table;
```
Each entry in this array is a bucket holding either:
1. `null` (empty bucket).
2. A single `Node<K, V>`.
3. A **Linked List** of `Node<K, V>` objects (when hash collisions occur).
4. A **Red-Black Tree** of `TreeNode<K, V>` objects (when collisions exceed 8 in Java 8+).

```
Index:    [0]       [1]           [2]       [3] ... [15]
Table:  [ null ] -> [ Node A ] -> [ null ] -> [ Tree Root ]
                         |                           /    \
                     [ Node B ]                  [ Left ] [ Right ]
```

### The 4-Step Lifecycle of `put(key, value)`
1. **Hash Calculation (Perturbation Function)**:
   The raw `key.hashCode()` is an `int` spread across 32 bits. Java applies a **spread/perturbation function**:
   ```java
   static final int hash(Object key) {
       int h;
       return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
   }
   ```
   **Why XOR with `h >>> 16`?** In a default table of capacity 16, index calculation only uses the lower 4 bits (`16 - 1 = 15 = 0b1111`). If two distinct keys differ only in the higher 16 bits, they would constantly collide. XORing the higher 16 bits into the lower 16 bits spreads entropy and drastically reduces collisions.

2. **Bucket Index Computation**:
   Instead of the slow modulo operator (`hash % table.length`), Java requires `table.length` to strictly be a **power of two** ($n = 2^k$), allowing bitwise AND masking:
   $$\text{index} = (n - 1) \ \& \ \text{hash}$$
   Because $n = 2^k$, $n - 1$ is a mask of all 1s (e.g. $16 - 1 = 15 = 00001111_2$). Bitwise AND runs in 1 CPU cycle.

3. **Collision Resolution**:
   - If `table[index] == null`, create a new `Node<K, V>` and place it in the bucket.
   - If occupied, traverse the chain:
     - If an existing node has identical hash (`p.hash == hash`) AND the key matches (`p.key == key || (key != null && key.equals(p.key))`), **overwrite the existing value**.
     - If the bucket has treeified, delegate to `putTreeVal()`.
     - Otherwise, append the new node at the **tail** (in Java 7 it was inserted at the head, which caused infinite loop race conditions during resizing).

4. **Treeification & Resizing Check**:
   - If chain length reaches `TREEIFY_THRESHOLD = 8` and `table.length >= MIN_TREEIFY_CAPACITY = 64`, convert the linked list into a Red-Black Tree.
   - If `size > threshold` (`capacity * loadFactor`), invoke `resize()` to double the table capacity.

---

## 7. What is a hash collision, and how does HashMap handle it?

### What is a Hash Collision?
A **hash collision** occurs when two distinct, unequal keys yield the exact same bucket index:
$$\text{index}(key_1) == \text{index}(key_2) \quad \text{where} \quad key_1 \ne key_2$$
Collisions are mathematically unavoidable due to the **Pigeonhole Principle**: there are $2^{32} \approx 4.3 \text{ billion}$ possible 32-bit hash codes and an infinite number of possible objects, yet a typical HashMap table only has 16 to a few thousand buckets.

### How Java HashMap Handles Collisions (Separate Chaining)
Java uses **Separate Chaining**: each bucket in `table[]` acts as the head of a linked list or Red-Black Tree.

```
table[5] -> [ Hash: 120 | Key: "apple" | Val: 100 | Next ]
                 |
                 v
            [ Hash: 280 | Key: "banana"| Val: 200 | Next: null ]
```

### Retrieval During Collision (`get(key)`)
When `map.get(key)` is invoked for a collided bucket:
1. Java calculates `index = (n - 1) & hash(key)`.
2. It fetches the first node at `table[index]`.
3. It iterates down the chain, evaluating two conditions for each node:
   ```java
   if (p.hash == hash && ((k = p.key) == key || (key != null && key.equals(k)))) {
       return p.value;
   }
   ```
4. Fast integer comparison (`p.hash == hash`) quickly rejects non-matching nodes without invoking expensive `equals()` calls. Only when hashes match does it invoke `key.equals(k)`.

```java
public class HashCollisionDemo {
    // Two different strings engineered to have identical hashCode() in Java
    public static void main(String[] args) {
        String s1 = "FB";
        String s2 = "Ea";
        
        System.out.println("s1 hashCode: " + s1.hashCode()); // 2236
        System.out.println("s2 hashCode: " + s2.hashCode()); // 2236
        System.out.println("s1.equals(s2): " + s1.equals(s2)); // false

        java.util.Map<String, Integer> map = new java.util.HashMap<>();
        map.put(s1, 1);
        map.put(s2, 2); // Hash collision! Stored in the same bucket via separate chaining.
        
        System.out.println("Retrieved s1: " + map.get(s1)); // 1
        System.out.println("Retrieved s2: " + map.get(s2)); // 2
    }
}
```

---

## 8. What is the load factor, and when does HashMap resize?

### Definition of Load Factor
The **Load Factor** is a measure of how full the hash table is allowed to get before its capacity is automatically doubled:
$$\text{Load Factor} = \frac{\text{Current Number of Entries (size)}}{\text{Total Bucket Capacity}}$$

- **Default Initial Capacity**: 16 (`DEFAULT_INITIAL_CAPACITY = 1 << 4`)
- **Default Load Factor**: 0.75 (`DEFAULT_LOAD_FACTOR = 0.75f`)
- **Threshold**: $\text{threshold} = \text{capacity} \times \text{loadFactor} = 16 \times 0.75 = 12$.

When the 13th key-value pair is inserted, `size > threshold` triggers `resize()`.

### Why is 0.75 the Default?
The value `0.75` is the optimal mathematical compromise between:
- **Time Performance**: Lower load factors (e.g. 0.5) mean sparser buckets, fewer collisions, and faster lookups, but waste memory.
- **Space Performance**: Higher load factors (e.g. 0.9) save memory, but increase collision frequencies and lengthen search chains.
- Under random hash code distributions following Poisson distribution, a load factor of 0.75 makes the probability of bucket chain length reaching 8 approximately **0.00000006** (1 in 10 million).

### How Resizing Works (The Rehash Mechanism)
1. A new array of double the size is allocated: `Node<K, V>[] newTable = new Node[oldCap << 1]`.
2. **The Power-of-Two Bit Trick**:
   Because capacity is doubled ($16 \to 32$), the index mask increases by 1 bit (from `01111` to `11111`).
   For any given node, its new index in the doubled table is either:
   - Exactly its **original index** (`oldIndex`).
   - Its original index plus old capacity: `oldIndex + oldCap`.
3. Java determines this without recalculating modulo using:
   ```java
   if ((e.hash & oldCap) == 0) {
       // Stays in original bucket index
   } else {
       // Moves to (original index + oldCap)
   }
   ```
4. Java builds two separate linked lists (`loHead/loTail` and `hiHead/hiTail`) preserving original order, then assigns them directly to `newTable[j]` and `newTable[j + oldCap]`.

---

## 9. What happens when multiple keys map to the same bucket?

### Chain Growth and Degradation
When multiple keys map to the same bucket index:
1. **1 to 7 Elements**: They form a singly linked list connected by `node.next`.
   - Insertion is $O(1)$ (appended at tail in Java 8+).
   - Search/Delete requires traversing the chain: $O(k)$ where $k$ is the number of collided elements.
2. **8th Element Inserted**: If the chain reaches `TREEIFY_THRESHOLD = 8`:
   - If the total table capacity is $< 64$ (`MIN_TREEIFY_CAPACITY`), HashMap **does not treeify**; instead, it calls `resize()` to double the table capacity in hopes that the collision resolves through re-indexing.
   - If table capacity is $\ge 64$, the linked list is transformed into a **Red-Black Tree** (`TreeNode<K, V>`).
3. **Worst Case Complexity**:
   - In Java 7: If a malicious attacker crafts keys with identical hash codes (hash collision DoS attack), all entries fall into one bucket, degrading lookup from $O(1)$ to **$O(n)$**.
   - In Java 8+: The Red-Black Tree guarantees that worst-case lookup remains bounded at **$O(\log n)$**.

```
[table bucket]
      |
 (size < 8) -> Node1 -> Node2 -> Node3 ... -> Node7 (O(k) traversal)
      |
 (size >= 8 && table.length >= 64)
      v
  TreeNode (Red-Black Tree, O(log k) traversal)
```

---

## 10. How does Java 8 HashMap use a Red-Black Tree?

### Why Red-Black Trees?
In Java 8, JEP 180 introduced tree bins to protect against pathological $O(n)$ collision degradation. A **Red-Black Tree** is a self-balancing binary search tree with guaranteed $O(\log k)$ search, insertion, and deletion.

### Thresholds Governing Treeification
- `TREEIFY_THRESHOLD = 8`: When a linked list bucket reaches 8 elements and capacity $\ge 64$, it converts from `Node<K,V>` to `TreeNode<K,V>`.
- `UNTREEIFY_THRESHOLD = 6`: During `resize()`, if split branches reduce a tree's node count to 6 or fewer, the tree is converted back into a lightweight `Node<K,V>` linked list.
- `MIN_TREEIFY_CAPACITY = 64`: Minimum table capacity before treeification is permitted.

### How Keys are Compared Inside the Tree
Because a BST requires an ordering relation ($<, =, >$):
1. If the key implements `Comparable<K>`, Java invokes `((Comparable<K>) k1).compareTo(k2)`.
2. If keys do not implement `Comparable` or compare as equal:
   - Java breaks ties using the key's class name.
   - If class names are identical, Java uses `System.identityHashCode(k1)` via `tieBreakOrder()`.

### Memory Footprint Trade-off
- A standard `Node<K, V>` has 4 fields: `hash, key, value, next` ($\approx 32$ bytes).
- A `TreeNode<K, V>` extends `LinkedHashMap.Entry` and has 8 fields: `hash, key, value, next, parent, left, right, prev, red` ($\approx 64$ bytes, double the size).
- Therefore, trees are used strictly as a safeguard when collision chains become unusually deep.

---

## 11. Why should equals() and hashCode() be overridden together?

### The Java Contract (`java.lang.Object`)
1. **Consistency**: If two objects are equal according to `equals(Object)`, they **MUST** produce the exact same `hashCode()`.
2. **Reverse is Not Required**: If two objects produce the same `hashCode()`, they are not necessarily equal (this is simply a hash collision).

### What Breaks If You Violate the Contract?

#### Scenario: `equals()` is overridden, but `hashCode()` is NOT
If two objects are logically equal (e.g., two `Person` objects with `id = 101`), but `hashCode()` is not overridden, they inherit `Object.hashCode()` which derives from the object's native memory address.
1. `map.put(new Person(101), "Engineer")`: Hash is computed (e.g. `123456`), entry placed in bucket 3.
2. `map.get(new Person(101))`: A new instance is created. Its inherited hash code is different (e.g. `789012`), routing Java to **bucket 9**.
3. Bucket 9 is empty, returning `null`! The object cannot be retrieved even though `p1.equals(p2) == true`.

```java
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

public class EqualsHashCodeContractDemo {
    static class BrokenKey {
        int id;
        BrokenKey(int id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            BrokenKey brokenKey = (BrokenKey) o;
            return id == brokenKey.id;
        }
        // BUG: hashCode() is NOT overridden!
    }

    static class ProperKey {
        int id;
        ProperKey(int id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            ProperKey properKey = (ProperKey) o;
            return id == properKey.id;
        }

        @Override
        public int hashCode() {
            return Objects.hash(id); // Matches equals logic!
        }
    }

    public static void main(String[] args) {
        // Test BrokenKey
        Map<BrokenKey, String> brokenMap = new HashMap<>();
        brokenMap.put(new BrokenKey(1), "Found Me!");
        System.out.println("BrokenKey get: " + brokenMap.get(new BrokenKey(1))); // Prints null!

        // Test ProperKey
        Map<ProperKey, String> properMap = new HashMap<>();
        properMap.put(new ProperKey(1), "Found Me!");
        System.out.println("ProperKey get: " + properMap.get(new ProperKey(1))); // Prints "Found Me!"
    }
}
```

---

## 12. Why are immutable objects preferred as HashMap keys?

### The "Lost Key" Problem (Silent Data Corruption)
If a mutable object is used as a `HashMap` key and its state changes after insertion:
1. When `map.put(key, val)` is called, `key.hashCode()` calculates the bucket index (e.g. bucket 4). The node is stored there.
2. Later, the user modifies the key's internal fields (e.g. `key.setName("Alice")`).
3. Now, `key.hashCode()` generates a completely **different hash code**.
4. When `map.get(key)` is invoked:
   - HashMap recalculates `index = (n - 1) & newHash`.
   - The new hash points to **bucket 11** instead of bucket 4!
   - Bucket 11 does not contain the entry $\implies$ returns `null`.
5. The entry still exists inside bucket 4, but cannot be retrieved or removed by its key, creating a **silent memory leak**.

### Why `String` and `Integer` are Ideal Keys
- **Immutable**: Once instantiated, their fields cannot be modified. Their hash codes never change.
- **Cached Hash Code**: `java.lang.String` caches its 32-bit hash value in a private `hash` field after first calculation. Subsequent `hashCode()` calls return in $O(1)$ without re-scanning characters.

```java
import java.util.HashMap;
import java.util.Map;

public class MutableKeyDangerDemo {
    static class MutableKey {
        String name;
        MutableKey(String name) { this.name = name; }

        @Override
        public int hashCode() { return name.hashCode(); }
        @Override
        public boolean equals(Object o) {
            return (o instanceof MutableKey) && ((MutableKey) o).name.equals(this.name);
        }
    }

    public static void main(String[] args) {
        Map<MutableKey, String> map = new HashMap<>();
        MutableKey key = new MutableKey("Original");
        map.put(key, "Sensitive Data");

        // Mutating the key after insertion
        key.name = "Modified";

        // Querying with the exact same instance fails!
        System.out.println("Lookup after mutation: " + map.get(key)); // prints null
        System.out.println("Map size: " + map.size()); // size is still 1! (Memory leak)
    }
}
```

---

# 3. Stack & Queue

## 13. How are Stack and Queue implemented internally?

### Stack Internals (LIFO — Last In, First Out)
A Stack can be implemented via:
1. **Array-Backed Stack**:
   - Maintains an array `elements[]` and a pointer `top = -1`.
   - `push(x)`: increments `top` and assigns `elements[++top] = x`. If capacity is exceeded, doubles the backing array.
   - `pop()`: reads `elements[top--]`.
   - **Performance**: $O(1)$ amortized push, $O(1)$ pop. High cache locality.
2. **Linked-List-Backed Stack**:
   - Maintains a pointer `head`.
   - `push(x)`: creates `new Node(x, head)` and updates `head`.
   - `pop()`: reads `head.val` and moves `head = head.next`.
   - **Performance**: Guaranteed $O(1)$ push/pop without resizing spikes, but higher memory overhead per element.

*Note on Java's `java.util.Stack`*: Legacy class that extends `Vector`. Every method (`push`, `pop`, `peek`) is `synchronized`, adding unnecessary locking overhead. Modern Java best practice is to use `Deque<T> stack = new ArrayDeque<>()`.

### Queue Internals (FIFO — First In, First Out)
A Queue maintains two logical ends: `head` (or `front`) for dequeueing, and `tail` (or `rear`) for enqueueing.
1. **Naive Array Queue Problem**:
   If elements are dequeued from index 0, either all remaining elements must shift left ($O(n)$ dequeue), or `head` moves forward, leaving wasted dead space at the front of the array.
2. **Linked-List Queue**:
   Maintains `head` and `tail` pointers.
   - `enqueue(x)`: appends to `tail.next`, updates `tail = tail.next`. ($O(1)$)
   - `dequeue()`: reads `head.val`, advances `head = head.next`. ($O(1)$)

```java
public class StackAndQueueInternals {
    // Array-backed Stack implementation
    public static class ArrayStack<T> {
        private Object[] data = new Object[10];
        private int top = -1;

        public void push(T val) {
            if (top == data.length - 1) resize();
            data[++top] = val;
        }

        @SuppressWarnings("unchecked")
        public T pop() {
            if (top == -1) throw new RuntimeException("Stack Underflow");
            T val = (T) data[top];
            data[top--] = null; // Prevent memory leak
            return val;
        }

        private void resize() {
            data = java.util.Arrays.copyOf(data, data.length * 2);
        }
    }
}
```

---

## 14. What is a Circular Queue, and why is it needed?

### Why is it Needed? (The Linear Queue Waste Problem)
In a simple array-backed queue where `front` moves forward upon dequeue and `rear` moves forward upon enqueue:
- After several `enqueue` and `dequeue` operations, `rear` reaches the end of the array (`rear == capacity - 1`), while indices `0` through `front - 1` are empty.
- A naive queue reports "Queue is Full" even though memory is completely available.
- Shifting all remaining elements left on every dequeue restores space, but costs **$O(n)$ per dequeue**, destroying real-time performance.

### How a Circular Queue Works
A **Circular Queue** conceptually connects the end of the array back to the beginning:

```
        [0]        [1]        [2]
       +----+     +----+     +----+
  [7]  |    |                | 10 |  [3] (front = 2)
       +----+                +----+
  [6]  | 40 |                | 20 |  [4]
       +----+     +----+     +----+
        [5]   <-   [4]   <-   [3]
     (rear = 6)
```

The pointers wrap around using the **modulo operator**:
- **Advance Rear (Enqueue)**:
  $$\text{rear} = (\text{rear} + 1) \pmod{\text{capacity}}$$
- **Advance Front (Dequeue)**:
  $$\text{front} = (\text{front} + 1) \pmod{\text{capacity}}$$
- **Full Condition**: `(rear + 1) % capacity == front` (or tracking an explicit `size == capacity`).
- **Empty Condition**: `size == 0` (or `front == rear`).

Both enqueue and dequeue operate in strictly **$O(1)$ time and $O(1)$ space** without moving elements.

### Java Implementation
```java
public class CircularQueue {
    private int[] data;
    private int front;
    private int rear;
    private int size;
    private int capacity;

    public CircularQueue(int k) {
        this.capacity = k;
        this.data = new int[k];
        this.front = 0;
        this.rear = -1;
        this.size = 0;
    }

    public boolean enQueue(int value) {
        if (isFull()) return false;
        rear = (rear + 1) % capacity;
        data[rear] = value;
        size++;
        return true;
    }

    public boolean deQueue() {
        if (isEmpty()) return false;
        front = (front + 1) % capacity;
        size--;
        return true;
    }

    public int Front() { return isEmpty() ? -1 : data[front]; }
    public int Rear() { return isEmpty() ? -1 : data[rear]; }
    public boolean isEmpty() { return size == 0; }
    public boolean isFull() { return size == capacity; }
}
```

---

## 15. How does Java's ArrayDeque work internally?

### Architecture of `java.util.ArrayDeque`
`ArrayDeque<E>` is Java's premier resizable-array implementation of the `Deque` (Double-Ended Queue) interface. It is faster than `Stack` when used as a stack, and faster than `LinkedList` when used as a queue.

1. **Backing Array**:
   ```java
   transient Object[] elements;
   transient int head;
   transient int tail;
   ```
2. **Power-of-Two Capacity Invariant**:
   `ArrayDeque` enforces that `elements.length` is strictly a power of two (default initial capacity is **16**).
3. **High-Performance Bitwise Pointer Wrapping**:
   Instead of using the expensive integer modulo `%`, `ArrayDeque` wraps indices using bitwise AND masking with `(elements.length - 1)`:
   - Moving Head Backward (`addFirst`):
     ```java
     head = (head - 1) & (elements.length - 1);
     elements[head] = e;
     ```
     For capacity 16 (`mask = 15 = 0b01111`): If `head == 0`, `(0 - 1) & 15 = -1 & 15 = 15`. The pointer instantly wraps around to the last slot in 1 CPU cycle!
   - Moving Tail Forward (`addLast`):
     ```java
     elements[tail] = e;
     tail = (tail + 1) & (elements.length - 1);
     ```

### Resizing (`doubleCapacity`)
When `head == tail`, the circular buffer is completely full.
- It allocates a new array of double the size: `int newCap = oldCap << 1`.
- It splits the elements into two chunks and copies them via `System.arraycopy`:
  1. Elements from `head` to `elements.length - 1` are copied to the beginning of the new array.
  2. Elements from index `0` to `head - 1` are copied immediately after.
- Resets `head = 0` and `tail = oldCap`.

### Why `ArrayDeque` Beats `LinkedList`
- **Memory**: `ArrayDeque` uses ~1 pointer reference per element; `LinkedList` allocates a 24-byte `Node` object with `prev`, `next`, and payload pointers for every single item.
- **Cache Locality**: Iterating over `ArrayDeque` accesses contiguous memory, leveraging hardware CPU prefetching.

```java
import java.util.ArrayDeque;
import java.util.Deque;

public class ArrayDequeDemo {
    public static void main(String[] args) {
        // Highly efficient Stack (LIFO)
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(10); // addFirst
        stack.push(20);
        System.out.println("Stack Pop: " + stack.pop()); // 20

        // Highly efficient Queue (FIFO)
        Deque<String> queue = new ArrayDeque<>();
        queue.offer("Customer 1"); // addLast
        queue.offer("Customer 2");
        System.out.println("Queue Poll: " + queue.poll()); // Customer 1
    }
}
```

---

# 4. Trees & Heaps

## 16. What is a Binary Search Tree, and what is its average and worst-case complexity?

### Binary Search Tree (BST) Invariant
A **Binary Search Tree** is a rooted binary tree where every node $x$ satisfies the BST property:
- All keys in the **left subtree** are strictly less than $x.key$: $\forall y \in \text{Left}(x), y.key < x.key$.
- All keys in the **right subtree** are strictly greater than $x.key$: $\forall z \in \text{Right}(x), z.key > x.key$.

```
         8
       /   \
      3     10
     / \      \
    1   6      14
       / \     /
      4   7   13
```

### Time Complexity Analysis
The time complexity of search, insert, and delete operations is strictly proportional to the **height of the tree ($h$)**:
$$T(n) = O(h)$$

| Operation | Average Case (Balanced) | Worst Case (Skewed) |
| :--- | :--- | :--- |
| **Search** | **$O(\log n)$** | **$O(n)$** |
| **Insertion** | **$O(\log n)$** | **$O(n)$** |
| **Deletion** | **$O(\log n)$** | **$O(n)$** |
| **Space** | $O(n)$ | $O(n)$ |

### Why Worst Case Degrades to O(n)
If elements are inserted in **sorted or nearly sorted order** (e.g., inserting `[1, 2, 3, 4, 5]`):
- Every new node becomes the right child of the previous node.
- The tree degenerates into a **singly linked list** with height $h = n$.
- Binary search benefits are lost, requiring linear traversal.

```java
public class BSTNode {
    int val;
    BSTNode left, right;
    public BSTNode(int val) { this.val = val; }

    // Average: O(log n), Worst (skewed): O(n)
    public static boolean search(BSTNode root, int target) {
        BSTNode curr = root;
        while (curr != null) {
            if (curr.val == target) return true;
            else if (target < curr.val) curr = curr.left;
            else curr = curr.right;
        }
        return false;
    }
}
```

---

## 17. What is a balanced BST, and why do we need AVL or Red-Black Trees?

### Definition of a Balanced BST
A Binary Search Tree is considered **height-balanced** if its height is mathematically bounded by a logarithmic function of the number of nodes:
$$h = O(\log_2 n)$$
In an ideally balanced tree of $n = 1,000,000$ nodes, the height is $\approx \log_2(10^6) \approx 20$. In an unbalanced tree, height can be $1,000,000$.

### Why Naive BSTs are Dangerous in Production
- Real-world data is frequently sorted, sequential (e.g. auto-increment IDs, timestamps), or clustered.
- Feeding sorted data into an unbalanced BST causes immediate performance collapse to $O(n)$ linked-list scanning and risks `StackOverflowError` from deep recursion stacks.

### How Self-Balancing Trees Solve This
Self-balancing trees like **AVL Trees** and **Red-Black Trees** augment tree nodes with balance metadata (height or color). On every insertion and deletion:
1. They perform standard BST operations.
2. They trace back up the insertion path to verify balancing invariants.
3. If an invariant is violated, they execute **Tree Rotations** (Left Rotation, Right Rotation, or double rotations) in $O(1)$ time to restore height balance.
4. This guarantees that tree height never exceeds $c \cdot \log n$, ensuring **strict $O(\log n)$ worst-case performance**.

```
Right Rotation around Node Y:
      Y                      X
     / \     Rotate Right   / \
    X   C   ------------>  A   Y
   / \                        / \
  A   B                      B   C
```

---

## 18. What is the difference between AVL Tree and Red-Black Tree?

### Mechanical Comparison

| Feature | AVL Tree | Red-Black Tree |
| :--- | :--- | :--- |
| **Balancing Metric** | **Strict Height Balance**: For every node, $\lvert \text{height}(\text{left}) - \text{height}(\text{right}) \rvert \le 1$. | **Color Properties**: Red and Black node invariants. |
| **Maximum Height** | $\approx 1.44 \log_2(n + 2)$ | $\le 2 \log_2(n + 1)$ |
| **Balance Strictness** | **Very strict** (near-perfect balance) | **Looser balance** (longest path $\le 2 \times$ shortest path) |
| **Lookup Speed (`get`)** | **Faster** (due to flatter height) | Slightly slower (up to 30% deeper trees) |
| **Insertion / Deletion** | Slower (frequent single & double rotations) | **Faster** (at most 2 rotations for insert, 3 for delete) |
| **Node Overhead** | 1 integer for height per node | 1 bit for color (`boolean isRed`) |
| **Standard Uses** | In-memory lookup tables, databases where reads $\gg$ writes | `java.util.TreeMap`, `TreeSet`, Java 8 `HashMap`, C++ `std::map`, Linux kernel CPU scheduler |

### Red-Black Tree Invariants
1. Every node is either **Red** or **Black**.
2. The root node is always **Black**.
3. Every leaf node (`NIL` or `null`) is considered **Black**.
4. If a node is **Red**, both of its children must be **Black** (no two consecutive red nodes on any path).
5. For each node, every simple path from that node to any of its descendant `NIL` leaves contains the exact same number of black nodes (**Black-Height invariant**).

### Architectural Takeaway
- Choose **AVL** when search performance is paramount and writes are rare.
- Choose **Red-Black** when the workload contains a balanced mix of frequent insertions, deletions, and lookups.

---

## 19. How does a Binary Heap work internally?

### What is a Binary Heap?
A **Binary Heap** is a complete binary tree implemented efficiently within a flat array that satisfies the **Heap Order Property**:
- **Min-Heap**: Every parent node is less than or equal to its children: $\text{parent} \le \text{child}$. (Root holds the minimum value).
- **Max-Heap**: Every parent node is greater than or equal to its children: $\text{parent} \ge \text{child}$. (Root holds the maximum value).

### Array Representation (Zero-Based Indexing)
Because a binary heap is a complete binary tree (filled on all levels except possibly the last, which is filled from left to right), it requires **zero pointer overhead**. Relationships are computed mathematically:

```
Array:   [10, 15, 30, 40, 50, 100, 40]
Index:     0   1   2   3   4    5   6

Tree Visualization:
             10 (i=0)
           /    \
     (i=1) 15     30 (i=2)
          /  \   /  \
        40   50 100 40  (indices 3, 4, 5, 6)
```

For any node at index $i$:
$$\text{Parent}(i) = \left\lfloor \frac{i - 1}{2} \right\rfloor, \quad \text{Left Child}(i) = 2i + 1, \quad \text{Right Child}(i) = 2i + 2$$

### Internal Operations
1. **Insert (`offer`) — Sift-Up**:
   - Append the new element to the end of the array (maintaining the complete tree structure).
   - "Bubble up": compare with parent. If smaller (for min-heap), swap with parent. Repeat until heap order is restored or root is reached.
   - **Time Complexity**: $O(\log n)$.
2. **Extract Min (`poll`) — Sift-Down**:
   - The minimum element is at `arr[0]`.
   - Replace `arr[0]` with the last element in the array (`arr[size - 1]`).
   - Decrement size.
   - "Bubble down": compare current node with its smaller child. If current node is greater, swap with the smaller child. Repeat down the tree.
   - **Time Complexity**: $O(\log n)$.

---

## 20. How does Java PriorityQueue work internally?

### Internal Architecture
Java's `PriorityQueue<E>` is an unbounded, array-backed min-heap:
```java
transient Object[] queue; // Backing array
int size = 0;
Comparator<? super E> comparator;
```
- By default, it operates as a **Min-Heap** using natural ordering (`Comparable`).
- Passing a custom `Comparator` (e.g. `Collections.reverseOrder()`) configures it as a **Max-Heap**.

### Growth Policy (`grow`)
- Initial default capacity: **11**.
- When `size >= queue.length`:
  - If capacity $< 64$, it grows by **+2** plus old capacity: `newCapacity = oldCapacity + (oldCapacity + 2)` ($\approx 100\%$ growth).
  - If capacity $\ge 64$, it grows by **50%**: `newCapacity = oldCapacity + (oldCapacity >> 1)`.

### Core Source Code: `siftUp` and `siftDown`
```java
public class CustomMinHeap<T extends Comparable<T>> {
    private Object[] queue = new Object[11];
    private int size = 0;

    public void offer(T val) {
        if (size >= queue.length) {
            queue = java.util.Arrays.copyOf(queue, queue.length * 2);
        }
        siftUp(size++, val);
    }

    @SuppressWarnings("unchecked")
    private void siftUp(int k, T key) {
        while (k > 0) {
            int parent = (k - 1) >>> 1;
            Object e = queue[parent];
            if (key.compareTo((T) e) >= 0) break; // Heap property satisfied
            queue[k] = e; // Move parent down
            k = parent;
        }
        queue[k] = key;
    }

    @SuppressWarnings("unchecked")
    public T poll() {
        if (size == 0) return null;
        int s = --size;
        T result = (T) queue[0];
        T x = (T) queue[s];
        queue[s] = null;
        if (s != 0) siftDown(0, x);
        return result;
    }

    @SuppressWarnings("unchecked")
    private void siftDown(int k, T key) {
        int half = size >>> 1; // Loop while k has at least one child
        while (k < half) {
            int child = (k << 1) + 1; // Left child
            Object c = queue[child];
            int right = child + 1;
            if (right < size && ((Comparable<Object>) c).compareTo(queue[right]) > 0) {
                c = queue[child = right]; // Pick smaller of two children
            }
            if (key.compareTo((T) c) <= 0) break;
            queue[k] = c;
            k = child;
        }
        queue[k] = key;
    }
}
```

---

# 5. Graphs & Tries

## 21. What is the difference between an adjacency list and adjacency matrix?

### Mechanical Comparison

```
Graph: (0)---(1)
        |   /
        |  /
       (2)

Adjacency Matrix (int[3][3]):
     0  1  2
  0 [0, 1, 1]
  1 [1, 0, 1]
  2 [1, 1, 0]

Adjacency List (List<List<Integer>>):
  0: [1, 2]
  1: [0, 2]
  2: [0, 1]
```

### Detailed Trade-Off Matrix

| Metric | Adjacency Matrix | Adjacency List |
| :--- | :--- | :--- |
| **Data Structure** | 2D Array: `int[V][V]` or `boolean[V][V]` | Array/Map of Lists: `List<Integer>[]` |
| **Space Complexity** | **$O(V^2)$** (always, regardless of edges) | **$O(V + E)$** (proportional to edges) |
| **Check Edge $(u, v)$** | **$O(1)$** (`matrix[u][v] != 0`) | $O(\text{degree}(u))$ (scan neighbors) |
| **Find All Neighbors** | $O(V)$ (must inspect entire row) | **$O(\text{degree}(u))$** (iterate neighbor list) |
| **Add Vertex** | $O(V^2)$ (reallocate new 2D matrix) | **$O(1)$** (append new entry to list) |
| **Best Used When** | **Dense Graphs** ($E \approx V^2$), small $V$, frequent edge lookups | **Sparse Graphs** ($E \ll V^2$), real-world networks |

### Java Implementation
```java
import java.util.*;

public class GraphRepresentations {
    // 1. Adjacency Matrix
    public static class AdjMatrixGraph {
        private boolean[][] matrix;
        public AdjMatrixGraph(int v) { matrix = new boolean[v][v]; }
        public void addEdge(int u, int v) { matrix[u][v] = true; matrix[v][u] = true; }
        public boolean hasEdge(int u, int v) { return matrix[u][v]; } // O(1)
    }

    // 2. Adjacency List (Standard in competitive programming & industry)
    public static class AdjListGraph {
        private List<List<Integer>> adj;
        public AdjListGraph(int v) {
            adj = new ArrayList<>(v);
            for (int i = 0; i < v; i++) adj.add(new ArrayList<>());
        }
        public void addEdge(int u, int v) { adj.get(u).add(v); adj.get(v).add(u); }
        public List<Integer> getNeighbors(int u) { return adj.get(u); } // O(deg(u))
    }
}
```

---

## 22. Why does BFS use a Queue and DFS use a Stack?

### The Core Algorithmic Difference
- **Breadth-First Search (BFS)** explores graph nodes **level by level** (radially outward).
- **Depth-First Search (DFS)** explores a branch as deeply as possible before **backtracking**.

### Why BFS Requires a FIFO Queue
1. In BFS, all vertices at distance $k$ from the source must be processed **strictly before** any vertex at distance $k + 1$.
2. When visiting node $u$ at distance $k$, its neighbors (distance $k + 1$) are discovered.
3. A **FIFO (First-In, First-Out) Queue** guarantees that earlier-discovered nodes (distance $k$) are dequeued and processed ahead of later-discovered nodes (distance $k + 1$).
4. This mathematical property guarantees that BFS finds the **shortest path in unweighted graphs**.

### Why DFS Requires a LIFO Stack
1. In DFS, once a neighbor $v$ of node $u$ is discovered, the algorithm immediately plunges deeper into $v$'s sub-graph, pausing the exploration of $u$'s other neighbors.
2. A **LIFO (Last-In, First-Out) Stack** naturally facilitates this: the most recently discovered vertex is placed at the top of the stack and processed immediately.
3. When a dead end is reached, popping from the stack backtracks to the previous junction point.
4. (The standard recursive version of DFS uses the **JVM Call Stack** as its implicit LIFO stack).

```java
import java.util.*;

public class TraversalComparison {
    // BFS: Level-by-level via Queue
    public static void bfs(int start, List<List<Integer>> adj) {
        boolean[] visited = new boolean[adj.size()];
        Queue<Integer> queue = new LinkedList<>();

        visited[start] = true;
        queue.offer(start);

        while (!queue.isEmpty()) {
            int curr = queue.poll(); // FIFO: Process oldest first
            for (int neighbor : adj.get(curr)) {
                if (!visited[neighbor]) {
                    visited[neighbor] = true;
                    queue.offer(neighbor);
                }
            }
        }
    }

    // DFS: Deep dive via Stack (Iterative)
    public static void dfs(int start, List<List<Integer>> adj) {
        boolean[] visited = new boolean[adj.size()];
        Deque<Integer> stack = new ArrayDeque<>();

        stack.push(start);

        while (!stack.isEmpty()) {
            int curr = stack.pop(); // LIFO: Process most recently added first
            if (!visited[curr]) {
                visited[curr] = true;
                for (int neighbor : adj.get(curr)) {
                    if (!visited[neighbor]) {
                        stack.push(neighbor);
                    }
                }
            }
        }
    }
}
```

---

## 23. What is a Trie, and how does prefix searching work?

### What is a Trie (Prefix Tree)?
A **Trie** is a specialized $k$-ary tree used for storing and retrieving strings efficiently.
- Instead of storing entire strings in individual nodes, each node represents a single character transition.
- All descendants of a node share a **common string prefix**.
- Root node represents an empty string `""`.

```
           (root)
          /      \
        'c'      't'
        /          \
      'a'          'o'
     /   \           \
   'r'   't'         'p'*
    |     |
  't'*   '*'
Words stored: "cart", "cat", "top" (* = isEndOfWord)
```

### Internal Node Architecture
Each `TrieNode` encapsulates:
1. `TrieNode[] children = new TrieNode[26];` (for lowercase English letters 'a' through 'z').
2. `boolean isEndOfWord;` (marks whether a complete word terminates at this node).

### How Prefix Searching Works
To check if any word starts with prefix `"ca"`:
1. Start at `root`.
2. For character `'c'`: calculate `idx = 'c' - 'a' = 2`. Follow `root.children[2]`.
3. For character `'a'`: calculate `idx = 'a' - 'a' = 0`. Follow `node.children[0]`.
4. If the pointer is non-null after traversing all characters of the prefix, return `true`.
5. **Time Complexity**: **$O(L)$** where $L$ is the length of the prefix string, completely **independent of the number of words $N$ stored in the dictionary**. (In contrast, searching an array of $N$ strings takes $O(N \times L)$).

```java
public class Trie {
    private static class TrieNode {
        TrieNode[] children = new TrieNode[26];
        boolean isEndOfWord = false;
    }

    private final TrieNode root = new TrieNode();

    // Insert word: O(L)
    public void insert(String word) {
        TrieNode curr = root;
        for (char c : word.toCharArray()) {
            int idx = c - 'a';
            if (curr.children[idx] == null) {
                curr.children[idx] = new TrieNode();
            }
            curr = curr.children[idx];
        }
        curr.isEndOfWord = true;
    }

    // Search exact word: O(L)
    public boolean search(String word) {
        TrieNode node = traversePrefix(word);
        return node != null && node.isEndOfWord;
    }

    // Prefix search (startsWith): O(L)
    public boolean startsWith(String prefix) {
        return traversePrefix(prefix) != null;
    }

    private TrieNode traversePrefix(String s) {
        TrieNode curr = root;
        for (char c : s.toCharArray()) {
            int idx = c - 'a';
            if (curr.children[idx] == null) return null;
            curr = curr.children[idx];
        }
        return curr;
    }
}
```

---

# 6. Important Comparisons

## 24. HashMap vs TreeMap: How are they implemented internally?

### Architectural Comparison

| Attribute | `java.util.HashMap` | `java.util.TreeMap` |
| :--- | :--- | :--- |
| **Underlying Data Structure** | **Hash Table** (Array of Buckets + Linked Lists + Red-Black Trees) | **Red-Black Tree** (`Entry<K, V>` nodes) |
| **Key Ordering** | **Unordered** / Non-deterministic (depends on hash codes) | **Sorted** (Natural ordering or custom `Comparator`) |
| **`get` / `put` / `remove`** | **$O(1)$** average, $O(\log n)$ worst case | **$O(\log n)$** guaranteed worst case |
| **Null Key Handling** | Permits **1 `null` key** (always placed at bucket index 0) | **No `null` keys** (throws `NullPointerException` due to `compareTo()` comparison) |
| **Key Requirements** | Must properly implement `hashCode()` and `equals()` | Must implement `Comparable<K>` or provide a `Comparator` |
| **Navigational Queries** | None | Rich API: `firstKey()`, `lastKey()`, `floorKey()`, `ceilingKey()`, `subMap()` |
| **Memory Consumption** | Lower per entry | Higher (parent, left, right, color pointers per node) |

### When to Use Which
- **Use `HashMap`** by default for standard key-value mappings when order does not matter and peak throughput is required.
- **Use `TreeMap`** when elements must be iterated in sorted order, or when performing range queries (e.g. "find all transactions between timestamp A and timestamp B").

```java
import java.util.*;

public class MapComparisonDemo {
    public static void main(String[] args) {
        // HashMap: Unpredictable iteration order
        Map<Integer, String> hashMap = new HashMap<>();
        hashMap.put(50, "Fifty");
        hashMap.put(10, "Ten");
        hashMap.put(30, "Thirty");
        System.out.println("HashMap Keys: " + hashMap.keySet()); // [50, 10, 30] or arbitrary

        // TreeMap: Strictly sorted iteration order
        TreeMap<Integer, String> treeMap = new TreeMap<>();
        treeMap.put(50, "Fifty");
        treeMap.put(10, "Ten");
        treeMap.put(30, "Thirty");
        System.out.println("TreeMap Keys: " + treeMap.keySet()); // [10, 30, 50] (sorted!)
        
        // Range Query with TreeMap
        System.out.println("Floor Key for 35: " + treeMap.floorKey(35)); // 30
        System.out.println("Ceiling Key for 35: " + treeMap.ceilingKey(35)); // 50
    }
}
```

---

## 25. HashMap vs ConcurrentHashMap: How does ConcurrentHashMap handle concurrency?

### Why `HashMap` is Not Thread-Safe
If multiple threads mutate a `HashMap` concurrently:
1. **Lost Updates**: Two threads inserting into the same bucket simultaneously can overwrite each other's references.
2. **Infinite Loops (Java 7)**: Head-insertion during resizing could form circular pointer loops (`A.next = B; B.next = A`), causing CPU utilization to spike to 100%.
3. **Fail-Fast Iterators**: `HashMap` maintains a `modCount`. If modified concurrently while iterating, it throws `ConcurrentModificationException`.

### How `ConcurrentHashMap` Handles Concurrency

#### Java 7 Architecture (Segment-Based Partitioning)
- Used **ReentrantLock** striped across 16 `Segment` objects (each Segment acted as an independent hash table).
- Allowed 16 concurrent writes without blocking.

#### Java 8+ Modern Architecture (Fine-Grained Node-Level Locking)
In Java 8, segments were replaced with a flat `Node<K, V>[] table` utilizing **CAS (Compare-And-Swap) + `synchronized` on individual bucket heads**:

1. **Lock-Free Reads (`get`)**:
   - `get()` is completely **lock-free and non-blocking**.
   - Node values and `next` pointers are declared `volatile`:
     ```java
     volatile V val;
     volatile Node<K,V> next;
     ```
   - Hardware CPU cache coherency guarantees that any update made by a writing thread is immediately visible to reading threads without locks.

2. **Lock-Free Empty Bucket Insertions (CAS)**:
   - When inserting into an empty bucket (`table[i] == null`), it uses hardware CAS:
     ```java
     U.compareAndSetObject(tab, ((long)i << ASHIFT) + ABASE, null, new Node<>(...))
     ```
   - No mutex locks are acquired. If CAS fails (another thread raced in), it retries in a loop.

3. **Fine-Grained Locking for Collisions (`synchronized` on Bucket Head)**:
   - If bucket `table[i]` is not empty, it locks **only that individual head node**:
     ```java
     synchronized (f) { // f is the head Node of bucket i
         // Insert into linked list or Red-Black Tree
     }
     ```
   - Other threads writing to different buckets (`table[j]` where $j \ne i$) proceed in parallel without contention!

4. **Concurrent Resizing (`transfer`)**:
   - Resizing is multi-threaded! Multiple threads can participate cooperatively in moving chunks of buckets from old table to new table via a shared forwarding node (`ForwardingNode`).

5. **Thread-Safe Sizing (`LongAdder` pattern)**:
   - Instead of a single atomic integer for `size()`, it uses an internal `CounterCell[]` striped array (similar to `LongAdder`) to avoid thread contention on a single memory location.

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

public class ConcurrentHashMapDemo {
    public static void main(String[] args) throws InterruptedException {
        Map<String, Integer> map = new ConcurrentHashMap<>();

        // Multi-threaded concurrent updates without manual synchronization
        Runnable task = () -> {
            for (int i = 0; i < 1000; i++) {
                map.merge("counter", 1, Integer::sum); // Atomic read-modify-write
            }
        };

        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);
        t1.start();
        t2.start();
        t1.join();
        t2.join();

        System.out.println("Final Counter Value: " + map.get("counter")); // Exactly 2000!
    }
}
```

---
