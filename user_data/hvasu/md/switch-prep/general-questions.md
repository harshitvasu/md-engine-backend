### Software Architecture & Design Patterns

1.  What is the difference between MVC, MVP, and MVVM?
    
2.  How does the Singleton pattern work, and what are its drawbacks in concurrent applications?
    
3.  Can you explain the Factory vs. Abstract Factory design patterns?
    
4.  What is the Observer pattern and where is it commonly used?
    
5.  Explain the concept of Dependency Injection and Inversion of Control (IoC).
    
6.  What are the SOLID principles?
    
7.  How does a Microservices architecture differ from a Monolithic architecture?
    
8.  What is the Saga pattern in distributed systems?
    
9.  Explain the CQRS (Command Query Responsibility Segregation) pattern.
    
10.  What is Event Sourcing, and how does it relate to CQRS?
     

### Web, Networking, & APIs

11.  What are the core constraints of a RESTful API?
     
12.  GraphQL vs. REST: When would you choose one over the other?
     
13.  What is the difference between WebSockets and Long Polling?
     
14.  Explain the lifecycle of an HTTP request from browser to server and back.
     
15.  What are idempotent operations in the context of HTTP methods?
     
16.  How does OAuth 2.0 work?
     
17.  What is CORS, and how do you resolve CORS errors?
     
18.  Explain the fundamental differences between TCP and UDP.
     
19.  What is a Reverse Proxy, and why would you put one in front of your application servers?
     
20.  How does JWT (JSON Web Token) authentication work, and how do you handle token revocation?
     

### Databases & ORM

21.  What is an ORM (Object-Relational Mapping), and what is the "N+1 query problem"?
     
22.  How does database indexing work under the hood (B-Trees vs. Hash indexes)?
     
23.  Under what conditions does an index _not_ work, or when should you avoid creating one?
     
24.  Explain ACID properties in the context of database transactions.
     
25.  What is the difference between clustered and non-clustered indexes?
     
26.  SQL vs. NoSQL: How do you choose the right database paradigm for your system?
     
27.  What is Database Sharding, and how does it differ from Partitioning?
     
28.  Explain the CAP theorem.
     
29.  What is a dirty read, and how do database isolation levels prevent it?
     
30.  How do optimistic locking and pessimistic locking differ?
     

### System Design & Distributed Systems

31.  How would you design a URL shortener like Bitly?
     
32.  What is a load balancer, and what routing algorithms can it use?
     
33.  Explain the difference between horizontal and vertical scaling.
     
34.  What is caching, and what are common cache eviction policies (e.g., LRU, LFU)?
     
35.  How does a Content Delivery Network (CDN) work?
     
36.  What is the role of a message broker (e.g., Kafka, RabbitMQ) in an asynchronous architecture?
     
37.  Explain the concept of Consistent Hashing and why it is useful in distributed caching.
     
38.  How do you handle distributed transactions across multiple microservices?
     
39.  What is rate limiting, and what algorithms are commonly used to implement it (e.g., Token Bucket)?
     
40.  How do you achieve high availability and fault tolerance in a distributed system?
     

### Core Engineering, OS, & Concurrency

41.  What is the difference between a process and a thread?
     
42.  Explain the concept of a Deadlock and the four Coffman conditions required for it to occur.
     
43.  What is the difference between a Mutex and a Semaphore?
     
44.  How does Garbage Collection work in modern runtimes (e.g., the JVM)?
     
45.  Explain the difference between Synchronous and Asynchronous execution.
     
46.  What is the technical difference between Concurrency and Parallelism?
     
47.  How does a HashMap handle hash collisions internally?
     
48.  What is the difference between Pass-by-Value and Pass-by-Reference?
     
49.  Explain the concept of Thread Pools and why they are used instead of spawning new threads manually.
     
50.  What are memory leaks, and how can they occur in a memory-managed language like Java?
     

### Situation based

1\. Your Spring Boot API suddenly becomes slow. How would you find the bottleneck?

2\. 5,000 requests hit your API simultaneously. What could become the bottleneck?

3\. Your database connection pool is exhausted. What would you check first?

4\. A downstream service takes 10 seconds to respond. How would you protect your API?

5\. The same request reaches your API twice. How would you make it idempotent?

6\. Two users update the same record simultaneously. How would you handle it?

7\. Your API works locally but fails in production. What would you investigate?

8\. A "@Transactional" operation partially fails. Why might the rollback not happen as expected?

9\. Your Java application suddenly consumes too much memory. How would you debug it?

10\. A Microservice goes down while other services are healthy. How should your system handle it?

11\. Kafka consumer lag keeps increasing. What would you investigate?

12\. Your API becomes slow only during peak traffic. Which metrics would you check?

13\. A retry mechanism is making a downstream outage worse. Why?

14\. A scheduled job runs twice after scaling your application. How would you prevent it?

