# 2. OOP Concepts

## 9. Explain the four pillars of OOP.

Object-Oriented Programming (OOP) is built on four core principles: **Encapsulation**, **Abstraction**, **Inheritance**, and **Polymorphism**.

```
                   +----------------------------------+
                   |     The 4 Pillars of OOP         |
                   +----------------------------------+
                   /         |              |         \
                  /          |              |          \
        Encapsulation   Abstraction    Inheritance    Polymorphism
        (Data Hiding)   (Detail Hiding) (Code Reuse)   (Multiple Forms)
```

### 1. Encapsulation (Data Hiding & Bundling)
* **Concept:** Bundles data (fields) and methods operating on that data into a single class while restricting direct access to the internal state.
* **Mechanism:** Declare fields `private` and provide controlled `public` accessor methods (getters and setters) enforcing validation rules.
* **Benefit:** Protects an object's invariants and internal consistency from unauthorized external tampering.

### 2. Abstraction (Complexity Hiding)
* **Concept:** Hides the underlying implementation complexity and displays only the essential features and contracts to the outside world.
* **Mechanism:** Defined using **Interfaces** and **Abstract Classes**.
* **Benefit:** Decouples API consumers from low-level implementation details, reducing cognitive load and facilitating system evolution.

### 3. Inheritance (Code Reuse & Hierarchy)
* **Concept:** Allows a new class (subclass) to inherit fields and behaviors from an existing class (superclass) using the `extends` keyword.
* **Mechanism:** Establishes an **IS-A** relationship (e.g., `SavingsAccount` IS-A `BankAccount`).
* **Benefit:** Eliminates redundant code and models real-world taxonomies.

### 4. Polymorphism (Multiple Forms)
* **Concept:** Allows an entity (method, object) to exhibit different behaviors depending on the context.
* **Types:**
  * **Compile-Time (Static) Polymorphism:** Method Overloading.
  * **Runtime (Dynamic) Polymorphism:** Method Overriding via Dynamic Method Dispatch.
* **Benefit:** Promotes the Open/Closed Principle (open for extension, closed for modification) by enabling interchangeable component implementations.

### Unified Real-World Code Example

```java
// --- Pillar 2: Abstraction (Defining the contract) ---
interface PaymentGateway {
    boolean processPayment(double amount);
}

// --- Pillar 1: Encapsulation (Guarding state and business invariants) ---
class BankAccount {
    private final String accountNumber;
    private double balance; // Hidden from direct external access

    public BankAccount(String accountNumber, double initialBalance) {
        if (initialBalance < 0) throw new IllegalArgumentException("Initial balance cannot be negative");
        this.accountNumber = accountNumber;
        this.balance = initialBalance;
    }

    public synchronized boolean debit(double amount) {
        if (amount <= 0 || amount > balance) return false;
        this.balance -= amount;
        return true;
    }

    public double getBalance() {
        return this.balance;
    }
}

// --- Pillar 3: Inheritance (Base class sharing common logic) ---
abstract class BasePaymentProcessor implements PaymentGateway {
    protected final String processorName;

    public BasePaymentProcessor(String processorName) {
        this.processorName = processorName;
    }

    protected void logTransaction(double amount, boolean success) {
        System.out.printf("[%s] Amount: $%.2f - Result: %s%n", 
            processorName, amount, success ? "APPROVED" : "DECLINED");
    }
}

// --- Pillar 4: Polymorphism (Interchangeable implementations) ---
class CreditCardProcessor extends BasePaymentProcessor {
    public CreditCardProcessor() { super("CreditCardGateway"); }

    @Override
    public boolean processPayment(double amount) {
        boolean success = amount < 5000.0; // Simulated fraud limit
        logTransaction(amount, success);
        return success;
    }
}

class PayPalProcessor extends BasePaymentProcessor {
    public PayPalProcessor() { super("PayPalAPI"); }

    @Override
    public boolean processPayment(double amount) {
        boolean success = true; // Simulated tokenized checkout
        logTransaction(amount, success);
        return success;
    }
}

// Client application working with polymorphic abstraction:
public class OOPPillarsDemo {
    public static void executeCheckout(PaymentGateway gateway, double total) {
        // Polymorphism in action: resolves dynamically at runtime
        if (gateway.processPayment(total)) {
            System.out.println("Checkout successful!");
        } else {
            System.out.println("Checkout failed.");
        }
    }

    public static void main(String[] args) {
        PaymentGateway cc = new CreditCardProcessor();
        PaymentGateway paypal = new PayPalProcessor();

        executeCheckout(cc, 250.00);
        executeCheckout(paypal, 1200.00);
    }
}
```

