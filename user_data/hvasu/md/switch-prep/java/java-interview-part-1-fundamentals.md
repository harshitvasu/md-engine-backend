# 1. Java Fundamentals

## 1. JDK vs JRE vs JVM?

### Core Definitions

To understand the Java runtime and build lifecycle, we must distinguish between its three primary layers: **JVM**, **JRE**, and **JDK**.

```
+-------------------------------------------------------------------------------+
| JDK (Java Development Kit)                                                    |
|   +-------------------------------------------------------------------------+ |
|   | JRE (Java Runtime Environment)                                          | |
|   |   +-------------------------------------------------------------------+ | |
|   |   | JVM (Java Virtual Machine)                                        | | |
|   |   |   - ClassLoader (Loading, Linking, Initialization)                 | | |
|   |   |   - Runtime Data Areas (Heap, Stack, Metaspace, PC, Native Stack) | | |
|   |   |   - Execution Engine (Interpreter, JIT Compiler, Garbage Collector)| | |
|   |   +-------------------------------------------------------------------+ | |
|   |   + Core Class Libraries (java.base, collections, io, net, util)        | |
|   +-------------------------------------------------------------------------+ |
|   + Development & Diagnostic Tools (javac, jar, jdb, javap, jconsole, jstack)  |
+-------------------------------------------------------------------------------+
```

### 1. JVM (Java Virtual Machine)
* **What it is:** An abstract virtual machine specification that provides the runtime execution environment for Java bytecode (`.class` files).
* **Core Responsibilities:**
  * **ClassLoader Subsystem:** Dynamically loads class files into memory, links dependencies, verifies bytecode safety, and initializes static state.
  * **Runtime Data Areas:**
    * *Heap:* Shared memory holding all instantiated objects and arrays.
    * *Metaspace (Java 8+):* Native memory area holding class metadata, method bytecode, and static variables (replaces Java 7 PermGen).
    * *JVM Stack:* Thread-private stack storing execution frames (local variables, operand stacks, return addresses).
    * *Program Counter (PC) Register:* Holds the address of the current executing JVM instruction per thread.
    * *Native Method Stack:* Houses stack frames for native C/C++ code executed via JNI.
  * **Execution Engine:** Translates bytecode into machine code using a combination of an **Interpreter** (instant execution) and **JIT (Just-In-Time) Compilers (C1 / C2)** that compile frequently executed "hot" code paths into native CPU instructions. It also manages automatic memory reclamation via the **Garbage Collector (GC)**.
* **Platform Dependency:** The JVM is strictly **platform-dependent**. Each operating system and architecture (Windows x86, macOS ARM64, Linux) requires a custom native JVM executable.

### 2. JRE (Java Runtime Environment)
* **What it is:** The runtime bundle containing the minimal software components needed to **run** an already compiled Java application.
* **Formula:** `JRE = JVM + Core Class Libraries + Supporting Configuration Files`
* **Contents:** Contains the standard platform libraries (`java.lang`, `java.util`, `java.io`, `java.math`, `java.net`), security policies, and the JVM itself. It does **not** include development utilities like `javac` or debuggers.

### 3. JDK (Java Development Kit)
* **What it is:** The complete software development bundle required to **write, compile, package, debug, and monitor** Java applications.
* **Formula:** `JDK = JRE + Developer CLI Tools`
* **Contents:** Includes everything in the JRE plus:
  * `javac`: The Java compiler that transforms `.java` source code into `.class` bytecode.
  * `jar`: The archiving utility for packaging files into JAR / WAR formats.
  * `javap`: The bytecode disassembler.
  * `jdb`: Command-line debugger.
  * `jstack`, `jmap`, `jstat`, `jcmd`: Diagnostic and thread/heap profiling tools.

### Comparison Summary

| Dimension | JVM | JRE | JDK |
| :--- | :--- | :--- | :--- |
| **Primary Role** | Executes bytecode | Runs compiled Java programs | Develops and compiles Java code |
| **Includes** | Execution engine & memory areas | JVM + Standard runtime libraries | JRE + Compiler (`javac`) + Diagnostic tools |
| **Target User** | Internal JVM execution | End users & production servers | Software developers |
| **Platform Dependent?** | Yes | Yes | Yes |