15\. One request passes through multiple Microservices. How would you trace it end-to-end?

---
## Difference between MVC, MVP, and MVVM

All three are architectural patterns that aim to separate concerns in UI applications. They differ mainly in how the view communicates with the presenter/controller and where the presentation logic resides.

### MVC – Model‑View‑Controller

-   **Model**: Represents the data and business logic. It is independent of the UI.
    
-   **View**: Renders the UI and displays data from the Model. It knows about the Model only for data binding.
    
-   **Controller**: Handles user input, updates the Model, and selects the appropriate View. It acts as a mediator between Model and View.
    

Typical flow: _View → Controller → Model → View_. The Controller is usually thin; most logic stays in the Model.

### MVP – Model‑View‑Presenter

-   **Model**: Same role as in MVC.
    
-   **View**: Passive UI component. It only forwards UI events to the Presenter and displays data supplied by the Presenter.
    
-   **Presenter**: Contains all presentation logic. It retrieves data from the Model, formats it, and pushes it to the View. The View never talks directly to the Model.
    

Typical flow: _View → Presenter ↔ Model_. The Presenter can be unit‑tested easily because it has no UI dependencies.

### MVVM – Model‑View‑View-Model

-   **Model**: Same as above.
    
-   **View**: Declarative UI (e.g., XAML, HTML) that binds to properties exposed by the ViewModel.
    
-   **ViewModel**: Exposes data and commands as observable properties. It mediates between the Model and the View, handling presentation logic without knowing about UI specifics.
    

Typical flow: _View ⇆ ViewModel ⇆ Model_. Data binding keeps the View and ViewModel synchronized automatically.

### Key Comparison

<table class="border-collapse table-auto w-full" style="min-width: 100px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Aspect</p></th><th colspan="1" rowspan="1"><p>MVC</p></th><th colspan="1" rowspan="1"><p>MVP</p></th><th colspan="1" rowspan="1"><p>MVVM</p></th></tr><tr><td colspan="1" rowspan="1"><p>View’s role</p></td><td colspan="1" rowspan="1"><p>Active, may contain logic</p></td><td colspan="1" rowspan="1"><p>Passive, only renders data</p></td><td colspan="1" rowspan="1"><p>Passive, bound to ViewModel</p></td></tr><tr><td colspan="1" rowspan="1"><p>Mediator</p></td><td colspan="1" rowspan="1"><p>Controller</p></td><td colspan="1" rowspan="1"><p>Presenter</p></td><td colspan="1" rowspan="1"><p>ViewModel</p></td></tr><tr><td colspan="1" rowspan="1"><p>Communication direction</p></td><td colspan="1" rowspan="1"><p>Controller pulls from Model, pushes to View</p></td><td colspan="1" rowspan="1"><p>Presenter pushes to View, pulls from Model</p></td><td colspan="1" rowspan="1"><p>Two‑way data binding (View ⇆ ViewModel)</p></td></tr><tr><td colspan="1" rowspan="1"><p>Testability</p></td><td colspan="1" rowspan="1"><p>Controller logic can be tested; View often tightly coupled</p></td><td colspan="1" rowspan="1"><p>Presenter fully testable (no UI dependency)</p></td><td colspan="1" rowspan="1"><p>ViewModel highly testable via bindings</p></td></tr><tr><td colspan="1" rowspan="1"><p>Typical platforms</p></td><td colspan="1" rowspan="1"><p>Web frameworks (Rails, Django), classic desktop apps</p></td><td colspan="1" rowspan="1"><p>WinForms, Android (pre‑DataBinding), iOS (VIPER variant)</p></td><td colspan="1" rowspan="1"><p>WPF, Silverlight, Angular, React (with hooks), modern mobile frameworks</p></td></tr></tbody></table>

---
## Singleton Pattern

The Singleton pattern ensures that a class has exactly one instance and provides a global point of access to that instance. The typical implementation follows these steps:

1.  Declare a `private static` variable that holds the sole instance.
    
2.  Make the class constructor `private` (or otherwise inaccessible) so that external code cannot create additional instances.
    
3.  Provide a `public static` method (often named `getInstance()`) that:
    
    -   Checks whether the static instance variable is `null`.
        
    -   If it is `null`, creates the instance and stores it in the static variable.
        
    -   Returns the stored instance.
        

This lazy‑initialization approach creates the object only when it is first needed, while eager initialization creates it at class‑loading time.

### Drawbacks in Concurrent Applications

-   **Race conditions during lazy initialization:** If multiple threads call `getInstance()` simultaneously, they may each see the static variable as `null` and create separate instances, violating the Singleton guarantee.
    
-   **Performance overhead of synchronization:** To prevent the race condition, developers often synchronize the `getInstance()` method or use a synchronized block. This introduces locking overhead on every access, which can become a bottleneck in high‑throughput systems.
    