---

## 10. Method overloading vs method overriding?

### Conceptual Breakdown

Both overloading and overriding are forms of **Polymorphism** in Java, but they occur at different phases of the program lifecycle and follow distinct sets of language rules.

### Detailed Comparison Table

| Attribute | Method Overloading (Compile-Time / Static) | Method Overriding (Run-Time / Dynamic) |
| :--- | :--- | :--- |
| **Binding Mechanism** | **Static Binding** (resolved by compiler at compile time) | **Dynamic Binding** (resolved by JVM at runtime using vtable) |
| **Location** | Within the **same class** (or inherited from superclass) | In a **subclass** (requires inheritance) |
| **Method Name** | Must be **identical** | Must be **identical** |
| **Parameters** | Must be **different** (type, number, or order) | Must be **identical** |
| **Return Type** | Can be anything (return type alone cannot overload) | Must be **identical** or **covariant** (subtype) |
| **Access Modifiers** | Can be more or less restrictive | **Cannot be more restrictive** than the overridden method |
| **Exceptions** | Can throw any checked or unchecked exceptions | **Cannot throw broader** checked exceptions |
| **Private/Static/Final** | Can overload `private`, `static`, and `final` methods | **Cannot override** `private`, `static`, or `final` methods |

### Code Demonstration

```java
import java.io.IOException;

public class OverloadingVsOverridingDemo {

    // ==========================================
    // 1. Method Overloading (Same method name, varied parameters)
    // ==========================================
    static class Calculator {
        public int add(int a, int b) {
            return a + b;
        }

        // Overloaded by parameter count
        public int add(int a, int b, int c) {
            return a + b + c;
        }

        // Overloaded by parameter type
        public double add(double a, double b) {
            return a + b;
        }

        // NOTE: Changing return type ALONE is illegal:
        // public double add(int a, int b) { return a + b; } // COMPILE ERROR!
    }

    // ==========================================
    // 2. Method Overriding (Subclass redefines superclass behavior)
    // ==========================================
    static class NotificationService {
        // Base method throws IOException, returns Object, has protected access
        protected Object send(String message) throws IOException {
            System.out.println("Base notification: " + message);
            return "SUCCESS_GENERIC";
        }
    }

    static class EmailNotificationService extends NotificationService {
        // 1. Covariant return type (String is a subtype of Object)
        // 2. Public access (less restrictive than protected - allowed!)
        // 3. Does not throw IOException (narrower exception - allowed!)
        @Override
        public String send(String message) {
            System.out.println("Sending encrypted email: " + message);
            return "EMAIL_DELIVERED_200";
        }
    }

    public static void main(String[] args) throws Exception {
        Calculator calc = new Calculator();
        System.out.println(calc.add(2, 3));       // Invokes add(int, int)
        System.out.println(calc.add(2.5, 3.5));   // Invokes add(double, double)

        // Runtime Polymorphism via Overriding
        NotificationService service = new EmailNotificationService();
        service.send("System Alert"); // Dispatches to EmailNotificationService.send at runtime
    }
}
```

### Compiler Resolution Priority for Overloading
When matching overloaded methods, the compiler resolves priorities in the following strict order:
1. Exact primitive match (e.g., `int` -> `int`).
2. Primitive widening (e.g., `int` -> `long` -> `float` -> `double`).
3. Autoboxing (e.g., `int` -> `Integer`).
4. Varargs (e.g., `int...`).

---

## 11. Abstract class vs interface?

### Philosophical Difference

* **Abstract Class:** Captures an object's **identity** and core internal state ("what an object **IS**"). Represents an incomplete template designed for strong code sharing among closely related classes.
* **Interface:** Captures an object's **contract** and functional capabilities ("what an object **CAN DO**"). Unrelated classes can implement the same interface.

```
       [Vehicle] (Abstract Class)             [Flyable] (Interface)
         - engineCapacity                       + fly()
         + startEngine()                           ^
           ^          ^                            |
           |          |                +-----------+-----------+
         [Car]     [Airplane] ---------+                       |
                                                           [Drone]
```

### Structural Comparison

| Feature | Abstract Class | Interface (Java 8/9+) |
| :--- | :--- | :--- |
| **Inheritance** | Single inheritance (`extends BaseClass`) | Multiple inheritance (`implements A, B, C`) |
| **State / Fields** | Can have instance variables, mutable state, constants | Only `public static final` constants |
| **Constructors** | Can have constructors (invoked via `super()`) | **No constructors** allowed |
| **Method Types** | Abstract, concrete, `final`, `static`, `private` | Abstract, `default` (Java 8), `static` (Java 8), `private` (Java 9) |
| **Access Modifiers** | `public`, `protected`, package-private, `private` | Methods are implicitly `public` (or explicit `private`) |
| **Speed** | Marginally faster (invoked via standard vtable) | Slightly slower due to interface table (itable) search |