> **Note on Modern Java (Java 9+):** Standalone JRE distribution packages were eliminated starting with Java 9. With the modular system (JPMS), developers use the `jlink` tool to bundle a tailored, lightweight runtime containing only the specific JVM modules required by their application.

---

## 2. How does Java achieve platform independence?

### The Core Mechanism: "Write Once, Run Anywhere" (WORA)

Java achieves platform independence by decoupling the source code compilation from the physical host computer's hardware and operating system. 

Instead of compiling human-readable code directly into native machine code (as in C/C++), Java utilizes a **two-phase compilation and execution pipeline**:

1. **Compilation Phase (Platform-Independent):** The Java compiler (`javac`) processes `.java` source files and translates them into an intermediate, standardized binary representation called **Bytecode** stored in `.class` files. Bytecode is completely agnostic of any CPU architecture or operating system.
2. **Execution Phase (Platform-Dependent):** The target machine hosts a native **JVM** built specifically for that operating system. The JVM interprets and JIT-compiles this uniform bytecode into native assembly instructions for the host CPU (x86_64, ARM, etc.).

```
                 [Application.java]
                         |
                 (javac compiler)
                         |
                 [Application.class]  <--- Universal Bytecode
                /        |        \
               /         |         \
         Windows JVM  Linux JVM   macOS JVM  <--- Platform-Specific JVMs
              |          |           |
          [x86-64]    [ARM64]     [Apple M]  <--- Native CPU Machine Code
```

### The Key Paradox
* **Java Source Code & Bytecode:** 100% Platform-Independent.
* **Java Virtual Machine (JVM):** Platform-Dependent. A distinct JVM binary must be compiled for Windows, macOS, Linux, etc.

### Code and Bytecode Example

Consider this simple class:

```java
// HelloWorld.java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, Platform Independence!");
    }
}
```

Compiling and inspecting the bytecode:
```bash
javac HelloWorld.java
javap -c HelloWorld
```

The disassembled bytecode opcodes:
```text
Compiled from "HelloWorld.java"
public class HelloWorld {
  public HelloWorld();
    Code:
       0: aload_0
       1: invokespecial #1 // Method java/lang/Object."<init>":()V
       4: return

  public static void main(java.lang.String[]);
    Code:
       0: getstatic     #7 // Field java/lang/System.out:Ljava/io/PrintStream;
       3: ldc           #13 // String Hello, Platform Independence!
       5: invokevirtual #15 // Method java/io/PrintStream.println:(Ljava/lang/String;)V
       8: return
}
```

Every compliant JVM on any operating system understands the exact semantics of `getstatic`, `ldc`, and `invokevirtual`, translating them into the appropriate native OS system calls at runtime.

---

## 3. Is Java pass-by-value or pass-by-reference?

### The Definitive Answer

> **Java is strictly PASS-BY-VALUE — always, without exception.**

Confusion often arises because Java works with objects through **object references**. When an object is passed to a method, you are **not** passing the object itself, nor are you passing a reference by reference. You are passing a **copy of the reference value** (the 32-bit or 64-bit memory pointer address) **by value**.

* **For Primitives (`int`, `double`, `boolean`, etc.):** The actual raw bits/value is copied onto the called method's stack frame. Modifying the parameter variable has zero impact on the caller's variable.
* **For Objects (`String`, `List`, custom classes):** The memory address pointing to the object on the heap is copied by value onto the called method's stack frame. Both the caller's reference variable and the method parameter variable hold distinct copies pointing to the identical heap location.

### What This Means in Practice

1. **Reassigning the parameter reference** inside the method does **not** change the caller's reference.
2. **Mutating the object's fields** through that copied reference **does** mutate the object in heap memory, visible to the caller.

### Code Demonstration