-   **Double‑checked locking pitfalls:** The classic “double‑checked locking” optimization is error‑prone in languages without proper memory‑model guarantees (e.g., before Java 5). Incorrect implementations can still yield partially constructed objects.
    
-   **Testing and maintainability:** Global state introduced by a Singleton makes unit testing harder because tests can unintentionally share state. In concurrent environments, shared mutable state is a common source of flaky tests.
    
-   **Difficulty with dependency injection:** Singletons resist being replaced with mock implementations, which limits flexibility in multi‑threaded applications that rely on different configurations per thread or request.
    

### Thread‑Safe Singleton Example in Java

Below are two common approaches that avoid the pitfalls mentioned above.

#### 1\. Eager Initialization (simple and thread‑safe)

    public final class EagerSingleton {
        // Instance is created at class‑loading time.
        private static final EagerSingleton INSTANCE = new EagerSingleton();
    
        // Private constructor prevents external instantiation.
        private EagerSingleton() { }
    
        public static EagerSingleton getInstance() {
            return INSTANCE;
        }
    
        // Example business method.
        public void doWork() {
            System.out.println("Working with eager singleton");
        }
    }
    

#### 2\. Lazy Initialization with Double‑Checked Locking (Java 5+)

    public final class LazySingleton {
        // Volatile guarantees visibility of changes across threads.
        private static volatile LazySingleton instance = null;
    
        private LazySingleton() { }
    
        public static LazySingleton getInstance() {
            if (instance == null) {               // First check (no locking)
                synchronized (LazySingleton.class) {
                    if (instance == null) {       // Second check (with lock)
                        instance = new LazySingleton();
                    }
                }
            }
            return instance;
        }
    
        public void doWork() {
            System.out.println("Working with lazy singleton");
        }
    }
    

#### 3\. Initialization‑On‑Demand Holder (recommended)

    public final class HolderSingleton {
    
        private HolderSingleton() { }
    
        // Inner static class is not loaded until getInstance() is called.
        private static class Holder {
            private static final HolderSingleton INSTANCE = new HolderSingleton();
        }
    
        public static HolderSingleton getInstance() {
            return Holder.INSTANCE;
        }
    
        public void doWork() {
            System.out.println("Working with holder singleton");
        }
    }
    

All three implementations guarantee that only one instance exists even when accessed concurrently. The _Initialization‑On‑Demand Holder_ idiom is often preferred because it provides lazy initialization without explicit synchronization, avoiding both performance overhead and the subtle bugs of double‑checked locking.

---
## Factory vs. Abstract Factory Design Patterns

Both patterns belong to the **creational** family and help you decouple object creation from the rest of your code. They solve slightly different problems, and choosing the right one depends on how many families of related objects you need to create.

### Factory Method (Simple Factory)

-   Defines an interface for creating a single product, but lets subclasses decide which concrete class to instantiate.
    
-   Useful when a class cannot anticipate the exact type of objects it must create.
    
-   Encourages _open/closed principle_ – you can add new product types without modifying existing creator code.
    
        public interface Button {
            void render();
        }
        
        public class WindowsButton implements Button {
            public void render() {
                System.out.println("Render a Windows style button");
            }
        }
        
        public class MacButton implements Button {
            public void render() {
                System.out.println("Render a macOS style button");
            }
        }
        
        /* Creator */
        public abstract class Dialog {
            // The factory method
            public abstract Button createButton();
        
            public void renderDialog() {
                Button button = createButton(); // product creation is delegated
                button.render();
            }
        }
        
        /* Concrete creators */
        public class WindowsDialog extends Dialog {
            @Override
            public Button createButton() {
                return new WindowsButton();
            }
        }
        
        public class MacDialog extends Dialog {
            @Override
            public Button createButton() {
                return new MacButton();
            }
        }
        
        /* Client code */
        public class Application {
            public static void main(String[] args) {
                Dialog dialog = new WindowsDialog(); // could be decided at runtime
                dialog.renderDialog(); // prints "Render a Windows style button"
            }
        }
        
    

### Abstract Factory

-   Provides an interface for creating families of related or dependent objects without specifying their concrete classes.
    
-   Each concrete factory produces a set of products that belong together (e.g., Windows UI components vs. macOS UI components).
    
