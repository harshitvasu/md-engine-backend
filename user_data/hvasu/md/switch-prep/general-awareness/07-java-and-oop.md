# 7. Java & OOP

---

### 7.1 JDK vs JRE vs JVM

```
+-------------------------------------------------------------+
| JDK (Java Development Kit)                                  |
| [Development Tools: javac, jdb, jstack, jmap, jps]          |
| +---------------------------------------------------------+ |
| | JRE (Java Runtime Environment)                          | |
| | [Core Class Libraries: rt.jar, java.base, util, io]     | |
| | +-----------------------------------------------------+ | |
| | | JVM (Java Virtual Machine)                          | | |
| | | [Class Loader, Bytecode Verifier, Execution Engine, | | |
| | |  JIT Compiler, Garbage Collector]                   | | |
| | +-----------------------------------------------------+ | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
```

1. **JVM (Java Virtual Machine):**
   - The abstract runtime engine that executes compiled Java bytecode (`.class` files).
   - **Platform-Dependent:** While Java bytecode is platform-independent ("Write Once, Run Anywhere"), the JVM itself is platform-specific (custom builds for Linux, macOS, Windows).
   - Responsibilities: Loads bytecode via ClassLoader, verifies bytecode for safety, allocates heap/stack memory, performs JIT (Just-In-Time) compilation to convert hot bytecode into native machine instructions, and runs automated Garbage Collection.
2. **JRE (Java Runtime Environment):**
   - Package providing the minimum requirements to **execute** a pre-compiled Java program: JVM + Core Java Runtime Class Libraries (`java.lang`, `java.util`, `java.io`).
   - Contains no development utilities (no `javac` compiler).
3. **JDK (Java Development Kit):**
   - The complete software package required to **develop, compile, debug, and run** Java software: JRE + JVM + Development and diagnostics tools (`javac`, `javadoc`, `jar`, `jstack`, `jcmd`, `jconsole`).

---

### 7.2 Interface vs abstract class

| Dimension | Interface | Abstract Class |
| :--- | :--- | :--- |
| **Architectural Purpose** | Defines a **behavioral contract** ("What a class can do"). Represents capabilities. | Defines an **incomplete base entity** ("What a class is"). Represents core identity and shared implementation. |
| **Multiple Inheritance** | A class can implement **multiple interfaces** (`implements A, B, C`). | A class can extend **only one abstract class** (`extends AbstractClass`). |
| **State & Instance Fields** | **Cannot maintain instance state.** Variables are implicitly `public static final` (constants only). | Can maintain **mutable instance fields**, private variables, and internal state. |
| **Constructors** | **No constructors allowed.** Cannot be instantiated. | **Can have constructors** invoked by subclass constructors via `super()`. |
| **Method Implementations** | Traditionally all abstract. Since Java 8, supports `default` and `static` methods; Java 9 added `private` helper methods. | Can have any mix of fully implemented concrete methods and `abstract` method signatures. |
| **Access Modifiers** | Methods are implicitly `public` (or explicit `private` helpers). | Methods can have any access modifier (`public`, `protected`, `package-private`, `private`). |

**Design Rule of Thumb:**
- Use an **Abstract Class** when sharing state, non-static fields, or common internal base implementation among closely related classes in an inheritance hierarchy.
- Use an **Interface** to define a polymorphic contract or functional capability across otherwise completely unrelated classes (e.g., `Comparable`, `AutoCloseable`, `Serializable`).

---

### 7.3 Inheritance vs composition

- **Inheritance ("Is-A" Relationship):**
  - A class derives attributes and behavior directly from an ancestor class (`class ElectricCar extends Car`).
  - **Drawbacks (The Fragile Base Class Problem):**
    - **Tight Coupling:** Subclasses depend intimately on the internal implementation details of the parent class. If the parent class alters an internal method, subclasses can silently break.
    - **Breaks Encapsulation:** Exposes protected parent internals to subclasses.
    - **Static Hierarchy:** Inheritance relationships are fixed at compile-time and cannot be reconfigured dynamically at runtime.
- **Composition ("Has-A" Relationship):**
  - A class achieves polymorphism and code reuse by holding references to other interface-based components and delegating execution to them (`class Car { private Engine engine; }`).
  - **Advantages:**
    - **Loose Coupling:** The outer class interacts strictly through public interfaces without caring about concrete implementation details.
    - **Runtime Flexibility:** Behavior can be swapped dynamically at runtime via Dependency Injection (e.g., swapping a `V8Engine` with an `ElectricMotor` strategy).
    - **Testability:** Simplifies unit testing by allowing developers to mock or stub composed dependencies cleanly.
- **Core Principle:** *"Favor object composition over class inheritance"* (Gang of Four).

---

### 7.4 Overloading vs overriding

| Dimension | Method Overloading (Compile-Time Polymorphism) | Method Overriding (Runtime Polymorphism) |
| :--- | :--- | :--- |
| **Definition** | Defining multiple methods in the **same class** with the identical name but **different parameter signatures**. | A **subclass** redefines a method declared in its superclass to provide a specialized implementation. |
| **Resolution Phase** | Resolved at **compile time** (Static Binding) based on the reference type of arguments. | Resolved at **runtime** (Dynamic Binding) via Virtual Method Table (vtable) based on the actual runtime object instance. |
| **Method Signature** | **Must differ** in parameter count, parameter types, or argument order. Return type alone is insufficient. | **Must be identical** in name, parameter count, and parameter types. Return type can be covariant (subtype). |
| **Exception Rules** | Can declare any checked or unchecked exceptions freely. | Cannot declare new or broader checked exceptions than the overridden method. |
| **Access Modifiers** | Can have different access modifiers freely. | Cannot be more restrictive than the superclass method (e.g., cannot override a `public` method as `protected`). |