### When to Use Which?

* **Use an Interface when:**
  * You want to specify a behavioral contract for disparate, unrelated classes (e.g., `Comparable`, `Serializable`, `AutoCloseable`).
  * You need multiple inheritance of type and behavior.
  * You want to design pluggable, loosely coupled architectures (API design).
* **Use an Abstract Class when:**
  * You want to share state (instance fields) and non-public methods among closely related classes.
  * You need constructors to enforce proper initialization invariants.
  * You are creating a framework base class (e.g., Template Method pattern like `AbstractList` or `HttpServlet`).

### Code Example

```java
// Interface defining a capability
interface Auditable {
    void recordAuditLog(String action);

    // Java 8 default method providing default behavior
    default void printAuditHeader() {
        System.out.println("=== SYSTEM AUDIT ENTRY ===");
    }
}

// Abstract class defining identity and shared state
abstract class AbstractEntity {
    private final String id;
    private final long createdAt;

    public AbstractEntity(String id) {
        this.id = id;
        this.createdAt = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public long getCreatedAt() { return createdAt; }

    // Template method pattern
    public final void save() {
        validate();
        persistToDatabase();
    }

    protected abstract void validate(); // Abstract hook
    private void persistToDatabase() {
        System.out.println("Persisting entity " + id + " to DB");
    }
}

// Concrete class combining both
class UserAccount extends AbstractEntity implements Auditable {
    private final String email;

    public UserAccount(String id, String email) {
        super(id);
        this.email = email;
    }

    @Override
    protected void validate() {
        if (!email.contains("@")) throw new IllegalArgumentException("Invalid email");
    }

    @Override
    public void recordAuditLog(String action) {
        printAuditHeader();
        System.out.printf("Audit: User %s performed action: %s%n", getId(), action);
    }
}
```

---

## 12. Does Java support multiple inheritance?

### The Direct Answer

> **Java does NOT support multiple inheritance of classes (state), but it DOES support multiple inheritance of type and behavior through interfaces.**

### Why Java Disallows Multiple Class Inheritance: The "Diamond Problem"

In languages like C++, if Class D inherits from both Class B and Class C, and both B and C inherit from Class A:

```
        Class A (defines int x; void display())
         /   \
        /     \
   Class B     Class C (both override display(), modify x)
        \     /
         \   /
        Class D (Which display() does D inherit? Which x?)
```

This creates severe ambiguities:
1. **Ambiguous Method Dispatch:** The runtime cannot tell whether `D.display()` should call `B.display()` or `C.display()`.
2. **Duplicated State:** If A contains instance variables, does D contain one or two copies of A's fields?
3. **Constructor Ambiguity:** In what order should the constructors execute?

To keep the language simple and robust, Java prohibited multiple class inheritance (`class D extends B, C` is a compilation error).

### Multiple Inheritance via Interfaces (Java 8+)

A class can implement multiple interfaces (`class D implements B, C`). Prior to Java 8, interfaces had no implementation, so no conflict was possible.

With the introduction of **`default` methods** in Java 8, the Diamond Problem can occur if two interfaces supply the same default method signature.

### Java's Resolution Rules for Default Method Conflicts

When an interface default method conflict arises, Java enforces three strict rules:
1. **Rule 1: Classes win over interfaces.** Any method implementation in a superclass always takes precedence over default methods in interfaces.
2. **Rule 2: Sub-interfaces win over super-interfaces.** If interface B extends interface A and overrides its default method, B's implementation wins.
3. **Rule 3: Explicit conflict resolution.** If two unrelated interfaces provide the same default method, the compiler generates a build error: `duplicate default methods named ...`. The implementing class **must explicitly override** the method and choose which implementation to invoke using `InterfaceName.super.methodName()`.

### Code Demonstration

```java
interface Reader {
    default void connect() {
        System.out.println("Connecting via Reader stream...");
    }
}

interface Writer {
    default void connect() {
        System.out.println("Connecting via Writer stream...");
    }
}

// Implements both conflicting interfaces
class DualStream implements Reader, Writer {

    // MUST override connect() to resolve the diamond ambiguity
    @Override
    public void connect() {
        // Disambiguate by choosing one or combining both:
        System.out.println("Resolving conflict in DualStream:");
        Reader.super.connect();
        Writer.super.connect();
    }
}

public class MultipleInheritanceDemo {
    public static void main(String[] args) {
        DualStream ds = new DualStream();
        ds.connect();
    }
}
```