-   Ideal when you need to ensure that products from the same family are used together.
    
        /* Abstract products */
        public interface Button {
            void render();
        }
        
        public interface Checkbox {
            void render();
        }
        
        /* Concrete Windows products */
        public class WindowsButton implements Button {
            public void render() {
                System.out.println("Render a Windows button");
            }
        }
        
        public class WindowsCheckbox implements Checkbox {
            public void render() {
                System.out.println("Render a Windows checkbox");
            }
        }
        
        /* Concrete macOS products */
        public class MacButton implements Button {
            public void render() {
                System.out.println("Render a macOS button");
            }
        }
        
        public class MacCheckbox implements Checkbox {
            public void render() {
                System.out.println("Render a macOS checkbox");
            }
        }
        
        /* Abstract factory */
        public interface GUIFactory {
            Button createButton();
            Checkbox createCheckbox();
        }
        
        /* Concrete factories */
        public class WindowsFactory implements GUIFactory {
            public Button createButton() {
                return new WindowsButton();
            }
            public Checkbox createCheckbox() {
                return new WindowsCheckbox();
            }
        }
        
        public class MacFactory implements GUIFactory {
            public Button createButton() {
                return new MacButton();
            }
            public Checkbox createCheckbox() {
                return new MacCheckbox();
            }
        }
        
        /* Client */
        public class Application {
            private Button button;
            private Checkbox checkbox;
        
            public Application(GUIFactory factory) {
                button = factory.createButton();
                checkbox = factory.createCheckbox();
            }
        
            public void render() {
                button.render();
                checkbox.render();
            }
        
            public static void main(String[] args) {
                GUIFactory factory = System.getProperty("os.name").contains("Mac")
                        ? new MacFactory()
                        : new WindowsFactory();
                Application app = new Application(factory);
                app.render();
            }
        }
        
    

### Key Differences at a Glance

<table class="border-collapse table-auto w-full" style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Aspect</p></th><th colspan="1" rowspan="1"><p>Factory Method</p></th><th colspan="1" rowspan="1"><p>Abstract Factory</p></th></tr><tr><td colspan="1" rowspan="1"><p>Purpose</p></td><td colspan="1" rowspan="1"><p>Creates a <em>single</em> product type.</p></td><td colspan="1" rowspan="1"><p>Creates <em>families</em> of related products.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Number of factories</p></td><td colspan="1" rowspan="1"><p>One factory (or creator) per product hierarchy.</p></td><td colspan="1" rowspan="1"><p>One factory per product family.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Client dependency</p></td><td colspan="1" rowspan="1"><p>Depends on a creator class.</p></td><td colspan="1" rowspan="1"><p>Depends on an abstract factory interface.</p></td></tr><tr><td colspan="1" rowspan="1"><p>Extensibility</p></td><td colspan="1" rowspan="1"><p>Easy to add new concrete products.</p></td><td colspan="1" rowspan="1"><p>Easy to add new product families while keeping families consistent.</p></td></tr></tbody></table>

---
## Observer Pattern

The Observer pattern is a behavioral design pattern that defines a one‑to‑many dependency between objects so that when one object (the **subject**) changes its state, all its dependents (the **observers**) are automatically notified and updated. This decouples the subject from the observers, allowing both to vary independently.

### Typical Use Cases

-   UI frameworks – updating views when the underlying data model changes (e.g., Model‑View‑Controller).
    
-   Event handling systems – broadcasting events like mouse clicks or network messages to multiple listeners.
    
-   Data binding – synchronizing multiple representations of the same data source.
    
-   Real‑time applications – notifying dashboards, logs, or caches when new data arrives.
    

### Core Participants

-   **Subject (Observable)** – maintains a list of observers and provides methods to attach, detach, and notify them.
    
-   **Observer** – defines an interface with a method that the subject calls to deliver updates.
    

### Code Example (JavaScript)

Below is a simple implementation of the Observer pattern using ES6 classes.

    class Subject {
      constructor() {
        this.observers = new Set(); // store unique observers
      }
    
      // Register an observer
      subscribe(observer) {
        this.observers.add(observer);
      }
    
      // Unregister an observer
      unsubscribe(observer) {
        this.observers.delete(observer);
      }
    
      // Notify all observers about a change
      notify(data) {
        for (const observer of this.observers) {
          observer.update(data);
        }
      }
    }
    
    // Observer interface – any object with an `update` method works
    class ConcreteObserver {
      constructor(name) {
        this.name = name;
      }
    
      update(data) {
        console.log(`${this.name} received:`, data);
      }
    }
    
    // ---- Usage ----
    const subject = new Subject();
    
    const observerA = new ConcreteObserver('Observer A');
    const observerB = new ConcreteObserver('Observer B');
    
    subject.subscribe(observerA);
    subject.subscribe(observerB);
    
    // Simulate a state change
    subject.notify({ message: 'Hello observers!' });
    
    /* Output:
    Observer A received: { message: 'Hello observers!' }
    Observer B received: { message: 'Hello observers!' }
    */
    

### Key Benefits

-   **Loose coupling**: subjects do not need to know concrete observer implementations.
    
-   **Scalability**: new observers can be added without modifying the subject.
    
-   **Reusability**: the same subject can serve many different observers in different contexts.
    

### Things to Watch Out For

-   Potential memory leaks if observers are not properly unsubscribed.
    
-   Uncontrolled notifications can lead to performance bottlenecks.
    
-   Order of notification is not guaranteed unless explicitly managed.
    