---

### 7.5 How does HashMap work internally?

Java's `HashMap` operates on the principle of **hashing** using an internal array of buckets (`Node<K,V>[] table`), combining linked lists and balanced trees to manage hash collisions.

```
table[index]
 [0]  ---> null
 [1]  ---> [Node: Key1, Val1] ---> [Node: Key2, Val2]  (Linked List collision)
 [2]  ---> null
 [3]  ---> [TreeNode (Red-Black Balanced Tree)]        (Treeified bucket)
```

#### The `put(K, V)` Internal Workflow:
1. **Hash Calculation & Bit Spreading:**
   The key's `hashCode()` is passed through a bitwise spreading function to prevent high-bit clustering:
   $$h = \text{key.hashCode()} \oplus (h \ggg 16)$$
2. **Bucket Index Determination:**
   Calculates the target array index using a bitwise AND operation (equivalent to modulo when capacity $n$ is always a power of 2):
   $$\text{index} = (n - 1) \ \& \ h$$
3. **Handling Collisions:**
   - **Empty Bucket:** If the bucket at `table[index]` is null, a new `Node(hash, key, value, null)` is placed directly.
   - **Collision (Bucket Occupied):**
     - Traverses the linked list: Checks if `node.hash == hash && (node.key == key || node.key.equals(key))`.
     - If the key already exists, updates the value and returns the old value.
     - If not found, appends the new node at the tail of the list.
4. **Treeification (Java 8 Optimization):**
   - When the number of colliding elements in a single bucket reaches **`TREEIFY_THRESHOLD = 8`** and the total hash map capacity is $\ge 64$, the linked list converts into a **Red-Black Balanced Binary Search Tree (`TreeNode`)**.
   - This shifts the worst-case search complexity from $O(N)$ (linked list traversal) to **$O(\log N)$**, mitigating HashDoS vulnerability attacks.
5. **Resizing & Rehashing:**
   - When total entries exceed $\text{threshold} = \text{capacity} \times \text{loadFactor}$ (default capacity = 16, default load factor = 0.75, threshold = 12), the array doubles in capacity ($n \times 2$).
   - Elements are re-indexed smoothly using bitwise masking (`hash & oldCap`).

---

### 7.6 ArrayList vs LinkedList

| Dimension | `ArrayList` | `LinkedList` |
| :--- | :--- | :--- |
| **Underlying Data Structure** | Dynamic, resizable array. | Doubly-linked list composed of separate `Node` objects (`prev`, `next`, `item`). |
| **Random Access by Index (`get(i)`)** | **$O(1)$ Constant Time:** Direct memory pointer arithmetic (`base_address + i * element_size`). | **$O(N)$ Linear Time:** Must traverse the list sequentially from the head or tail to reach index $i$. |
| **Insert / Delete at Arbitrary Index** | **$O(N)$:** Requires shifting all subsequent elements using native `System.arraycopy()`. | **$O(1)$** to re-point node pointers *once the iterator is already positioned at the target node*. |
| **Insert at Tail (`add()`)** | Amortized $O(1)$. Occasional $O(N)$ copy when array capacity doubles. | Constant $O(1)$ always (updates tail pointer). |
| **CPU Cache Locality & Performance** | **Superb:** Contiguous memory layout allows CPU pre-fetchers to pull adjacent items into L1/L2 hardware caches. | **Poor:** Nodes are allocated randomly across the heap, triggering frequent CPU cache misses. |
| **Memory Footprint** | Extremely low: Stores only the contiguous array of elements with unused capacity padding. | High overhead: Allocates a distinct `Node` object for every element, storing two 8-byte pointer references (`prev`, `next`). |

> **Production Verdict:** In modern real-world production environments, `ArrayList` consistently outperforms `LinkedList` for almost all use cases due to CPU cache spatial locality.

---

### 7.7 What are SOLID principles?

The SOLID principles are five object-oriented architectural guidelines formulated by Robert C. Martin ("Uncle Bob") to design maintainable, understandable, and extensible software systems:

1. **S — Single Responsibility Principle (SRP):**
   - *"A class should have one, and only one, reason to change."*
   - Each module, class, or function must encapsulate a single cohesive responsibility. For instance, an `OrderRepository` should persist orders to the DB, but should not calculate shipping costs or send invoice emails.
2. **O — Open/Closed Principle (OCP):**
   - *"Software entities should be open for extension, but closed for modification."*
   - System behavior should be extendable by writing new classes and implementing interfaces, rather than editing and destabilizing tested, working source code (e.g., using the Strategy pattern for payment gateways).
3. **L — Liskov Substitution Principle (LSP):**
   - *"Subtypes must be substitutable for their base types without altering the correctness of the program."*
   - If class $S$ is a subtype of $T$, any code expecting an object of type $T$ must function correctly when supplied with an instance of $S$. Violations occur when subclasses override parent methods to throw `UnsupportedOperationException` (e.g., a `Square` subclass modifying width and height simultaneously when substituted for a `Rectangle`).
4. **I — Interface Segregation Principle (ISP):**
   - *"Clients should not be forced to depend on interfaces they do not use."*
   - Avoid bloated, "fat" interfaces. Decompose large interfaces into small, cohesive, role-specific contracts (e.g., prefer separate `Printable` and `Scannable` interfaces over a monolithic `MultiFunctionPrinter` interface).
5. **D — Dependency Inversion Principle (DIP):**
   - *"High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions."*
   - Business services should never instantiate concrete database or third-party client classes directly using `new`. Instead, they depend on an interface passed in via constructor Dependency Injection (underpinning Spring IoC and NestJS architecture).
