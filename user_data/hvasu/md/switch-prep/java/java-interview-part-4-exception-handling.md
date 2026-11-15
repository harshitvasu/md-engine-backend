# 4. Exception Handling

## 24. Checked vs unchecked exceptions?

### The Java Exception Hierarchy

In Java, all exceptions inherit from `java.lang.Throwable`. The taxonomy divides into **Checked Exceptions** and **Unchecked Exceptions**:

```
                       Throwable
                      /         \
                     /           \
                 Exception       Error (Unchecked, JVM level)
                /         \
               /           \
     Checked Exceptions    RuntimeException (Unchecked, programming errors)
   (IOException,           (NullPointerException,
    SQLException,           IllegalArgumentException,
    ClassNotFoundException) IndexOutOfBoundsException)
```

### Detailed Comparison Table

| Attribute | Checked Exceptions | Unchecked Exceptions |
| :--- | :--- | :--- |
| **Inherits From** | Subclasses of `Exception` (excluding `RuntimeException`) | Subclasses of `RuntimeException` (and `Error`) |
| **Compiler Verification** | **Checked at compile time** by `javac` | **Ignored at compile time**; occurs at runtime |
| **Handling Mandate** | **Mandatory:** Must be caught (`try-catch`) or declared (`throws`) | **Optional:** Compiler does not enforce handling |
| **Nature of Problem** | Recoverable, anticipated conditions outside program control | Programming logic bugs, invalid arguments, contract violations |
| **Examples** | `IOException`, `SQLException`, `FileNotFoundException` | `NullPointerException`, `ArithmeticException`, `ClassCastException` |

### Architectural Best Practices in Modern Java

Historically, Java favored checked exceptions for any scenario an application might recover from. However, in modern frameworks (Spring, Hibernate, Jackson):
* Checked exceptions lead to cluttered method signatures and empty catch blocks.
* Modern frameworks wrap checked exceptions into **Unchecked Exceptions** (e.g., Spring wraps JDBC checked `SQLException` into unchecked `DataAccessException`).
* Use checked exceptions only when the caller can **meaningfully recover programmatically** (e.g., prompting the user for an alternate filename when `FileNotFoundException` occurs). Use unchecked exceptions for bugs and unrecoverable states.

### Code Demonstration

```java
import java.io.*;

public class ExceptionTypesDemo {

    // Checked Exception: Compiler FORCES caller to handle or declare throws
    public static void readConfiguration(String path) throws IOException {
        File file = new File(path);
        if (!file.exists()) {
            throw new FileNotFoundException("Config file missing: " + path);
        }
    }

    // Unchecked Exception: Indicates programmer logic error; no signature declaration needed
    public static double divide(int numerator, int denominator) {
        if (denominator == 0) {
            throw new IllegalArgumentException("Denominator cannot be zero"); // Unchecked
        }
        return (double) numerator / denominator;
    }

    public static void main(String[] args) {
        // 1. Handling Checked Exception
        try {
            readConfiguration("/etc/app.conf");
        } catch (IOException e) {
            System.err.println("Handled checked exception: " + e.getMessage());
        }

        // 2. Unchecked Exception: Compiler does not require try-catch
        try {
            divide(10, 0);
        } catch (IllegalArgumentException e) {
            System.err.println("Handled unchecked exception: " + e.getMessage());
        }
    }
}
```

---

## 25. Exception vs Error?

### The Conceptual Distinction

Both `Exception` and `Error` inherit directly from `java.lang.Throwable`, but they represent fundamentally distinct problem domains:

```
                            Throwable
                            /       \
                           /         \
                      Exception       Error
                  (Application level) (System/JVM level)
```

* **`Exception` (`java.lang.Exception`):** Represents abnormal conditions that a **reasonable application might anticipate and recover from**. They are typically caused by application code, external inputs, or network/disk I/O failures.
* **`Error` (`java.lang.Error`):** Represents **catastrophic, fatal conditions** that a reasonable application should **never attempt to catch**. They indicate low-level hardware or JVM failures where the virtual machine's integrity may be compromised.

### Comparison Matrix