---
## Dependency Injection and Inversion of Control

**Inversion of Control (IoC)** is a design principle in which the flow of control of a program is inverted compared to traditional procedural code. Rather than the application code explicitly creating and managing its own dependencies, an external entity (such as a framework or container) takes responsibility for providing those dependencies. This “flipping” of control helps to decouple components, making the system more modular, testable, and maintainable.

### Key ideas behind IoC

-   **Separation of concerns:** Objects focus on their core responsibilities instead of on how to obtain the services they need.
    
-   **Loose coupling:** Components depend on abstractions (e.g., interfaces) rather than concrete implementations.
    
-   **Extensibility:** New implementations can be introduced without changing existing code.
    

### Dependency Injection (DI)

Dependency Injection is a concrete pattern that implements IoC. With DI, an object’s required collaborators (its _dependencies_) are supplied—or “injected”—by an external assembler rather than being created inside the object itself.

#### Types of injection

-   **Constructor injection:** Dependencies are passed as parameters to the class’s constructor.
    
-   **Setter (property) injection:** Dependencies are assigned via public setter methods or properties after object creation.
    
-   **Interface injection:** The class implements an interface that defines a method for receiving its dependencies.
    

#### Simple example (Java)

    public interface MessageService {
        void send(String message);
    }
    
    public class EmailService implements MessageService {
        public void send(String message) {
            // logic to send email
        }
    }
    
    // Class that depends on MessageService
    public class Notification {
        private final MessageService service; // dependency
    
        // Constructor injection
        public Notification(MessageService service) {
            this.service = service;
        }
    
        public void alert(String msg) {
            service.send(msg);
        }
    }
    
    // Assembling the objects (often done by a DI container)
    MessageService email = new EmailService();
    Notification notification = new Notification(email);
    notification.alert("Dependency Injection in action!");
    

### Benefits of using DI and IoC

1.  **Improved testability:** Dependencies can be replaced with mocks or stubs in unit tests.
    
2.  **Reduced coupling:** Classes rely on abstractions, making it easier to swap implementations.
    
3.  **Clearer architecture:** Object creation and wiring are centralized, often in configuration files or a container.
    
4.  **Enhanced maintainability:** Changes to a dependency’s implementation rarely require changes in consuming classes.
    

In summary, Inversion of Control shifts the responsibility for managing object lifecycles to an external framework, and Dependency Injection is the most common technique to achieve that shift, leading to cleaner, more modular code.

---
## SOLID Principles

The SOLID principles are a set of five design guidelines that help developers create software that is easier to maintain, understand, and extend. Below each principle is a short description, practical commentary, and a concise code example (Java) showing both a violation and a correct application.

### 1\. Single Responsibility Principle (SRP)

-   **Concept:** A class should have only one reason to change, meaning it should encapsulate a single responsibility.
    
-   **Practical view:** When a class starts handling multiple concerns (e.g., business logic \*and\* persistence), any change in one concern forces a modification to the same class, increasing the risk of bugs.
    

_Violation:_

    public class OrderProcessor {
        public void calculateTotal(Order order) {
            // business logic
        }
    
        public void saveToDatabase(Order order) {
            // persistence logic – violates SRP
        }
    
        public void sendConfirmationEmail(Order order) {
            // notification logic – also violates SRP
        }
    }
    

_Correct application:_

    public class OrderCalculator {
        public double calculateTotal(Order order) {
            // business logic only
        }
    }
    
    public class OrderRepository {
        public void save(Order order) {
            // persistence only
        }
    }
    
    public class EmailNotifier {
        public void sendConfirmation(Order order) {
            // notification only
        }
    }
    

### 2\. Open/Closed Principle (OCP)

-   **Concept:** Software entities (classes, modules, functions, etc.) should be open for extension but closed for modification.
    
-   **Practical view:** Instead of changing existing code to add new behavior, you extend the system by adding new classes or methods that conform to existing abstractions.
    

_Violation (modifying existing class):_

    public class DiscountCalculator {
        public double applyDiscount(Order order, String type) {
            if (type.equals("BLACK_FRIDAY")) {
                return order.getTotal() * 0.7;
            } else if (type.equals("VIP")) {
                return order.getTotal() * 0.85;
            }
            return order.getTotal();
        }
    }
    

_Correct application (use abstraction):_

    public interface DiscountStrategy {
        double apply(Order order);
    }
    
    public class BlackFridayDiscount implements DiscountStrategy {
        public double apply(Order order) {
            return order.getTotal() * 0.7;
        }
    }
    
    public class VipDiscount implements DiscountStrategy {
        public double apply(Order order) {
            return order.getTotal() * 0.85;
        }
    }
    
    public class DiscountCalculator {
        private final DiscountStrategy strategy;
    
        public DiscountCalculator(DiscountStrategy strategy) {
            this.strategy = strategy;
        }
    
        public double applyDiscount(Order order) {
            return strategy.apply(order);
        }
    }
    

