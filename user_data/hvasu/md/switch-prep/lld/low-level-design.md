Here is an example showing how **LSP is broken**, followed by **the fix**.

### 1\. The Violation (Breaking LSP)

Imagine an online ordering system where standard orders allow refunds, but a new type of order—**Promotional / Clearance Orders**—does not allow refunds by policy.

Java

    class Order {
        protected double amount;
    
        public Order(double amount) {
            this.amount = amount;
        }
    
        public void processRefund() {
            System.out.println("Refund of $" + amount + " processed successfully.");
        }
    }
    
    // Subclassing to create a Clearance Order
    class ClearanceOrder extends Order {
        public ClearanceOrder(double amount) {
            super(amount);
        }
    
        @Override
        public void processRefund() {
            // VIOLATION: Throwing an unexpected exception breaks the superclass contract!
            throw new UnsupportedOperationException("Clearance items cannot be refunded.");
        }
    }
    

**Why it breaks LSP:** If a system relies on the `Order` class and calls `processRefund()` on a list of orders, passing a `ClearanceOrder` will cause the system to crash with an unexpected exception. The subclass cannot truly _substitute_ the parent without altering expected behavior.

Java

    // Somewhere in the application workflow:
    void refundAllOrders(List<Order> orders) {
        for (Order order : orders) {
            order.processRefund(); // Crashes if it encounters a ClearanceOrder!
        }
    }
    

### 2\. The Fix (Honoring LSP)

To fix this, subclasses should never remove or contradict core capabilities of the parent class. Instead, we can model the behavior correctly using an interface or hierarchy that accurately reflects what objects can and cannot do.

Java

    // 1. Base Order class for all orders
    abstract class Order {
        protected double amount;
        public Order(double amount) { this.amount = amount; }
    }
    
    // 2. Interface specifically for orders that support refunds
    interface Refundable {
        void processRefund();
    }
    
    // 3. Standard orders implement both the base type and the refund capability
    class StandardOrder extends Order implements Refundable {
        public StandardOrder(double amount) { super(amount); }
    
        @Override
        public void processRefund() {
            System.out.println("Refund of $" + amount + " processed successfully.");
        }
    }
    
    // 4. Clearance orders extend Order, but DO NOT implement Refundable
    class ClearanceOrder extends Order {
        public ClearanceOrder(double amount) { super(amount); }
        // No broken refund method! The compiler ensures you never accidentally 
        // try to refund a clearance order.
    }
    

**Why this follows LSP:** Now, a method that processes refunds can safely accept _only_ `Refundable` objects. You can no longer accidentally pass an incompatible `ClearanceOrder` into a refund pipeline, completely eliminating unexpected runtime crashes and keeping substitution predictable.

---

Here is an example showing how **Interface Segregation Principle (ISP)** is broken (using a "fat" interface), followed by **the fix**.

### 1\. The Violation (Breaking ISP)

Imagine we are building a multi-functional smart home app. We create a single, massive interface called `SmartDevice` that contains controls for lights, thermostats, and music players.

Java

    // 1. The "Fat" Interface
    interface SmartDevice {
        void turnOn();
        void turnOff();
        void setTemperature(int celsius); // Relevant for AC, irrelevant for a basic bulb
        void playMusic(String track);       // Relevant for Speaker, irrelevant for an AC
    }
    
    // 2. A Basic Smart Bulb implementation
    class SmartBulb implements SmartDevice {
        @Override
        public void turnOn() { System.out.println("Bulb turned on."); }
    
        @Override
        public void turnOff() { System.out.println("Bulb turned off."); }
    
        @Override
        public void setTemperature(int celsius) {
            // VIOLATION: A bulb doesn't have a thermostat! We are forced to stub it out.
            throw new UnsupportedOperationException("Smart bulbs do not support temperature control.");
        }
    
        @Override
        public void playMusic(String track) {
            // VIOLATION: A bulb can't play music either.
            throw new UnsupportedOperationException("Smart bulbs do not play music.");
        }
    }
    