| Property | `Exception` | `Error` |
| :--- | :--- | :--- |
| **Origin** | Application logic, network, filesystem | JVM, system memory, native OS subsystem |
| **Recoverability** | **Recoverable:** Can catch and take corrective action | **Unrecoverable:** Process should typically terminate |
| **Handling Guideline** | Catch with specific catch blocks | Do **not** catch; let JVM log crash/dump |
| **Type** | Can be checked (`IOException`) or unchecked (`RuntimeException`) | Strictly unchecked |
| **Examples** | `TimeoutException`, `SQLException`, `NullPointerException` | `OutOfMemoryError`, `StackOverflowError`, `VirtualMachineError` |

### Why Catching `Throwable` or `Error` is an Anti-Pattern

Catching `Throwable` or `Error` (`catch (Throwable t)`) swallows fatal JVM errors and thread interruptions. For example:
* If an `OutOfMemoryError` occurs, the heap is exhausted. Trying to catch it and proceed leaves the application in an unpredictable, half-initialized state.
* If a `ThreadDeath` or `VirtualMachineError` occurs, the thread was terminated intentionally by the runtime.

```java
// ANTI-PATTERN: Never do this!
try {
    executeMissionCriticalTask();
} catch (Throwable t) { 
    // Catches OutOfMemoryError and ThreadDeath, preventing clean shutdown!
    log.error("Error occurred", t);
}

// CORRECT: Catch Exception, let Error bubble up to JVM handlers
try {
    executeMissionCriticalTask();
} catch (Exception e) {
    log.error("Application operation failed", e);
}
```

---

## 26. throw vs throws?

### Clear Distinction

* **`throw` (Action Verb):** An executable statement used inside a method body to **instantiate and trigger an exception** immediately.
* **`throws` (Method Clause):** A declaration in a method signature that informs calling code that this method **may propagate specified exceptions** up the call stack.

### Comparison Table

| Attribute | `throw` Keyword | `throws` Clause |
| :--- | :--- | :--- |
| **Location** | Inside a **method body** or code block | In the **method signature** |
| **Followed By** | An **instance** of a `Throwable` subclass | A comma-separated list of **class types** |
| **Execution** | Halts current execution flow immediately | Merely a compile-time declaration |
| **Multiplicity** | Throws exactly **one** exception instance at a time | Can declare **multiple** exception types |

### Code Demonstration

```java
import java.io.IOException;
import java.sql.SQLException;

public class ThrowVsThrowsDemo {

    // 'throws' in the signature declares potential checked exceptions to callers
    public static void processRecord(String recordId, int amount) throws IOException, SQLException {
        if (recordId == null || recordId.isEmpty()) {
            // 'throw' actively throws a new exception instance
            throw new IllegalArgumentException("Record ID cannot be empty");
        }

        if (amount < 0) {
            // Actively throwing a checked exception instance
            throw new IOException("Negative transaction amounts not supported: " + amount);
        }

        System.out.println("Processing record " + recordId + " for $" + amount);
    }

    public static void main(String[] args) {
        try {
            processRecord("", -50);
        } catch (IllegalArgumentException e) {
            System.err.println("Caught unchecked: " + e.getMessage());
        } catch (IOException | SQLException e) {
            System.err.println("Caught checked: " + e.getMessage());
        }
    }
}
```

---

## 27. How do try, catch and finally work?

### The Mechanics of the Exception Lifecycle

1. **`try` block:** Encloses code that might encounter exceptional conditions. If an exception occurs, the remaining statements in the `try` block are aborted immediately.
2. **`catch` block:** Intercepts and handles exceptions matching its declared parameter type. Multiple catch blocks are evaluated sequentially from most specific subclass to broader superclass.
3. **`finally` block:** Guaranteed cleanup block that executes upon exiting the `try` and `catch` blocks, regardless of whether an exception occurred, was caught, or was left unhandled.

### Key Rules and Nuances

* **Order of Catch Blocks:** Subclasses must be listed before superclasses. Putting `catch (Exception e)` before `catch (IOException e)` results in a compile-time error (`unreachable catch block`).
* **Multi-Catch (Java 7+):** Catch multiple unrelated exceptions in a single block using the pipe syntax: `catch (IOException | SQLException e)`. In multi-catch blocks, the parameter `e` is implicitly `final`.
* **Try-with-Resources (Java 7+):** Any object implementing `java.lang.AutoCloseable` or `java.io.Closeable` can be instantiated inside `try(...)`. Resources are automatically closed in reverse order of declaration, even if exceptions are thrown. This replaces manual resource closing in `finally`.