```java
public class PassByValueProof {

    static class User {
        String name;
        User(String name) { this.name = name; }
    }

    public static void main(String[] args) {
        // --- 1. Primitive Demonstration ---
        int number = 10;
        modifyPrimitive(number);
        System.out.println("Primitive after modify: " + number); // 10 (unchanged)

        // --- 2. Reference Swap Attempt (Proves references are passed by value) ---
        User user1 = new User("Alice");
        User user2 = new User("Bob");
        swapUsers(user1, user2);
        System.out.println("user1 after swap attempt: " + user1.name); // Alice (NOT swapped!)
        System.out.println("user2 after swap attempt: " + user2.name); // Bob (NOT swapped!)

        // --- 3. Object State Mutation via Copied Reference ---
        mutateUserState(user1);
        System.out.println("user1 after mutation: " + user1.name);     // Charlie (mutated!)
    }

    static void modifyPrimitive(int val) {
        val = 999; // Only alters the local stack frame variable 'val'
    }

    static void swapUsers(User a, User b) {
        // 'a' and 'b' are local copies of pointers to user1 and user2
        User temp = a;
        a = b;
        b = temp;
        // Only local copies 'a' and 'b' on this stack frame were swapped.
        // The caller variables 'user1' and 'user2' in main() remain unchanged!
    }

    static void mutateUserState(User u) {
        // 'u' holds a copy of the pointer pointing to Alice in the heap.
        // Mutating fields changes the actual object on the heap.
        u.name = "Charlie";
    }
}
```

### Memory Stack/Heap Diagram

```
[Stack: main() Frame]                  [Heap Memory]
+-------------------+                  +------------------------+
| user1: 0x4A00 ----+----------------->| User (name="Alice")    |
| user2: 0x8B00 ----+----+             +------------------------+
+-------------------+    |
                         |             +------------------------+
[Stack: swapUsers() Frame]----+-------->| User (name="Bob")      |
+-------------------+                  +------------------------+
| a: 0x4A00 (copy)  |
| b: 0x8B00 (copy)  |
+-------------------+
Reassigning a = b only changes the local copy 'a' to 0x8B00 inside swapUsers().
It has zero effect on 'user1' in main().
```

---

## 4. == vs .equals()?

### Fundamental Differences

* **`==` (Equality Operator):** Evaluates **reference identity** (memory address) for objects, and evaluates raw binary value equality for primitives.
* **`.equals()` (Method):** Defined in `java.lang.Object` to evaluate **logical / semantic equality** (whether two distinct objects have matching state).

### Default Behavior in `Object`

In `java.lang.Object`, the default implementation of `.equals()` is simply `==`:
```java
public boolean equals(Object obj) {
    return (this == obj);
}
```
Classes such as `String`, `Integer`, `Date`, and collection types override `.equals()` to compare actual field contents instead of memory addresses.

### String Constant Pool & Integer Cache Gotchas

1. **String Literals vs `new String()`:**
   * String literals are stored in the **String Constant Pool (SCP)**. Identical literals share the exact same memory reference.
   * `new String("hello")` explicitly allocates a distinct object in heap memory outside the pool.
2. **Integer Cache (-128 to 127):**
   * Java caches boxed `Integer` instances in the range `[-128, 127]`.
   * For values within this range, autoboxed `Integer` objects share references. For values $\ge 128$ or $\le -129$, new objects are allocated.

### Code Demonstration

```java
import java.util.Objects;

public class EqualityMechanics {

    static class Employee {
        private final int id;
        private final String name;

        public Employee(int id, String name) {
            this.id = id;
            this.name = name;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true; // 1. Reflexivity / Same reference
            if (o == null || getClass() != o.getClass()) return false; // 2. Null & type check
            Employee employee = (Employee) o;
            return id == employee.id && Objects.equals(name, employee.name);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id, name);
        }
    }

    public static void main(String[] args) {
        // --- 1. Primitive comparison ---
        int a = 20, b = 20;
        System.out.println(a == b); // true (compares values)

        // --- 2. String comparison ---
        String s1 = "hello";
        String s2 = "hello";
        String s3 = new String("hello");

        System.out.println(s1 == s2);      // true  (same SCP reference)
        System.out.println(s1 == s3);      // false (different heap addresses)
        System.out.println(s1.equals(s3)); // true  (same character contents)

        // --- 3. Integer Cache Gotcha ---
        Integer i1 = 127, i2 = 127;
        Integer i3 = 128, i4 = 128;

        System.out.println(i1 == i2);      // true  (cached by IntegerCache)
        System.out.println(i3 == i4);      // false (outside cache; separate heap objects!)
        System.out.println(i3.equals(i4)); // true  (compares primitive int values)

        // --- 4. Custom Class Comparison ---
        Employee emp1 = new Employee(101, "Alice");
        Employee emp2 = new Employee(101, "Alice");

        System.out.println(emp1 == emp2);      // false (separate heap instances)
        System.out.println(emp1.equals(emp2)); // true  (overridden equals checks id and name)
    }
}
```