---

## 13. Inheritance vs composition?

### Fundamental Difference

* **Inheritance (IS-A):** Subclassing an existing class to inherit its state and methods (`class Dog extends Animal`). Represents **white-box reuse** (the subclass has visibility into the internal workings of the superclass).
* **Composition (HAS-A):** Including references to other classes as fields within your class and delegating work to them (`class Car { private Engine engine; }`). Represents **black-box reuse** (internal details are hidden; interactions occur through clean public APIs).

### The Rule: "Favor Composition over Inheritance" (*Effective Java* Item 18)

#### Pitfalls of Inheritance
1. **Breaks Encapsulation:** A subclass depends on the internal implementation details of its superclass. If the superclass changes between library versions, the subclass can silently break (**Fragile Base Class problem**).
2. **Tight Compile-Time Coupling:** Inheritance is static; you cannot swap or alter the parent behavior dynamically at runtime.
3. **Polluted Public APIs:** The subclass inherits *all* public methods of the superclass, even those that make no domain sense for the subclass (e.g., `java.util.Properties` extending `java.util.Hashtable`).

#### Advantages of Composition
1. **Loose Coupling:** The outer class only interacts with the enclosed object's public contract.
2. **Runtime Flexibility:** You can swap the component dynamically at runtime via Dependency Injection or setters.
3. **Robustness:** Internal changes to the dependency do not break the outer class.

### The Classic Flaw of Inheritance: Custom Counting Set

```java
import java.util.*;

// FLAWED APPROACH: Using Inheritance
class BrokenCountedSet<E> extends HashSet<E> {
    private int addCount = 0;

    @Override
    public boolean add(E e) {
        addCount++;
        return super.add(e);
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return super.addAll(c); // BUG! HashSet.addAll internally calls add()!
    }

    public int getAddCount() { return addCount; }
}

// CORRECT APPROACH: Using Composition (Wrapper / Decorator Pattern)
class RobustCountedSet<E> {
    private final Set<E> internalSet; // HAS-A Set
    private int addCount = 0;

    public RobustCountedSet(Set<E> set) {
        this.internalSet = set;
    }

    public boolean add(E e) {
        addCount++;
        return internalSet.add(e);
    }

    public boolean addAll(Collection<? extends E> c) {
        addCount += c.size();
        return internalSet.addAll(c); // No double-counting!
    }

    public int getAddCount() { return addCount; }
}

public class InheritanceVsCompositionDemo {
    public static void main(String[] args) {
        BrokenCountedSet<String> broken = new BrokenCountedSet<>();
        broken.addAll(List.of("A", "B", "C"));
        // Expected: 3, Actual: 6 (Double counted because HashSet.addAll calls add())
        System.out.println("Broken count: " + broken.getAddCount());

        RobustCountedSet<String> robust = new RobustCountedSet<>(new HashSet<>());
        robust.addAll(List.of("A", "B", "C"));
        // Expected: 3, Actual: 3 (Correct!)
        System.out.println("Robust count: " + robust.getAddCount());
    }
}
```

---

## 14. What are encapsulation and abstraction?

### Differentiating the Two Concepts

Encapsulation and Abstraction are often conflated because they work hand-in-hand to produce clean, maintainable object-oriented software. However, their goals and mechanisms are distinct:

```
+------------------------------------+------------------------------------+
| Encapsulation                      | Abstraction                        |
+------------------------------------+------------------------------------+
| Data & Implementation Hiding       | Complexity Hiding                  |
| Focus: "HOW do we protect state?"  | Focus: "WHAT does the object do?"  |
| Bundles state + methods together   | Exposes only the conceptual model  |
| Enforced via Access Modifiers      | Enforced via Interfaces & Abstracts|
+------------------------------------+------------------------------------+
```

### 1. Encapsulation (Information Hiding)
* **Definition:** The bundling of state and behaviors within a class while restricting direct access to the internal representation of an object.
* **Mechanism:**
  * Declare fields `private`.
  * Provide controlled `public` accessor methods (getters/setters).
  * Validate inputs inside mutator methods to prevent invalid state.
* **Real-World Analogy:** A medical capsule. The chemical ingredients inside are sealed and protected from external contamination. You consume the pill safely as a single unit.

### 2. Abstraction (Interface over Implementation)
* **Definition:** Representing essential features of a system without including the background details or implementation complexity.
* **Mechanism:**
  * Define high-level APIs using interfaces or abstract base classes.
  * Hide concrete algorithms, socket connections, or SQL queries behind clear method names.