### 3\. Liskov Substitution Principle (LSP)

-   **Concept:** Objects of a superclass should be replaceable with objects of a subclass without affecting the correctness of the program.
    
-   **Practical view:** Subclasses must honor the contract (pre‑conditions, post‑conditions, invariants) of their base class. Violating this leads to surprising runtime errors.
    

_Violation (subclass breaks expectation):_

    public class Rectangle {
        protected int width;
        protected int height;
    
        public void setWidth(int w) { this.width = w; }
        public void setHeight(int h) { this.height = h; }
        public int area() { return width * height; }
    }
    
    public class Square extends Rectangle {
        @Override
        public void setWidth(int w) {
            this.width = this.height = w; // changes height too – breaks LSP
        }
    
        @Override
        public void setHeight(int h) {
            this.width = this.height = h;
        }
    }
    

_Correct application (favor composition over inheritance):_

    public interface Shape {
        int area();
    }
    
    public class Rectangle implements Shape {
        private final int width;
        private final int height;
    
        public Rectangle(int width, int height) {
            this.width = width;
            this.height = height;
        }
    
        public int area() { return width * height; }
    }
    
    public class Square implements Shape {
        private final int side;
    
        public Square(int side) {
            this.side = side;
        }
    
        public int area() { return side * side; }
    }
    

### 4\. Interface Segregation Principle (ISP)

-   **Concept:** Clients should not be forced to depend on interfaces they do not use; create specific, fine‑grained interfaces rather than a single “fat” one.
    
-   **Practical view:** When a class implements an interface that contains unrelated methods, you end up with empty or dummy implementations, which makes the code harder to understand and maintain.
    

_Violation (fat interface):_

    public interface Worker {
        void code();
        void test();
        void design();
        void manage();
    }
    
    public class Developer implements Worker {
        public void code() { /* … */ }
        public void test() { /* … */ }
        public void design() { /* not needed */ }
        public void manage() { /* not needed */ }
    }
    

_Correct application (segregated interfaces):_

    public interface Coder {
        void code();
    }
    
    public interface Tester {
        void test();
    }
    
    public interface Designer {
        void design();
    }
    
    public interface Manager {
        void manage();
    }
    
    public class Developer implements Coder, Tester {
        public void code() { /* … */ }
        public void test() { /* … */ }
    }
    

### 5\. Dependency Inversion Principle (DIP)

-   **Concept:** High‑level modules should not depend on low‑level modules; both should depend on abstractions. Abstractions should not depend on details; details should depend on abstractions.
    
-   **Practical view:** By depending on interfaces (or abstract classes) rather than concrete implementations, you can swap out low‑level details (e.g., a database or a web service) without touching the high‑level business logic.
    

_Violation (high‑level class directly instantiates a low‑level class):_

    public class OrderService {
        private final MySqlOrderRepository repository = new MySqlOrderRepository();
    
        public void place(Order order) {
            repository.save(order);
        }
    }
    

_Correct application (depend on abstraction, inject concrete implementation):_

    public interface OrderRepository {
        void save(Order order);
    }
    
    public class MySqlOrderRepository implements OrderRepository {
        public void save(Order order) {
            // MySQL persistence
        }
    }
    
    public class InMemoryOrderRepository implements OrderRepository {
        public void save(Order order) {
            // simple in‑memory storage
        }
    }
    
    public class OrderService {
        private final OrderRepository repository;
    
        public OrderService(OrderRepository repository) {
            this.repository = repository; // injected dependency
        }
    
        public void place(Order order) {
            repository.save(order);
        }
    }
    

Applying these principles consistently leads to code that is easier to test, extend, and refactor, ultimately reducing technical debt and improving overall software quality.

---
## Monolithic vs. Microservices Architecture: Key Differences

Choosing between a monolithic architecture and a microservices architecture is one of the most critical decisions in software engineering. While both approaches aim to deliver scalable and maintainable applications, they structure codebases, deployments, and team workflows in fundamentally different ways.

### 1\. Monolithic Architecture

In a monolithic architecture, an application is built as a single, unified unit. All components—the user interface, business logic, and data access layers—are packaged and deployed together.

-   **Single Codebase:** All functional modules reside in one repository and share a single database.
    
-   **Unified Deployment:** Any update, bug fix, or new feature requires compiling and redeploying the entire application.
    
-   **Tight Coupling:** Components frequently depend directly on one another via internal function calls, making isolation difficult.
    

**Key Advantages:** Simpler to develop initially, straightforward debugging and end-to-end testing, lower operational overhead, and faster early-stage time to market.

**Key Challenges:** Scalability bottlenecks (the entire app must scale even if only one module needs more resources), slower deployment cycles as the app grows, and risk of a single bug crashing the entire system.

### 2\. Microservices Architecture