### Summary Comparison

| Aspect | `==` Operator | `.equals()` Method |
| :--- | :--- | :--- |
| **Category** | Language Operator | Method on `java.lang.Object` |
| **Primitives** | Compares raw values directly | Cannot be applied to primitives |
| **Objects** | Compares heap memory addresses | Compares logical state (if overridden) |
| **Overridable?** | No | Yes |
| **Null-Handling** | `null == null` is safe (`true`) | Throws `NullPointerException` if called on null |

---

## 5. Why is String immutable in Java?

### Definition of Immutability

An object is **immutable** if its internal state cannot be modified after construction. When you call operations like `substring()`, `toUpperCase()`, or `concat()` on a `String`, the original string remains untouched; a newly allocated `String` object containing the transformed characters is returned.

### Five Strategic Reasons for String Immutability

#### 1. String Constant Pool (SCP) & Memory Optimization
* Java utilizes a pool of unique string literals to drastically reduce heap memory consumption.
* If multiple variables declare `String s1 = "admin"; String s2 = "admin";`, both variables reference the exact same object in the pool.
* If `String` were mutable, modifying `s1` would silently alter `s2`, destroying data isolation across unrelated components.

#### 2. Security & System Integrity
* Strings are the universal vehicle for sensitive application parameters: database URLs, credentials, network hostnames, file paths, and authentication tokens.
* In security checks (e.g., verifying file read permissions), if `String` were mutable, an attacking thread could alter the file path after the authorization check passes but before the file is opened (**Time-of-Check to Time-of-Use / TOCTOU vulnerability**).

#### 3. Thread Safety Without Synchronization
* Because string contents cannot be altered once published, `String` instances are intrinsically thread-safe.
* Multiple threads can concurrently read the same string without locks, eliminating concurrency overhead and race conditions.

#### 4. Safe Hashing in Hash Collections (HashMap, HashSet)
* `String` caches its hash code in a private field: `private int hash;`.
* The first time `hashCode()` is invoked, the hash value is computed and cached. All subsequent calls return this cached value in $O(1)$ time.
* If `String` were mutable, changing a string's content after using it as a key in a `HashMap` would change its hash code, corrupting the bucket location and rendering the key-value pair unretrievable.

#### 5. ClassLoading Mechanism
* The JVM ClassLoader uses strings to locate and load class definitions (e.g., `ClassLoader.loadClass("java.sql.Driver")`).
* If strings were mutable, malicious code could alter the requested class name mid-loading to inject rogue classes into the runtime.

### How Immutability is Enforced Under the Hood

Examining OpenJDK's `java.lang.String` source implementation:

```java
public final class String
    implements java.io.Serializable, Comparable<String>, CharSequence {

    // 1. The class is marked 'final' so it cannot be subclassed to override behaviors.

    // 2. The backing storage array is marked 'private final'.
    // (byte[] with a coder flag in Java 9+ for compact Latin-1 storage; char[] prior to Java 9)
    @Stable
    private final byte[] value;
    private final byte coder;

    // 3. Cached hash code
    private int hash;

    // 4. No mutator / setter methods exist.

    // 5. Any modification returns a new object:
    public String concat(String str) {
        if (str.isEmpty()) {
            return this;
        }
        return StringConcatHelper.simpleConcat(this, str); // Returns a NEW String instance
    }
}
```

---

## 6. String vs StringBuilder vs StringBuffer?

### Architectural Overview

Java provides three classes for handling character sequences. Selecting the right one depends on **mutability**, **thread safety**, and **performance requirements**.

### Detailed Comparison Table

| Property | `String` | `StringBuilder` | `StringBuffer` |
| :--- | :--- | :--- | :--- |
| **Mutability** | **Immutable** (state cannot change) | **Mutable** (modifies buffer in-place) | **Mutable** (modifies buffer in-place) |
| **Thread Safety** | **Thread-safe** (immutable by design) | **Not thread-safe** (unsynchronized) | **Thread-safe** (methods are `synchronized`) |
| **Performance** | Slow for repeated concatenation | **Fastest** (zero locking overhead) | Slower than StringBuilder (lock acquisition) |
| **Memory Allocation** | Allocates new objects on change | Resizable internal buffer | Resizable internal buffer |
| **Introduced In** | JDK 1.0 | JDK 1.5 | JDK 1.0 |
| **Primary Use Case** | Constant text, map keys, domain IDs | Single-threaded string assembly/loops | Multi-threaded shared string accumulation |