**Why it breaks ISP:** The `SmartBulb` is forced to depend on and implement methods (`setTemperature` and `playMusic`) that it has no use for. This leads to clutter, empty method bodies, or runtime `UnsupportedOperationException` errors.

### 2\. The Fix (Honoring ISP)

To fix this, we break down the massive fat interface into smaller, highly specific, role-based interfaces so classes only implement what they actually need.

Java

    // 1. Segregated, role-specific interfaces
    interface SmartDevice {
        void turnOn();
        void turnOff();
    }
    
    interface TemperatureControllable {
        void setTemperature(int celsius);
    }
    
    interface MediaStreamable {
        void playMusic(String track);
    }
    
    // 2. Smart Bulb implements ONLY what it actually supports
    class SmartBulb implements SmartDevice {
        @Override
        public void turnOn() { System.out.println("Bulb turned on."); }
    
        @Override
        public void turnOff() { System.out.println("Bulb turned off."); }
        // Clean! No unwanted temperature or music methods.
    }
    
    // 3. Smart AC implements device power AND temperature control
    class SmartAC implements SmartDevice, TemperatureControllable {
        @Override
        public void turnOn() { System.out.println("AC turned on."); }
    
        @Override
        public void turnOff() { System.out.println("AC turned off."); }
    
        @Override
        public void setTemperature(int celsius) {
            System.out.println("AC temperature set to " + celsius + "°C.");
        }
    }
    

**Why this follows ISP:** Classes are no longer burdened with methods they don't support. If a piece of code only needs to toggle power, it can depend strictly on `SmartDevice`. If it needs temperature control, it depends on `TemperatureControllable`, ensuring complete modularity and zero forced stub methods.

---

Here is an example showing how the **Dependency Inversion Principle (DIP)** is broken, followed by the fix.

### 1\. The Violation (Breaking DIP)

Imagine a banking application where a `TransferService` (high-level business logic) directly creates and depends on a concrete `StripePaymentGateway` (low-level detail).

Java

    // 1. Low-level concrete class
    class StripePaymentGateway {
        public void charge(double amount) {
            System.out.println("Charging $" + amount + " via Stripe.");
        }
    }
    
    // 2. High-level module tightly coupled to the low-level concretion
    class TransferService {
        // VIOLATION: Directly instantiating a concrete class using 'new'
        private final StripePaymentGateway stripe = new StripePaymentGateway();
    
        public void executeTransfer(double amount) {
            System.out.println("Validating transfer details...");
            stripe.charge(amount); // Locked into Stripe forever
        }
    }
    

**Why it breaks DIP:**

-   **Tight Coupling:** The core business logic (`TransferService`) depends directly on a specific low-level tool (`StripePaymentGateway`).
    
-   **Inflexible:** If the business decides to switch from Stripe to PayPal, you have to rewrite and modify code inside `TransferService`.
    
-   **Hard to Test:** You cannot test `TransferService` in isolation because it will always attempt to hit the real Stripe gateway.
    

### 2\. The Fix (Honoring DIP)

To fix this, we introduce an abstraction (an interface) and invert the control by injecting the dependency from the outside.

Java

    // 1. The Abstraction (Shared contract)
    interface PaymentGateway {
        void charge(double amount);
    }
    
    // 2. Low-level concrete implementations
    class StripePaymentGateway implements PaymentGateway {
        @Override
        public void charge(double amount) {
            System.out.println("Charging $" + amount + " via Stripe.");
        }
    }
    
    class PayPalPaymentGateway implements PaymentGateway {
        @Override
        public void charge(double amount) {
            System.out.println("Charging $" + amount + " via PayPal.");
        }
    }
    
    // 3. High-level module depending ONLY on the abstraction
    class TransferService {
        private final PaymentGateway paymentGateway; // Depends on abstraction, not concretion!
    
        // Dependency Injection: The gateway is passed in from the outside
        public TransferService(PaymentGateway paymentGateway) {
            this.paymentGateway = paymentGateway;
        }
    
        public void executeTransfer(double amount) {
            System.out.println("Validating transfer details...");
            paymentGateway.charge(amount); // Works with ANY payment gateway seamlessly
        }
    }
    