A microservices architecture breaks an application down into a collection of small, autonomous services. Each service is built around a specific business capability, runs in its own process, and communicates over lightweight protocols (such as HTTP/REST, gRPC, or messaging queues).

-   **Decoupled Services:** Each service handles a distinct domain (e.g., authentication, billing, notifications) and can be developed and maintained independently.
    
-   **Independent Deployment:** Teams can deploy updates to a single service without rebuilding or redeploying the rest of the ecosystem.
    
-   **Polyglot Persistence & Tech Stack:** Different services can leverage different programming languages, frameworks, and database types best suited for their specific task.
    

**Key Advantages:** Granular scalability, enhanced fault tolerance (a failure in one service does not necessarily bring down the entire app), and flexibility for large, distributed engineering teams.

**Key Challenges:** Significant operational complexity (requires orchestration, service discovery, distributed tracing, and automated CI/CD), network latency, and challenging data consistency across distributed databases.

### Side-by-Side Comparison

<table class="border-collapse table-auto w-full" style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Dimension</p></th><th colspan="1" rowspan="1"><p>Monolithic Architecture</p></th><th colspan="1" rowspan="1"><p>Microservices Architecture</p></th></tr><tr><td colspan="1" rowspan="1"><p><strong>Structure</strong></p></td><td colspan="1" rowspan="1"><p>Single unified codebase and process</p></td><td colspan="1" rowspan="1"><p>Multiple distributed, independent services</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Deployment</strong></p></td><td colspan="1" rowspan="1"><p>All-or-nothing redeployment</p></td><td colspan="1" rowspan="1"><p>Independent, per-service deployment</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Data Management</strong></p></td><td colspan="1" rowspan="1"><p>Shared, centralized database</p></td><td colspan="1" rowspan="1"><p>Database-per-service (decentralized)</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Scalability</strong></p></td><td colspan="1" rowspan="1"><p>Vertical or horizontal scaling of the entire app</p></td><td colspan="1" rowspan="1"><p>Horizontal scaling tailored to individual services</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Fault Tolerance</strong></p></td><td colspan="1" rowspan="1"><p>Single failure can impact the entire application</p></td><td colspan="1" rowspan="1"><p>Failures are isolated within specific service boundaries</p></td></tr><tr><td colspan="1" rowspan="1"><p><strong>Operational Complexity</strong></p></td><td colspan="1" rowspan="1"><p>Low to moderate</p></td><td colspan="1" rowspan="1"><p>High (requires containerization, orchestration, and monitoring)</p></td></tr></tbody></table>

### When to Choose Which

A **monolith** is generally the right choice for startups, proofs of concept (POCs), small teams, or applications with straightforward business domains where simplicity and speed of iteration are paramount.

A **microservices architecture** is best suited for large, enterprise-scale systems with high traffic, multiple distinct business capabilities, and several cross-functional teams that need to deploy features independently without stepping on each other's toes.

---
## Understanding the Saga Pattern in Distributed Systems

The **Saga pattern** is a design pattern used in distributed architectures, such as microservices, to manage long-running distributed transactions without relying on traditional, blocking mechanisms like Two-Phase Commit (2PC).

In a microservices architecture, each service often has its own dedicated database. Because a single business workflow might span multiple services, maintaining data consistency without distributed database locks becomes a challenge. The Saga pattern addresses this by breaking a distributed transaction into a sequence of smaller, local transactions.

### How the Saga Pattern Works

1.  **Local Transactions:** Each service involved in a Saga executes its own local transaction to update its database and then emits an event or message to trigger the next step.
    
2.  **Compensating Transactions:** If any local transaction fails, the Saga pattern relies on _compensating transactions_—a series of undo actions executed in reverse order to roll back the changes made by preceding successful transactions.
    

### Implementation Approaches

There are two primary ways to coordinate a Saga:

-   **Choreography (Decentralized):** Services interact directly by listening to domain events. When Service A completes a task, it publishes an event. Service B subscribes to this event, performs its task, and publishes another event. There is no central controller. This works well for simple workflows but can become difficult to track as complexity grows.
    
-   **Orchestration (Centralized):** A dedicated component, called a Saga Orchestrator, directs the participants. The orchestrator sends commands to services, processes their responses, and dictates the sequence of actions or triggers compensating actions if a step fails. This approach centralizes the business logic and simplifies workflow monitoring.
    

### Advantages

-   **High Availability and Scalability:** Avoids distributed database locks, allowing services to commit changes locally and remain responsive.
    
-   **Fault Tolerance:** Automatically handles failures by triggering compensating actions to return the system to a consistent state.
    

### Challenges and Trade-offs

-   **Eventual Consistency:** The system is eventually consistent rather than immediately consistent, meaning intermediate states are visible to other operations.
    
-   **Complexity:** Designing idempotent operations, handling race conditions, and writing compensating transactions for non-reversible actions requires significant engineering effort.
    