### How `StringBuilder` and `StringBuffer` Work Internally

Both classes extend `AbstractStringBuilder`, which encapsulates a resizable buffer array:
* Default initial capacity is `16` characters (or `str.length() + 16`).
* When capacity is exceeded, the buffer expands dynamically: $\text{newCapacity} = (\text{oldCapacity} \times 2) + 2$.
* Elements are mutated in-place via `System.arraycopy`, completely avoiding intermediate object churn.

### Code Demonstration

```java
public class StringPerformanceDemo {
    public static void main(String[] args) {
        // --- 1. String Concatenation Inefficiency in Loops (ANTI-PATTERN) ---
        // Creates 1,000 intermediate String objects on the heap!
        String str = "";
        for (int i = 0; i < 5; i++) {
            str += i; // Each concatenation re-allocates and copies arrays
        }
        System.out.println("String result: " + str);

        // --- 2. StringBuilder (Single-Threaded Best Practice) ---
        StringBuilder sb = new StringBuilder(32); // Pre-size capacity when known
        for (int i = 0; i < 5; i++) {
            sb.append(i); // In-place buffer mutation
        }
        System.out.println("StringBuilder result: " + sb.toString());

        // --- 3. StringBuffer (Multi-Threaded Safe Accumulation) ---
        StringBuffer sbf = new StringBuffer();
        Runnable task = () -> {
            for (int i = 0; i < 100; i++) {
                sbf.append("X"); // Synchronized method prevents corrupted buffers
            }
        };

        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);
        t1.start(); t2.start();
        try { t1.join(); t2.join(); } catch (InterruptedException ignored) {}

        System.out.println("StringBuffer length: " + sbf.length()); // Guaranteed 200
    }
}
```

> **Compiler Optimization Note:** For single-line concatenations (e.g., `String s = "a" + "b" + "c";`), the compiler folds constants at compile time to `"abc"`. In Java 9+, dynamic concatenation via `invokedynamic` (`StringConcatFactory`) is used for runtime string expressions. However, inside loops, explicit use of `StringBuilder` remains critical to avoid $O(N^2)$ memory allocation overhead.

---

## 7. final vs finally vs finalize()?

### Conceptual Separation

Despite their lexical similarity, these three constructs serve completely different purposes in the Java language:

```
+------------+------------------+----------------------------------------------------+
| Keyword    | Language Feature | Primary Purpose                                    |
+------------+------------------+----------------------------------------------------+
| final      | Modifier         | Imposes immutability on variables, methods, classes|
| finally    | Control Block    | Guarantees execution of cleanup code in try-catch  |
| finalize() | Object Method    | Deprecated GC hook before object destruction       |
+------------+------------------+----------------------------------------------------+
```

### 1. `final` (Modifier Keyword)
* **Final Variable:** Cannot be reassigned once initialized. For object references, the reference pointer cannot change, though the object's internal state may still be mutated.
* **Final Method:** Cannot be overridden by subclasses (enables JIT compiler inlining).
* **Final Class:** Cannot be extended or subclassed (e.g., `java.lang.String`, `java.lang.System`).

### 2. `finally` (Exception Handling Block)
* Accompanies `try` and `catch` blocks.
* **Guarantee:** The `finally` block **always executes**, whether an exception is thrown, caught, or completely unhandled, and even if `try` or `catch` contains a `return` statement.
* **Rare cases where `finally` does NOT run:**
  1. `System.exit(0)` is executed.
  2. Fatal JVM crash (e.g., native crash, fatal `OutOfMemoryError`).
  3. Operating system process kill (`kill -9`).
  4. Infinite loop or thread deadlock inside the `try` block.

```java
public class FinallyBehavior {
    public static int testReturn() {
        try {
            System.out.println("Executing try");
            return 1;
        } catch (Exception e) {
            return 2;
        } finally {
            System.out.println("Executing finally (always runs!)");
            // WARNING: A return inside finally overwrites the try return value
            // and suppresses any thrown exception. Never return from finally!
        }
    }
}
```