* **Real-World Analogy:** Driving a car. The steering wheel, accelerator, and brake pedal represent the **Abstraction**. You do not need to know the fuel injection timing or hydraulic fluid pressure to drive. The sealed transmission casing underneath the hood represents **Encapsulation**.

### Code Demonstration

```java
// ABSTRACTION: Exposes WHAT the temperature sensor does, not HOW it communicates with hardware
interface TemperatureSensor {
    double readCelsius();
}

// ENCAPSULATION: Guards the state, applies calibration invariants, and hides raw registers
class HardwareTemperatureSensor implements TemperatureSensor {
    // Encapsulated private state
    private double calibrationOffset;
    private final String busAddress;

    public HardwareTemperatureSensor(String busAddress, double initialOffset) {
        this.busAddress = busAddress;
        setCalibrationOffset(initialOffset); // Guarded via setter
    }

    public synchronized void setCalibrationOffset(double offset) {
        // Enforcing invariant
        if (offset < -10.0 || offset > 10.0) {
            throw new IllegalArgumentException("Offset out of safe operational range [-10, 10]");
        }
        this.calibrationOffset = offset;
    }

    @Override
    public double readCelsius() {
        // Complex internal communication hidden from the client
        double rawVoltage = fetchRawSensorVoltage();
        return (rawVoltage * 100.0) + this.calibrationOffset;
    }

    private double fetchRawSensorVoltage() {
        // Simulated low-level hardware register polling
        return 0.235;
    }
}
```

---

## 15. What is runtime polymorphism?

### Definition

**Runtime Polymorphism** (also known as **Dynamic Method Dispatch**) is the mechanism by which a call to an overridden method is resolved at runtime rather than at compile time.

It allows a superclass reference variable to point to any subclass instance, and the JVM automatically decides which concrete implementation to invoke based on the **actual object type** residing in heap memory.

### How the JVM Dispatches Calls Under the Hood

1. **Compilation Phase:** The compiler verifies that the method signature exists in the declared reference type. It emits the bytecode instruction `invokevirtual`.
2. **Runtime Execution Phase:**
   * When `invokevirtual` executes, the JVM inspects the memory address of the object reference on the operand stack.
   * Every class loaded into JVM memory has a **Virtual Method Table (vtable)**.
   * The vtable contains an array of direct pointers to the actual bytecode of each method implementation.
   * The JVM uses the method index to look up the target address in the concrete subclass's vtable, dynamically dispatching to the subclass method.

```
Reference Type (Compile-Time)       Actual Heap Object (Runtime)
  Animal myAnimal             --->       new Dog()
                                            |
                                      [Dog vtable]
                                      index 0: Dog.makeSound() -> jumps to Dog code!
```

### Critical Rules and Limitations

1. **Static Methods are NOT Polymorphic:** Static methods are bound at compile time based on the reference type (`invokestatic`). If a subclass redefines a static method, it is **Method Hiding**, not overriding.
2. **Private and Final Methods are NOT Polymorphic:** Private methods cannot be inherited; `final` methods cannot be overridden. The JVM resolves them statically via `invokespecial`.
3. **Variables are NEVER Polymorphic:** Fields are resolved at compile time based solely on the reference type (**Field Hiding**).

### Code Demonstration

```java
class Vehicle {
    String model = "Generic Vehicle"; // Field hiding test

    public void start() {
        System.out.println("Vehicle starting smoothly");
    }

    public static void inspect() {
        System.out.println("Inspecting Vehicle (static)");
    }
}

class ElectricCar extends Vehicle {
    String model = "Tesla Model 3"; // Hides parent field

    @Override
    public void start() {
        System.out.println("ElectricCar powers on silently via high-voltage battery");
    }

    // Method Hiding (not overriding!)
    public static void inspect() {
        System.out.println("Inspecting ElectricCar (static)");
    }
}

public class RuntimePolymorphismDemo {
    public static void main(String[] args) {
        // Superclass reference pointing to Subclass object
        Vehicle v = new ElectricCar();

        // 1. Dynamic Method Dispatch (Runtime Polymorphism):
        // Resolves to ElectricCar's start() at runtime!
        v.start(); // Output: ElectricCar powers on silently via high-voltage battery

        // 2. Field Resolution (NO Polymorphism):
        // Resolves to Vehicle's field at compile-time!
        System.out.println("Model field: " + v.model); // Output: Generic Vehicle

        // 3. Static Method Resolution (NO Polymorphism):
        // Resolves to Vehicle's inspect() at compile-time!
        v.inspect(); // Output: Inspecting Vehicle (static)
    }
}
```