-   **Lack of Isolation:** Because transactions commit early, dirty reads and phantom reads can occur if other processes read data before a Saga completes or rolls back.
    

---
## Command Query Responsibility Segregation (CQRS)

The Command Query Responsibility Segregation (CQRS) pattern separates the responsibilities of reading data (queries) from modifying data (commands). By using distinct models for each operation, CQRS improves scalability, performance, and maintainability of complex systems.

### Core Principles

-   **Command side**: Handles operations that change state. Commands are intent‑driven, often expressed as immutable messages (e.g., `CreateOrder`, `UpdateCustomerAddress`).
    
-   **Query side**: Handles data retrieval. Queries never modify state and can be optimized for read performance (e.g., denormalized views, materialized read models).
    
-   **Separation of models**: The write model focuses on business rules and invariants, while the read model focuses on efficient data shaping for UI consumption.
    

### Typical Architecture

    +-------------------+          +-------------------+
    |   Command Side    |          |    Query Side     |
    | (Write Model)     |          | (Read Model)      |
    +--------+----------+          +--------+----------+
             |                               |
       Command Dispatcher                Query Dispatcher
             |                               |
       Domain Logic (Aggregates)      Read Model Store (e.g., SQL, NoSQL)
             |                               |
       Event Store (optional)  <----- Event Handlers -----
    

### Benefits

-   **Scalability**: Read and write workloads can be scaled independently, allowing you to allocate resources where they are needed most.
    
-   **Performance**: Read models can be tuned for fast queries (e.g., using caching, denormalization) without affecting write latency.
    
-   **Clearer domain logic**: Commands enforce business invariants, while queries remain simple data retrieval operations.
    
-   **Better separation of concerns**: Teams can work on the write side (complex domain rules) and read side (UI/ reporting) without stepping on each other’s code.
    

### When to Use CQRS

-   Systems with a high read‑to‑write ratio.
    
-   Applications requiring complex business rules on writes but simple, fast reads.
    
-   Scenarios where different consistency requirements apply (e.g., eventual consistency for reads).
    
-   Projects that can benefit from separate scaling, security, or deployment strategies for commands and queries.
    

### Potential Drawbacks

-   Increased architectural complexity; not all projects need the added overhead.
    
-   Eventual consistency can introduce synchronization challenges between write and read models.
    
-   More infrastructure components (e.g., message bus, event store) may be required.
    

### Summary

CQRS encourages a clean separation between the parts of a system that mutate state and the parts that read it. When applied to the right problem domain, it can dramatically improve scalability, performance, and clarity of the codebase, while also introducing additional complexity that should be weighed against the project’s needs.

---
## Event Sourcing and Its Relationship to CQRS

**Event Sourcing** is a persistence pattern in which the state of a domain entity is derived from a chronological sequence of immutable events rather than from a traditional row‑based snapshot. Each event represents a fact that has occurred in the past (e.g., _OrderPlaced_, _ItemAddedToCart_), and the current state is reconstructed by replaying those events in order.

### Core Characteristics

-   Events are immutable and append‑only.
    
-   The complete history of changes is retained, enabling audit trails and time‑travel queries.
    
-   State reconstruction is performed by applying events to an initially empty aggregate.
    
-   Typically paired with a `Event Store` that optimizes for sequential writes and reads of event streams.
    

### How Event Sourcing Relates to CQRS

**Command‑Query Responsibility Segregation (CQRS)** separates the model used to handle commands (writes) from the model used to handle queries (reads). Event Sourcing naturally complements CQRS for several reasons:

1.  **Write side alignment:** Commands result in events that are persisted to the event store. The write model focuses on business rules and emitting these domain events.
    
2.  **Read side projection:** Event handlers (or projection processes) consume the same event stream to build one or more read‑optimized views (materialized views, caches, etc.). This decouples the read model from the write model.
    
3.  **Consistency patterns:** Because the read side is updated asynchronously from the event stream, CQRS with Event Sourcing often embraces eventual consistency, while still guaranteeing strong consistency on the write side.
    
4.  **Scalability and flexibility:** Multiple independent read models can be created for different query requirements without affecting the core event log or command handling logic.
    

### Benefits of Combining Both Patterns

-   Complete auditability and traceability of every state change.
    
-   Simplified debugging and the ability to replay events for testing or migration.
    
-   Clear separation of concerns, allowing teams to evolve read and write models independently.
    
-   Enhanced scalability: writes are fast append operations, while reads can be scaled out via separate projection stores.
    

### Typical Implementation Flow

1.  A client issues a _command_ (e.g., `PlaceOrder`).
    
2.  The command handler validates business rules and emits one or more domain events.
    
3.  Events are persisted atomically to the event store.
    
4.  Event subscribers update the write‑side aggregate state and publish events to projection processes.
    
5.  Projections consume the events and update read‑model databases or caches.