### 3. `finalize()` (Deprecated Method on `Object`)
* A protected method in `java.lang.Object` historically executed by the Garbage Collector before reclaiming an unreachable object's memory.
* **Status:** **Deprecated in Java 9** and marked for removal in future releases.
* **Why it was deprecated:**
  * **Non-deterministic:** No guarantee of *when* (or if) the GC will run.
  * **Performance overhead:** Objects with `finalize()` methods require at least two GC cycles to be collected, causing GC pauses.
  * **Object resurrection:** A broken `finalize()` method can assign `this` to a static reference, reviving a dead object.
  * **Silent failure:** Exceptions thrown within `finalize()` are silently ignored by the JVM.
* **Modern Replacement:** Use `AutoCloseable` with **try-with-resources** for deterministic cleanup, or `java.lang.ref.Cleaner` for asynchronous cleanup.

---

## 8. What are static variables and methods?

### Class-Level vs. Instance-Level Members

In Java, members declared with the `static` keyword belong to the **class itself** rather than to any individual object instance.

```
+---------------------------------------------------------------+
| Class Area / Metaspace & Heap: AppConfig.class                |
|   - static String appName = "EnterpriseApp"                   |
|   - static int totalInstances = 2                             |
|   - static void displaySummary()                              |
+---------------------------------------------------------------+
        ^                                               ^
        |                                               |
[Instance 1: cfg1]                              [Instance 2: cfg2]
(shares static fields)                          (shares static fields)
```

### 1. Static Variables (Class Variables)
* A single copy of the variable is created when the class is loaded by the ClassLoader.
* Stored in the JVM Metaspace/Heap (Java 8+).
* Shared by all instances of the class. If one instance modifies the static variable, the modification is immediately reflected across all other instances.
* Common use cases: Global counters, constants (`public static final double PI = 3.14159`), and caches.

### 2. Static Methods
* Invoked directly via the class name without creating an instance: `Math.max(a, b)`.
* **Key Restrictions:**
  * Cannot use `this` or `super` keywords (there is no instance context).
  * Cannot directly invoke non-static instance methods or access non-static instance fields without explicitly constructing an object.
* **Can static methods be overridden?**
  * **No.** If a subclass defines a static method with the same signature, it is **Method Hiding**, not method overriding. Resolution is determined at compile time based on the reference type (Static Binding), not dynamically at runtime.

### 3. Static Initialization Block
* A block of code executed **exactly once** when the class is loaded into memory by the JVM.
* Executed before any constructors or instance initializer blocks.

### Code Demonstration

```java
public class StaticMechanicsDemo {

    static class DatabaseConnection {
        private final String connectionId;

        // Static variable shared by all instances
        public static int activeConnectionCount = 0;
        public static final String DRIVER_CLASS;

        // Static initialization block
        static {
            DRIVER_CLASS = "com.mysql.cj.jdbc.Driver";
            System.out.println("DatabaseConnection class initialized. Driver: " + DRIVER_CLASS);
        }

        public DatabaseConnection(String id) {
            this.connectionId = id;
            activeConnectionCount++;
        }

        public void close() {
            activeConnectionCount--;
            System.out.println("Closed connection: " + connectionId);
        }

        // Static utility method
        public static void printPoolStatus() {
            // System.out.println(this.connectionId); // COMPILE ERROR: Cannot access 'this' in static context
            System.out.println("Active connections in pool: " + activeConnectionCount);
        }
    }

    // Method Hiding Demonstration
    static class SuperClass {
        public static void printType() {
            System.out.println("SuperClass static method");
        }
    }

    static class SubClass extends SuperClass {
        // Hides SuperClass.printType() - NOT polymorphic overriding!
        public static void printType() {
            System.out.println("SubClass static method");
        }
    }

    public static void main(String[] args) {
        DatabaseConnection conn1 = new DatabaseConnection("CONN_01");
        DatabaseConnection conn2 = new DatabaseConnection("CONN_02");

        DatabaseConnection.printPoolStatus(); // Active connections: 2
        conn1.close();
        DatabaseConnection.printPoolStatus(); // Active connections: 1

        // Testing Method Hiding:
        SuperClass ref = new SubClass();
        ref.printType(); // Prints "SuperClass static method" because binding is static (compile-time)!
    }
}
```