**Why this follows DIP:**

-   **Abstractions over Concretions:** `TransferService` only knows about the `PaymentGateway` interface, remaining completely blind to whether it is Stripe or PayPal.
    
-   **Inverted Control:** The choice of which payment gateway to use is handled externally when creating the service (`new TransferService(new StripePaymentGateway())`).
    
-   **Maximum Modularity:** You can swap payment providers instantly, or pass in a mock gateway for unit testing, without ever touching a single line of code inside `TransferService`.
    

  

---
  

Here are concise, pseudo-code style **code snippets** for each SOLID principle, illustrating the object-level design directly.

### 1\. Single Responsibility Principle (SRP)

**Bad:** One class handles both business logic and persistence.

Java

    class UserManager {
        void registerUser(String name) {
            // Business logic
            String encrypted = encryptPassword(name);
            
            // Persistence logic (Violates SRP)
            Database.save("INSERT INTO users VALUES (...)");
        }
    }

**Good:** Split into two classes with single responsibilities.

Java

    class UserService {
        private UserRepository repo;
        
        void registerUser(String name) {
            // Only handles business logic/coordination
            repo.save(name);
        }
    }
    
    class UserRepository {
        void save(String name) {
            // Only handles persistence
            Database.save("INSERT INTO users VALUES (...)");
        }
    }

### 2\. Open/Closed Principle (OCP)

**Bad:** Adding a new type requires modifying existing conditional logic.

Java

    class DiscountCalculator {
        double calculate(String customerType, double amount) {
            if (customerType.equals("REGULAR")) return amount * 0.9;
            if (customerType.equals("VIP")) return amount * 0.8; // Must modify class to add new types
            return amount;
        }
    }

**Good:** Code is open for extension via interfaces, closed for modification.

Java

    interface DiscountStrategy {
        double apply(double amount);
    }
    
    class VipDiscount implements DiscountStrategy {
        public double apply(double amount) { return amount * 0.8; }
    }
    
    class OrderProcessor {
        double checkout(double amount, DiscountStrategy strategy) {
            return strategy.apply(amount); // Works for any new strategy without modifying this class
        }
    }

### 3\. Liskov Substitution Principle (LSP)

**Bad:** Subclass breaks the behavior expected by the parent type.

Java

    class Bird {
        void fly() { /* flies */ }
    }
    
    class Penguin extends Bird {
        void fly() {
            throw new UnsupportedOperationException(); // Breaks LSP! Client code expecting a Bird will crash.
        }
    }

**Good:** Subtypes honor the behavior contract of their type.

Java

    interface Bird {
        void move();
    }
    
    class Sparrow implements Bird {
        public void move() { fly(); }
    }
    
    class Penguin implements Bird {
        public void move() { walk(); } // Honors the Bird contract safely
    }

### 4\. Interface Segregation Principle (ISP)

**Bad:** Forcing classes to implement methods they don't use.

Java

    interface Worker {
        void code();
        void eat();
    }
    
    class Robot implements Worker {
        public void code() { /* coding */ }
        public void eat() { throw new UnsupportedOperationException(); } // Forced to implement eating
    }

**Good:** Segregating interfaces into specific roles.

Java

    interface Workable { void code(); }
    interface Eatable { void eat(); }
    
    class Robot implements Workable {
        public void code() { /* coding only */ }
    }

### 5\. Dependency Inversion Principle (DIP)

**Bad:** High-level class is tightly bound to a low-level concrete class.

Java

    class PasswordReminder {
        private MySQLDatabase db = new MySQLDatabase(); // Tight coupling to a specific database
    }

**Good:** Both depend on an abstraction (interface).

Java

    interface DatabaseConnection {
        void connect();
    }
    
    class PasswordReminder {
        private DatabaseConnection db; // Depends on abstraction, not concrete implementation
    
        PasswordReminder(DatabaseConnection db) {
            this.db = db; // Dependency injection
        }
    }