### Code Comparison: Classic Finally vs. Try-With-Resources

```java
import java.io.*;

public class TryCatchFinallyDemo {

    // --- 1. Classic Approach (Verbose, error-prone manual closing) ---
    public static String readFirstLineLegacy(String path) {
        BufferedReader reader = null;
        try {
            reader = new BufferedReader(new FileReader(path));
            return reader.readLine();
        } catch (FileNotFoundException e) {
            System.err.println("File not found: " + e.getMessage());
            return "";
        } catch (IOException e) {
            System.err.println("Read error: " + e.getMessage());
            return "";
        } finally {
            // finally block handles manual closing
            if (reader != null) {
                try {
                    reader.close(); // Can itself throw IOException!
                } catch (IOException ignored) {}
            }
        }
    }

    // --- 2. Modern Try-With-Resources (Clean, deterministic, suppresses secondary errors) ---
    public static String readFirstLineModern(String path) {
        // Automatically calls reader.close() upon exiting the block
        try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
            return reader.readLine();
        } catch (IOException e) {
            System.err.println("Failed to read file: " + e.getMessage());
            return "";
        }
    }
}
```

---

## 28. How do you create a custom exception?

### Why Create Custom Exceptions?

Custom exceptions provide:
1. **Domain-Specific Meaning:** Distinguishes business logic errors (e.g., `InsufficientBalanceException`) from technical Java errors.
2. **Custom Metadata:** Allows attaching domain fields (such as `errorCode`, `userId`, `timestamp`) to the exception object.
3. **Targeted Exception Handling:** Enables callers to catch domain-specific errors cleanly without catching broad, generic exceptions.

### Choosing Between Checked and Unchecked

* Extend **`Exception`** for **Checked Custom Exceptions**: When the caller can reasonably be expected to recover programmatically.
* Extend **`RuntimeException`** for **Unchecked Custom Exceptions** (Recommended in modern development): When the failure is due to invalid arguments, business rule violations, or unrecoverable client errors.

### Best Practice Constructor Pattern

Always implement the four standard `Throwable` constructors and include custom error context fields:

```java
// 1. Define the Custom Business Exception
class InsufficientFundsException extends RuntimeException {
    private final String accountNumber;
    private final double requestedAmount;
    private final double availableBalance;

    public InsufficientFundsException(String accountNumber, double requested, double available) {
        super(String.format("Account [%s] has insufficient funds. Requested: $%.2f, Available: $%.2f",
            accountNumber, requested, available));
        this.accountNumber = accountNumber;
        this.requestedAmount = requested;
        this.availableBalance = available;
    }

    // Constructor supporting exception chaining
    public InsufficientFundsException(String message, Throwable cause) {
        super(message, cause);
        this.accountNumber = "UNKNOWN";
        this.requestedAmount = 0;
        this.availableBalance = 0;
    }

    public String getAccountNumber() { return accountNumber; }
    public double getRequestedAmount() { return requestedAmount; }
    public double getAvailableBalance() { return availableBalance; }
}

// 2. Business Service using the Custom Exception
class BankService {
    private double balance = 150.0;

    public void withdraw(String accountId, double amount) {
        if (amount > balance) {
            throw new InsufficientFundsException(accountId, amount, balance);
        }
        balance -= amount;
        System.out.println("Withdrawal successful. Remaining balance: $" + balance);
    }
}

// 3. Client Catching Custom Exception
public class CustomExceptionDemo {
    public static void main(String[] args) {
        BankService service = new BankService();

        try {
            service.withdraw("ACC_98765", 250.0);
        } catch (InsufficientFundsException ex) {
            System.err.println("Transaction Rejected: " + ex.getMessage());
            System.err.printf("Shortage: $%.2f on Account %s%n", 
                (ex.getRequestedAmount() - ex.getAvailableBalance()), ex.getAccountNumber());
        }
    }
}
```
