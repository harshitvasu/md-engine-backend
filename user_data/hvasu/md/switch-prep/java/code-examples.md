# 20 Essential Java Practical Coding Interview Examples

A practical guide covering real-world implementations of Core Java patterns, Stream API pipelines, Collections manipulations, Exception handling, and Concurrency paradigms.

---

## 1. Implement a Singleton class (thread-safe).

### The Problem

A **Singleton** guarantees that a class has only one instance and provides a global point of access to it. In multi-threaded environments, naive lazy initialization suffers from race conditions where multiple threads can simultaneously instantiate duplicate objects.

### Approaches

There are two industry-standard, production-grade ways to implement a thread-safe Singleton in modern Java:
1. **Bill Pugh Singleton (Initialization-on-Demand Holder Idiom):** Uses the JVM ClassLoader mechanism to achieve lazy initialization with zero synchronization overhead.
2. **Enum Singleton (Joshua Bloch's Recommendation):** Provides 100% protection against reflection attacks, serialization tampering, and multi-threaded race conditions out of the box.

### Implementation

```java
// ========================================================
// Approach 1: Bill Pugh Singleton (Lazy + Zero Locking)
// ========================================================
public class DatabaseConnectionPool {

    // Private constructor prevents external instantiation
    private DatabaseConnectionPool() {
        // Guard against reflection instantiation
        if (Holder.INSTANCE != null) {
            throw new IllegalStateException("Singleton already initialized!");
        }
        System.out.println("Initializing Database Connection Pool...");
    }

    // Static nested class is NOT loaded into memory until getInstance() is called
    private static class Holder {
        private static final DatabaseConnectionPool INSTANCE = new DatabaseConnectionPool();
    }

    // Thread-safe without requiring 'synchronized' keywords
    public static DatabaseConnectionPool getInstance() {
        return Holder.INSTANCE;
    }

    public void executeQuery(String sql) {
        System.out.println("Executing SQL: " + sql);
    }
}

// ========================================================
// Approach 2: Enum Singleton (Effective Java Item 3)
// ========================================================
enum ConfigurationManager {
    INSTANCE; // JVM guarantees exactly one instance, handled during enum initialization

    private String environment = "PRODUCTION";

    public String getEnvironment() {
        return environment;
    }

    public void setEnvironment(String environment) {
        this.environment = environment;
    }

    public void loadConfig() {
        System.out.println("Configurations loaded for: " + environment);
    }
}

// Driver / Verification Code
public class SingletonDemo {
    public static void main(String[] args) {
        // Testing Bill Pugh Singleton
        DatabaseConnectionPool pool1 = DatabaseConnectionPool.getInstance();
        DatabaseConnectionPool pool2 = DatabaseConnectionPool.getInstance();
        System.out.println("Bill Pugh Same Instance? " + (pool1 == pool2)); // true

        // Testing Enum Singleton
        ConfigurationManager config1 = ConfigurationManager.INSTANCE;
        ConfigurationManager config2 = ConfigurationManager.INSTANCE;
        System.out.println("Enum Same Instance? " + (config1 == config2));   // true
    }
}
```

---

## 2. Create an immutable class.

### The Five Rules of Immutability

To guarantee that an object's state cannot be altered after construction:
1. Declare the class **`final`** so it cannot be subclassed or overridden.
2. Make all fields **`private final`**.
3. **Do not provide setters** or any mutator methods.
4. Perform **defensive copying in the constructor** for any mutable input parameters (e.g., `Date`, arrays, `List`, `Map`).
5. Perform **defensive copying in getters** so external callers cannot mutate internal references (or return unmodifiable views).

### Implementation

```java
import java.util.*;

public final class ImmutableUserProfile {

    // Immutable primitive / wrapper / String fields
    private final String userId;
    private final String username;

    // Mutable fields requiring defensive copying
    private final Date registrationDate;
    private final List<String> permissions;

    public ImmutableUserProfile(String userId, String username, Date registrationDate, List<String> permissions) {
        this.userId = Objects.requireNonNull(userId, "userId must not be null");
        this.username = Objects.requireNonNull(username, "username must not be null");

        // Rule 4: Defensive copy of mutable Date parameter
        if (registrationDate != null) {
            this.registrationDate = new Date(registrationDate.getTime());
        } else {
            this.registrationDate = new Date();
        }

        // Rule 4: Defensive copy of mutable List parameter
        if (permissions != null) {
            this.permissions = new ArrayList<>(permissions);
        } else {
            this.permissions = new ArrayList<>();
        }
    }

    public String getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    // Rule 5: Defensive copy in getter returns a new Date instance
    public Date getRegistrationDate() {
        return new Date(this.registrationDate.getTime());
    }

    // Rule 5: Return an unmodifiable view or a cloned list
    public List<String> getPermissions() {
        return Collections.unmodifiableList(this.permissions);
    }

    @Override
    public String toString() {
        return "ImmutableUserProfile{" +
                "userId='" + userId + '\'' +
                ", username='" + username + '\'' +
                ", registrationDate=" + registrationDate +
                ", permissions=" + permissions +
                '}';
    }
}

// Verification of Defensive Copying
class ImmutableDemo {
    public static void main(String[] args) {
        Date regDate = new Date();
        List<String> perms = new ArrayList<>(List.of("READ", "WRITE"));

        ImmutableUserProfile profile = new ImmutableUserProfile("USR_101", "hvasu", regDate, perms);

        // Attempt 1: Mutating external date after passing to constructor
        regDate.setTime(0L); // Jan 1, 1970
        System.out.println("Profile Date affected by external param change? " + 
            (profile.getRegistrationDate().getTime() == 0L)); // false

        // Attempt 2: Mutating date returned by getter
        profile.getRegistrationDate().setTime(0L);
        System.out.println("Profile Date affected by getter mutation? " + 
            (profile.getRegistrationDate().getTime() == 0L)); // false

        // Attempt 3: Mutating returned list
        try {
            profile.getPermissions().add("DELETE_DATABASE");
        } catch (UnsupportedOperationException e) {
            System.out.println("Permissions list cannot be mutated: Protected!"); // Caught!
        }
    }
}
```

---

## 3. Override equals() and hashCode() for a custom Employee class.

### The Contract

1. **Reflexive:** `x.equals(x)` must return `true`.
2. **Symmetric:** `x.equals(y)` must return `true` if and only if `y.equals(x)` returns `true`.
3. **Transitive:** If `x.equals(y)` is true and `y.equals(z)` is true, then `x.equals(z)` must be true.
4. **Consistent:** Repeated calls return identical results as long as compared fields remain unchanged.
5. **Non-nullity:** `x.equals(null)` must return `false`.
6. **`hashCode` Constraint:** If `a.equals(b)` is `true`, then `a.hashCode() == b.hashCode()` **MUST be true**.

### Implementation

```java
import java.util.*;

public class Employee {
    private final int id;
    private final String name;
    private final String department;
    private final double salary;

    public Employee(int id, String name, String department, double salary) {
        this.id = id;
        this.name = name;
        this.department = department;
        this.salary = salary;
    }

    public int getId() { return id; }
    public String getName() { return name; }
    public String getDepartment() { return department; }
    public double getSalary() { return salary; }

    @Override
    public boolean equals(Object o) {
        // 1. Same memory reference optimization
        if (this == o) return true;

        // 2. Null check and strict class identity comparison
        // (Using getClass() prevents broken symmetry when inheritance is involved)
        if (o == null || getClass() != o.getClass()) return false;

        // 3. Type cast
        Employee employee = (Employee) o;

        // 4. Compare all significant business identity fields
        return id == employee.id &&
               Double.compare(employee.salary, salary) == 0 &&
               Objects.equals(name, employee.name) &&
               Objects.equals(department, employee.department);
    }

    @Override
    public int hashCode() {
        // Objects.hash handles null-safety and prime multiplier chaining internally
        return Objects.hash(id, name, department, salary);
    }

    @Override
    public String toString() {
        return String.format("Employee[id=%d, name='%s', dept='%s', salary=%.2f]",
                id, name, department, salary);
    }
}

// Verification in Collections
class EqualsHashCodeDemo {
    public static void main(String[] args) {
        Employee emp1 = new Employee(101, "Alice", "IT", 95000);
        Employee emp2 = new Employee(101, "Alice", "IT", 95000);

        System.out.println("equals: " + emp1.equals(emp2)); // true
        System.out.println("hashCode match: " + (emp1.hashCode() == emp2.hashCode())); // true

        // Testing in a HashSet (guarantees deduplication)
        Set<Employee> employees = new HashSet<>();
        employees.add(emp1);
        employees.add(emp2);
        System.out.println("Set size (should be 1): " + employees.size()); // 1

        // Testing in a HashMap
        Map<Employee, String> map = new HashMap<>();
        map.put(emp1, "Senior Engineer");
        System.out.println("Retrieved via identical key: " + map.get(emp2)); // "Senior Engineer"
    }
}
```

---

## 4. Sort a list of custom objects using Comparator.

### Key Capabilities Demonstrated

* Sorting by single field using `Comparator.comparing()`.
* Sorting in descending order using `.reversed()`.
* Chained multi-level sorting using `.thenComparing()`.
* Safe sorting with `null` values using `Comparator.nullsLast()`.

### Implementation

```java
import java.util.*;

public class ComparatorSortingDemo {

    static class Developer {
        private final String name;
        private final int experienceYears;
        private final double salary;

        public Developer(String name, int experienceYears, double salary) {
            this.name = name;
            this.experienceYears = experienceYears;
            this.salary = salary;
        }

        public String getName() { return name; }
        public int getExperienceYears() { return experienceYears; }
        public double getSalary() { return salary; }

        @Override
        public String toString() {
            return String.format("%s (%d yrs, $%.0f)", name, experienceYears, salary);
        }
    }

    public static void main(String[] args) {
        List<Developer> devs = new ArrayList<>(List.of(
            new Developer("Bob", 5, 110_000),
            new Developer("Alice", 8, 140_000),
            new Developer("Charlie", 5, 125_000),
            new Developer("Diana", 3, 90_000),
            new Developer("Evan", 8, 135_000)
        ));

        // 1. Single Field: Sort by Experience Ascending
        devs.sort(Comparator.comparingInt(Developer::getExperienceYears));
        System.out.println("Sorted by Experience (Asc): " + devs);

        // 2. Reverse Field: Sort by Salary Descending
        devs.sort(Comparator.comparingDouble(Developer::getSalary).reversed());
        System.out.println("Sorted by Salary (Desc): " + devs);

        // 3. Multi-level Chained Sort:
        // Primary: Experience Years Descending
        // Secondary (Tie-breaker): Salary Descending
        // Tertiary (Tie-breaker): Name Alphabetically
        Comparator<Developer> multiComparator = Comparator
            .comparingInt(Developer::getExperienceYears).reversed()
            .thenComparing(Comparator.comparingDouble(Developer::getSalary).reversed())
            .thenComparing(Developer::getName);

        devs.sort(multiComparator);
        System.out.println("\nChained Multi-Level Sort Result:");
        devs.forEach(dev -> System.out.println("  " + dev));

        // 4. Null-Safe Comparator
        List<String> tags = new ArrayList<>(Arrays.asList("Java", null, "Spring", null, "Docker"));
        tags.sort(Comparator.nullsLast(Comparator.naturalOrder()));
        System.out.println("\nNulls-Last Sorted: " + tags); // [Docker, Java, Spring, null, null]
    }
}
```

---

## 5. Remove duplicates from an ArrayList while preserving insertion order.

### Why Insertion Order Matters

A standard `new HashSet<>(list)` removes duplicates in $O(N)$ time, but **completely destroys insertion order** because standard hash table buckets distribute items based on hash codes.

To preserve insertion order, we have two primary approaches:
1. **`LinkedHashSet` Constructor:** Best practice, fast, concise $O(N)$ time complexity.
2. **Stream API `.distinct()`:** Declarative, preserves order for sequential streams.

### Implementation

```java
import java.util.*;
import java.util.stream.Collectors;

public class PreserveOrderDeduplicationDemo {

    // Approach 1: Using LinkedHashSet (Recommended - Fastest and most idiomatic)
    public static <T> List<T> removeDuplicatesLinkedHashSet(List<T> list) {
        if (list == null || list.isEmpty()) return new ArrayList<>();
        return new ArrayList<>(new LinkedHashSet<>(list));
    }

    // Approach 2: Using Java 8 Streams
    public static <T> List<T> removeDuplicatesStream(List<T> list) {
        if (list == null || list.isEmpty()) return new ArrayList<>();
        return list.stream()
                   .distinct() // Internally tracks observed items using LinkedHashSet
                   .collect(Collectors.toList());
    }

    public static void main(String[] args) {
        List<String> rawCities = List.of(
            "New York", "London", "Tokyo", "London", "Paris", "New York", "Berlin", "Tokyo"
        );

        System.out.println("Original with Duplicates: " + rawCities);

        // 1. LinkedHashSet Approach
        List<String> deduplicated1 = removeDuplicatesLinkedHashSet(rawCities);
        System.out.println("Deduplicated (LinkedHashSet): " + deduplicated1);
        // Output: [New York, London, Tokyo, Paris, Berlin] (Preserved initial order!)

        // 2. Stream API Approach
        List<String> deduplicated2 = removeDuplicatesStream(rawCities);
        System.out.println("Deduplicated (Stream distinct): " + deduplicated2);

        // Verify Standard HashSet Loses Order
        Set<String> unorderedSet = new HashSet<>(rawCities);
        System.out.println("Standard HashSet (Order Lost): " + unorderedSet);
    }
}
```

---

## 6. Sort a HashMap by values.

### The Challenge

A `HashMap` orders entries based on the hash codes of its **keys**. To sort entries based on their **values**, we must:
1. Extract the `Map.Entry` set.
2. Sort the entries by value using `Map.Entry.comparingByValue()`.
3. Collect the sorted entries into a **`LinkedHashMap`**, which preserves the sorted insertion order during iteration.

### Implementation

```java
import java.util.*;
import java.util.stream.Collectors;

public class SortMapByValueDemo {

    // Approach 1: Modern Stream API Pipeline (Cleanest)
    public static <K, V extends Comparable<? super V>> Map<K, V> sortByValueAscending(Map<K, V> map) {
        return map.entrySet()
                  .stream()
                  .sorted(Map.Entry.comparingByValue())
                  .collect(Collectors.toMap(
                      Map.Entry::getKey,
                      Map.Entry::getValue,
                      (oldVal, newVal) -> oldVal, // Merge rule for collisions
                      LinkedHashMap::new           // Collects into LinkedHashMap to preserve order
                  ));
    }

    public static <K, V extends Comparable<? super V>> Map<K, V> sortByValueDescending(Map<K, V> map) {
        return map.entrySet()
                  .stream()
                  .sorted(Map.Entry.<K, V>comparingByValue().reversed())
                  .collect(Collectors.toMap(
                      Map.Entry::getKey,
                      Map.Entry::getValue,
                      (oldVal, newVal) -> oldVal,
                      LinkedHashMap::new
                  ));
    }

    public static void main(String[] args) {
        Map<String, Integer> scoreCard = new HashMap<>();
        scoreCard.put("Alice", 88);
        scoreCard.put("Bob", 72);
        scoreCard.put("Charlie", 95);
        scoreCard.put("Diana", 91);
        scoreCard.put("Evan", 84);

        System.out.println("Unsorted HashMap: " + scoreCard);

        // Sort Ascending
        Map<String, Integer> sortedAsc = sortByValueAscending(scoreCard);
        System.out.println("Sorted by Value (Ascending):  " + sortedAsc);
        // Output: {Bob=72, Evan=84, Alice=88, Diana=91, Charlie=95}

        // Sort Descending
        Map<String, Integer> sortedDesc = sortByValueDescending(scoreCard);
        System.out.println("Sorted by Value (Descending): " + sortedDesc);
        // Output: {Charlie=95, Diana=91, Alice=88, Evan=84, Bob=72}
    }
}
```

---

## 7. Demonstrate how HashMap works with custom objects as keys.

### Critical Concepts

When using custom objects as keys in a `HashMap`:
1. The class **must override both `equals()` and `hashCode()`** consistently.
2. The key object **should be immutable**. If a field used in `hashCode()` is mutated after the key is inserted, its hash code changes, making the value impossible to retrieve (**lost key bug**).

### Implementation

```java
import java.util.*;

public class CustomHashMapKeyDemo {

    // Immutable Key Class
    static final class AccountKey {
        private final String branchCode;
        private final long accountNumber;

        public AccountKey(String branchCode, long accountNumber) {
            this.branchCode = Objects.requireNonNull(branchCode);
            this.accountNumber = accountNumber;
        }

        public String getBranchCode() { return branchCode; }
        public long getAccountNumber() { return accountNumber; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            AccountKey that = (AccountKey) o;
            return accountNumber == that.accountNumber &&
                   branchCode.equals(that.branchCode);
        }

        @Override
        public int hashCode() {
            return Objects.hash(branchCode, accountNumber);
        }

        @Override
        public String toString() {
            return branchCode + "-" + accountNumber;
        }
    }

    // Mutable Key Class (Demonstrates the Disaster Anti-Pattern)
    static class MutableKey {
        int id;
        public MutableKey(int id) { this.id = id; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            return id == ((MutableKey) o).id;
        }

        @Override
        public int hashCode() { return Objects.hash(id); }
    }

    public static void main(String[] args) {
        // --- 1. Proper Immutable Key Usage ---
        Map<AccountKey, Double> accounts = new HashMap<>();
        AccountKey key1 = new AccountKey("NYC", 10001L);
        accounts.put(key1, 45000.50);

        // Retrieve using a NEW key instance with IDENTICAL fields
        AccountKey lookupKey = new AccountKey("NYC", 10001L);
        Double balance = accounts.get(lookupKey);
        System.out.println("Proper Lookup Result: $" + balance); // $45000.50 (Success!)

        // --- 2. The Mutable Key Disaster (Anti-Pattern) ---
        Map<MutableKey, String> dangerousMap = new HashMap<>();
        MutableKey mKey = new MutableKey(555);
        dangerousMap.put(mKey, "Secret Database Password");

        System.out.println("Before mutation: " + dangerousMap.get(mKey)); // Found!

        // Mutating key field AFTER insertion
        mKey.id = 999; 

        // Attempt retrieval:
        System.out.println("After mutation:  " + dangerousMap.get(mKey)); // null! (LOST ENTRY!)
        System.out.println("Contains key?    " + dangerousMap.containsKey(mKey)); // false!
        System.out.println("Map size:        " + dangerousMap.size()); // 1 (Object still leaks in heap!)
    }
}
```

---

## 8. Find the second-highest salary using Java Streams.

### Key Considerations

1. **Handling Duplicate Salaries:** If multiple employees share the top salary (e.g., $150k, $150k, $120k), the second-highest distinct salary is $120k. Calling `.distinct()` is mandatory.
2. **Handling Sparse Datasets:** If the list has fewer than 2 distinct salaries, the operation must safely return an empty `Optional<Double>` instead of throwing an `IndexOutOfBoundsException`.

### Implementation

```java
import java.util.*;

public class SecondHighestSalaryDemo {

    static class Worker {
        private final String name;
        private final double salary;

        public Worker(String name, double salary) {
            this.name = name;
            this.salary = salary;
        }

        public String getName() { return name; }
        public double getSalary() { return salary; }
    }

    // Approach 1: Extracting the second-highest salary value
    public static Optional<Double> findSecondHighestSalaryValue(List<Worker> workers) {
        return workers.stream()
            .map(Worker::getSalary)                     // Extract salaries: Stream<Double>
            .distinct()                                 // Eliminate duplicates
            .sorted(Comparator.reverseOrder())          // Sort descending
            .skip(1)                                    // Skip highest (index 0)
            .findFirst();                               // Take second
    }

    // Approach 2: Extracting the full Worker object with the second-highest salary
    public static Optional<Worker> findWorkerWithSecondHighestSalary(List<Worker> workers) {
        return findSecondHighestSalaryValue(workers)
            .flatMap(secondSalary -> workers.stream()
                .filter(w -> Double.compare(w.getSalary(), secondSalary) == 0)
                .findFirst());
    }

    public static void main(String[] args) {
        List<Worker> team = List.of(
            new Worker("Alice", 150_000),
            new Worker("Bob", 150_000),      // Duplicate highest!
            new Worker("Charlie", 120_000),  // Correct 2nd highest
            new Worker("Diana", 110_000),
            new Worker("Evan", 95_000)
        );

        Optional<Double> secondSalary = findSecondHighestSalaryValue(team);
        secondSalary.ifPresentOrElse(
            sal -> System.out.printf("Second Highest Salary: $%,.2f%n", sal),
            () -> System.out.println("Insufficient salary records.")
        );

        Optional<Worker> secondWorker = findWorkerWithSecondHighestSalary(team);
        secondWorker.ifPresent(w -> 
            System.out.printf("Worker with Second Highest Salary: %s ($%,.2f)%n", 
                w.getName(), w.getSalary())
        );

        // Edge Case: List with only 1 distinct salary
        List<Worker> singleSalaryTeam = List.of(
            new Worker("John", 80_000),
            new Worker("Jane", 80_000)
        );
        System.out.println("Single salary team second highest present? " + 
            findSecondHighestSalaryValue(singleSalaryTeam).isPresent()); // false
    }
}
```

---

## 9. Group employees by department using Collectors.groupingBy().

### Advanced Downstream Collectors

`Collectors.groupingBy()` is a versatile aggregator in Java 8. It can be used for:
1. **Simple Grouping:** Grouping items into lists (`Map<String, List<Employee>>`).
2. **Counting:** Counting items per group (`Collectors.counting()`).
3. **Averaging:** Computing average numeric values per group (`Collectors.averagingDouble()`).
4. **Mapping:** Extracting specific fields per group (`Collectors.mapping()`).

### Implementation

```java
import java.util.*;
import java.util.stream.Collectors;

public class GroupingByDemo {

    record Staff(String name, String department, double salary) {}

    public static void main(String[] args) {
        List<Staff> staffList = List.of(
            new Staff("Alice", "Engineering", 130_000),
            new Staff("Bob", "Marketing", 80_000),
            new Staff("Charlie", "Engineering", 150_000),
            new Staff("Diana", "Sales", 95_000),
            new Staff("Evan", "Engineering", 110_000),
            new Staff("Fiona", "Marketing", 90_000),
            new Staff("George", "Sales", 105_000)
        );

        // --- 1. Basic Grouping: Map<Department, List<Staff>> ---
        Map<String, List<Staff>> byDept = staffList.stream()
            .collect(Collectors.groupingBy(Staff::department));

        System.out.println("=== 1. Staff Grouped by Department ===");
        byDept.forEach((dept, staff) -> {
            System.out.printf("%s (%d members):%n", dept, staff.size());
            staff.forEach(s -> System.out.println("  - " + s.name()));
        });

        // --- 2. Downstream Collector: Count per Department ---
        Map<String, Long> countPerDept = staffList.stream()
            .collect(Collectors.groupingBy(Staff::department, Collectors.counting()));
        System.out.println("\n=== 2. Staff Count per Department ===");
        System.out.println(countPerDept);

        // --- 3. Downstream Collector: Average Salary per Department ---
        Map<String, Double> avgSalaryPerDept = staffList.stream()
            .collect(Collectors.groupingBy(
                Staff::department,
                Collectors.averagingDouble(Staff::salary)
            ));
        System.out.println("\n=== 3. Average Salary per Department ===");
        avgSalaryPerDept.forEach((dept, avg) -> System.out.printf("  %s: $%,.2f%n", dept, avg));

        // --- 4. Downstream Collector: List of Names only per Department ---
        Map<String, List<String>> namesByDept = staffList.stream()
            .collect(Collectors.groupingBy(
                Staff::department,
                Collectors.mapping(Staff::name, Collectors.toList())
            ));
        System.out.println("\n=== 4. Names Only per Department ===");
        System.out.println(namesByDept);
    }
}
```

---

## 10. Find the highest-paid employee in each department using Streams.

### The Strategy

To locate the highest-paid employee per department:
1. Group employees by department: `Collectors.groupingBy(Employee::department, ...)`.
2. Apply the downstream collector: `Collectors.maxBy(Comparator.comparingDouble(Employee::salary))`.
3. To avoid unwieldy `Map<String, Optional<Employee>>` types, wrap with `Collectors.collectingAndThen(Collectors.maxBy(...), Optional::get)`.

### Implementation

```java
import java.util.*;
import java.util.stream.Collectors;

public class HighestPaidPerDeptDemo {

    record EmployeeRecord(String name, String department, double salary) {}

    public static void main(String[] args) {
        List<EmployeeRecord> employees = List.of(
            new EmployeeRecord("Alice", "Engineering", 130_000),
            new EmployeeRecord("Bob", "Marketing", 85_000),
            new EmployeeRecord("Charlie", "Engineering", 160_000), // Highest in Engineering
            new EmployeeRecord("Diana", "Sales", 90_000),
            new EmployeeRecord("Evan", "Engineering", 110_000),
            new EmployeeRecord("Fiona", "Marketing", 105_000),    // Highest in Marketing
            new EmployeeRecord("George", "Sales", 125_000)        // Highest in Sales
        );

        // Approach 1: Returns Map<String, Optional<EmployeeRecord>>
        Map<String, Optional<EmployeeRecord>> maxSalaryOptionalMap = employees.stream()
            .collect(Collectors.groupingBy(
                EmployeeRecord::department,
                Collectors.maxBy(Comparator.comparingDouble(EmployeeRecord::salary))
            ));

        System.out.println("=== Approach 1: Map with Optional Values ===");
        maxSalaryOptionalMap.forEach((dept, optEmp) -> 
            optEmp.ifPresent(emp -> System.out.printf("  %s: %s ($%,.2f)%n", dept, emp.name(), emp.salary()))
        );

        // Approach 2: Returns clean Map<String, EmployeeRecord> (Unwraps Optional immediately)
        Map<String, EmployeeRecord> topEarners = employees.stream()
            .collect(Collectors.groupingBy(
                EmployeeRecord::department,
                Collectors.collectingAndThen(
                    Collectors.maxBy(Comparator.comparingDouble(EmployeeRecord::salary)),
                    Optional::get // Safe because groupingBy only groups non-empty buckets
                )
            ));

        System.out.println("\n=== Approach 2: Clean Map<String, EmployeeRecord> ===");
        topEarners.forEach((dept, emp) -> 
            System.out.printf("  Dept: %-12s | Top Earner: %-8s | Salary: $%,.2f%n", 
                dept, emp.name(), emp.salary())
        );
    }
}
```

---

## 11. Filter, map and collect objects using Streams.

### Real-World Business Scenario

Process a stream of transaction records:
1. **Filter:** Select only completed transactions with amounts $> \$100.00$.
2. **Map:** Extract the customer email and normalize it to lowercase.
3. **Collect:** Collect distinct emails into a sorted `List` and format a summary string using `Collectors.joining()`.

### Implementation

```java
import java.util.*;
import java.util.stream.Collectors;

public class FilterMapCollectDemo {

    enum Status { PENDING, COMPLETED, FAILED }

    record Transaction(String transactionId, String customerEmail, double amount, Status status) {}

    public static void main(String[] args) {
        List<Transaction> transactions = List.of(
            new Transaction("TXN_01", "ALICE@EXAMPLE.COM", 250.00, Status.COMPLETED),
            new Transaction("TXN_02", "bob@domain.org", 50.00, Status.COMPLETED),   // Under $100
            new Transaction("TXN_03", "Charlie@Test.com", 800.00, Status.FAILED),   // Failed
            new Transaction("TXN_04", "alice@example.com", 320.00, Status.COMPLETED),// Duplicate email
            new Transaction("TXN_05", "diana@company.io", 1200.00, Status.COMPLETED)
        );

        // Stream Pipeline: Filter -> Map -> Distinct -> Sort -> Collect
        List<String> premiumCustomerEmails = transactions.stream()
            // 1. FILTER: Only COMPLETED transactions exceeding $100
            .filter(t -> t.status() == Status.COMPLETED)
            .filter(t -> t.amount() > 100.00)

            // 2. MAP: Extract email and normalize to lowercase
            .map(t -> t.customerEmail().toLowerCase())

            // 3. INTERMEDIATE: Eliminate duplicates and sort alphabetically
            .distinct()
            .sorted()

            // 4. COLLECT: Accumulate into an unmodifiable List
            .collect(Collectors.toUnmodifiableList());

        System.out.println("Premium Customer Emails (List): " + premiumCustomerEmails);
        // Output: [alice@example.com, diana@company.io]

        // 5. COLLECT to Comma-Separated Summary String:
        String emailDigest = transactions.stream()
            .filter(t -> t.status() == Status.COMPLETED && t.amount() > 100.00)
            .map(t -> t.customerEmail().toLowerCase())
            .distinct()
            .collect(Collectors.joining("; ", "Targeted Recipients: [", "]"));

        System.out.println("Email Digest: " + emailDigest);
        // Output: Targeted Recipients: [alice@example.com; diana@company.io]
    }
}
```

---

## 12. Demonstrate map() vs flatMap() with code.

### The Contrast

* **`map(Function<T, R>)`:** $1 \to 1$ transformation. Replaces each element with a single transformed element.
* **`flatMap(Function<T, Stream<R>>)`:** $1 \to N$ transformation. Replaces each element with a `Stream` and flattens all generated streams into a single composite stream.

### Implementation

```java
import java.util.*;
import java.util.stream.Collectors;

public class MapVsFlatMapDeepDive {

    static class Order {
        private final String orderNumber;
        private final List<String> lineItems;

        public Order(String orderNumber, List<String> lineItems) {
            this.orderNumber = orderNumber;
            this.lineItems = lineItems;
        }

        public String getOrderNumber() { return orderNumber; }
        public List<String> getLineItems() { return lineItems; }
    }

    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("ORD_101", List.of("Laptop", "Mouse")),
            new Order("ORD_102", List.of("Monitor", "Keyboard")),
            new Order("ORD_103", List.of("Mouse", "Headphones", "Webcam"))
        );

        // ==========================================
        // 1. Demonstrating map() (1 to 1)
        // ==========================================
        // Input: Stream<Order> -> Output: Stream<List<String>> (Nested structure!)
        List<List<String>> nestedItems = orders.stream()
            .map(Order::getLineItems)
            .collect(Collectors.toList());

        System.out.println("map() Result (Nested Lists):");
        System.out.println("  " + nestedItems);
        // Output: [[Laptop, Mouse], [Monitor, Keyboard], [Mouse, Headphones, Webcam]]

        // ==========================================
        // 2. Demonstrating flatMap() (1 to N, Flattened)
        // ==========================================
        // Input: Stream<Order> -> Output: Stream<String> (Flattens all child lists into one!)
        List<String> allUniqueProducts = orders.stream()
            .flatMap(order -> order.getLineItems().stream()) // Unwraps and flattens each list
            .distinct()                                      // Removes duplicate "Mouse"
            .sorted()
            .collect(Collectors.toList());

        System.out.println("\nflatMap() Result (Flattened and Distinct):");
        System.out.println("  " + allUniqueProducts);
        // Output: [Headphones, Keyboard, Laptop, Monitor, Mouse, Webcam]

        // ==========================================
        // 3. String Tokenizer with flatMap()
        // ==========================================
        List<String> sentences = List.of(
            "Java Stream API",
            "Functional Programming with Lambdas",
            "Reactive Java Concurrency"
        );

        List<String> distinctWords = sentences.stream()
            .flatMap(sentence -> Arrays.stream(sentence.split("\\s+")))
            .map(String::toLowerCase)
            .distinct()
            .sorted()
            .collect(Collectors.toList());

        System.out.println("\nTokenized Words via flatMap(): " + distinctWords);
    }
}
```

---

## 13. Implement a custom checked and unchecked exception.

### Architectural Rules

* **Checked Exception (`extends Exception`):** For recoverable external conditions. Callers are forced by the compiler to catch or declare `throws`.
* **Unchecked Exception (`extends RuntimeException`):** For programmatic bugs, constraint violations, or business logic rejections.
* Always provide standard exception constructor chaining (`message`, `cause`) and add custom metadata fields (`errorCode`, `timestamp`).

### Implementation

```java
import java.time.Instant;

// ========================================================
// 1. Custom Checked Exception (Recoverable / External failure)
// ========================================================
class PaymentGatewayUnavailableException extends Exception {
    private final String gatewayName;
    private final int retryAfterSeconds;
    private final Instant timestamp;

    public PaymentGatewayUnavailableException(String gatewayName, int retryAfter, String message) {
        super(String.format("[%s] Gateway Failure: %s (Retry after %d seconds)", gatewayName, message, retryAfter));
        this.gatewayName = gatewayName;
        this.retryAfterSeconds = retryAfter;
        this.timestamp = Instant.now();
    }

    public PaymentGatewayUnavailableException(String gatewayName, int retryAfter, String message, Throwable cause) {
        super(String.format("[%s] Gateway Failure: %s", gatewayName, message), cause);
        this.gatewayName = gatewayName;
        this.retryAfterSeconds = retryAfter;
        this.timestamp = Instant.now();
    }

    public String getGatewayName() { return gatewayName; }
    public int getRetryAfterSeconds() { return retryAfterSeconds; }
    public Instant getTimestamp() { return timestamp; }
}

// ========================================================
// 2. Custom Unchecked Exception (Business invariant violation)
// ========================================================
class InsufficientAccountBalanceException extends RuntimeException {
    private final String accountNumber;
    private final double attemptedDebit;
    private final double currentBalance;

    public InsufficientAccountBalanceException(String accountNumber, double attemptedDebit, double currentBalance) {
        super(String.format("Account %s overdraft rejected! Attempted debit: $%.2f, Available: $%.2f",
                accountNumber, attemptedDebit, currentBalance));
        this.accountNumber = accountNumber;
        this.attemptedDebit = attemptedDebit;
        this.currentBalance = currentBalance;
    }

    public String getAccountNumber() { return accountNumber; }
    public double getAttemptedDebit() { return attemptedDebit; }
    public double getCurrentBalance() { return currentBalance; }
}

// ========================================================
// 3. Service Layer and Client Demonstration
// ========================================================
public class CustomExceptionsDemo {

    public static void executeTransfer(String account, double balance, double amount, boolean networkUp) 
            throws PaymentGatewayUnavailableException { // Checked must be declared!
        
        // Validation check throwing UNCHECKED exception
        if (amount > balance) {
            throw new InsufficientAccountBalanceException(account, amount, balance);
        }

        // External check throwing CHECKED exception
        if (!networkUp) {
            throw new PaymentGatewayUnavailableException("StripeNetwork", 30, "503 Service Unavailable");
        }

        System.out.printf("Successfully transferred $%.2f from account %s%n", amount, account);
    }

    public static void main(String[] args) {
        // Test 1: Handling Unchecked Exception
        try {
            executeTransfer("ACC_1001", 50.00, 200.00, true);
        } catch (InsufficientAccountBalanceException ex) {
            System.err.println("Unchecked Caught: " + ex.getMessage());
            System.err.printf("  Deficit: $%.2f%n", (ex.getAttemptedDebit() - ex.getCurrentBalance()));
        }

        // Test 2: Handling Checked Exception
        try {
            executeTransfer("ACC_1002", 500.00, 100.00, false);
        } catch (PaymentGatewayUnavailableException ex) {
            System.err.println("\nChecked Caught: " + ex.getMessage());
            System.err.printf("  Action: Hold queue and retry in %d seconds (Gateway: %s)%n",
                    ex.getRetryAfterSeconds(), ex.getGatewayName());
        }
    }
}
```

---

## 14. Implement a thread-safe counter using synchronized.

### Core Mechanics

A naive `count++` operation is not atomic; it consists of three separate bytecode instructions: `GETFIELD`, `IADD`, and `PUTFIELD`. If multiple threads interleave, increments are silently lost.

Using `synchronized` guarantees:
1. **Mutual Exclusion:** Only one thread modifies `count` at any given time.
2. **Memory Visibility:** Flushes the updated `count` directly to main memory, establishing a happens-before relationship for subsequent reads.

### Implementation

```java
import java.util.concurrent.*;

public class SynchronizedCounterDemo {

    static class ThreadSafeSynchronizedCounter {
        private int count = 0;
        private final Object lock = new Object(); // Explicit dedicated monitor object

        // 1. Synchronized instance method (locks on 'this')
        public synchronized void increment() {
            count++;
        }

        // 2. Synchronized block using dedicated lock object (Preferred for fine-grained locking)
        public void incrementWithLock() {
            synchronized (lock) {
                count++;
            }
        }

        // Synchronized read guarantees memory visibility (avoids stale CPU cache reads)
        public synchronized int getCount() {
            return count;
        }
    }

    public static void main(String[] args) throws InterruptedException {
        ThreadSafeSynchronizedCounter counter = new ThreadSafeSynchronizedCounter();
        int numberOfThreads = 10;
        int incrementsPerThread = 10_000;

        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch latch = new CountDownLatch(numberOfThreads);

        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < incrementsPerThread; j++) {
                        counter.increment();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await(); // Wait for all threads to finish
        executor.shutdown();

        System.out.println("Expected Count: " + (numberOfThreads * incrementsPerThread)); // 100,000
        System.out.println("Actual Count:   " + counter.getCount());                        // 100,000
    }
}
```

---

## 15. Implement a thread-safe counter using AtomicInteger.

### Why `AtomicInteger` is Superior for Counters

Unlike `synchronized`, which relies on operating system thread suspension, thread queueing, and context switching (blocking), `AtomicInteger` leverages **hardware-level atomic instructions** (Compare-And-Swap / CAS) provided by the host CPU.

* **Lock-Free Concurrency:** Threads execute in a non-blocking loop without acquiring locks.
* **Extreme Throughput:** Outperforms `synchronized` by 3x–10x under moderate-to-high multi-threaded contention.

### Implementation

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class AtomicCounterDemo {

    static class LockFreeAtomicCounter {
        // Backed by CPU CAS hardware primitives (e.g., LOCK CMPXCHG on x86)
        private final AtomicInteger count = new AtomicInteger(0);

        public void increment() {
            count.incrementAndGet(); // Equivalent to ++count atomically
        }

        public void add(int delta) {
            count.addAndGet(delta);
        }

        public int getCount() {
            return count.get();
        }

        // Custom CAS (Compare-And-Swap) Business Logic:
        // Updates count to newValue ONLY IF current value matches expectedValue
        public boolean updateIfMatches(int expected, int newValue) {
            return count.compareAndSet(expected, newValue);
        }
    }

    public static void main(String[] args) throws InterruptedException {
        LockFreeAtomicCounter atomicCounter = new LockFreeAtomicCounter();
        int threadCount = 20;
        int operationsPerThread = 50_000;

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);

        long startTime = System.currentTimeMillis();

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    for (int j = 0; j < operationsPerThread; j++) {
                        atomicCounter.increment();
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();
        executor.shutdown();
        long duration = System.currentTimeMillis() - startTime;

        System.out.println("Expected Final Count: " + (threadCount * operationsPerThread)); // 1,000,000
        System.out.println("Actual Final Count:   " + atomicCounter.getCount());             // 1,000,000
        System.out.printf("Processed 1M increments lock-free in %d ms%n", duration);

        // Demonstrating CAS directly
        boolean casSuccess = atomicCounter.updateIfMatches(1_000_000, 42);
        System.out.println("CAS updated to 42? " + casSuccess);
        System.out.println("New Value: " + atomicCounter.getCount()); // 42
    }
}
```

---

## 16. Implement producer-consumer using wait() and notifyAll().

### Core Design Rules

1. **Synchronized Context:** `wait()` and `notifyAll()` must be invoked from within a `synchronized` block on the shared lock object; otherwise, the JVM throws `IllegalMonitorStateException`.
2. **Lock Release:** Calling `wait()` immediately releases the monitor lock, allowing the other thread to proceed.
3. **Guard with `while` loop (Never `if`):** Guards against **Spurious Wakeups** (the thread resuming without an explicit signal) and race conditions where another thread drains the buffer first.
4. **Prefer `notifyAll()` over `notify()`:** `notify()` wakes up a single random thread, which can cause deadlocks if a producer signals another producer while consumers starve.

### Implementation

```java
import java.util.LinkedList;
import java.util.Queue;

public class ProducerConsumerWaitNotifyDemo {

    static class BoundedMessageQueue {
        private final Queue<String> queue = new LinkedList<>();
        private final int capacity;
        private final Object lock = new Object();

        public BoundedMessageQueue(int capacity) {
            this.capacity = capacity;
        }

        // Producer pushes message into the queue
        public void produce(String message) throws InterruptedException {
            synchronized (lock) {
                // ALWAYS guard wait() inside a while loop!
                while (queue.size() == capacity) {
                    System.out.println("[Producer] Buffer FULL. Waiting for consumer...");
                    lock.wait(); // Releases lock, enters object wait set
                }

                queue.add(message);
                System.out.println("[Producer] Pushed: " + message + " (Buffer size: " + queue.size() + ")");

                // Notify all waiting threads that an item has been added
                lock.notifyAll();
            }
        }

        // Consumer pulls message from the queue
        public String consume() throws InterruptedException {
            synchronized (lock) {
                // ALWAYS guard wait() inside a while loop!
                while (queue.isEmpty()) {
                    System.out.println("[Consumer] Buffer EMPTY. Waiting for producer...");
                    lock.wait(); // Releases lock, enters object wait set
                }

                String message = queue.poll();
                System.out.println("[Consumer] Consumed: " + message + " (Buffer size: " + queue.size() + ")");

                // Notify all waiting threads that space is available
                lock.notifyAll();
                return message;
            }
        }
    }

    public static void main(String[] args) {
        BoundedMessageQueue sharedQueue = new BoundedMessageQueue(2); // Capacity = 2

        // Producer Thread
        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 6; i++) {
                    sharedQueue.produce("Packet-" + i);
                    Thread.sleep(80); // Simulate network latency
                }
            } catch (InterruptedException ignored) {}
        }, "Producer-Thread");

        // Consumer Thread
        Thread consumer = new Thread(() -> {
            try {
                for (int i = 1; i <= 6; i++) {
                    sharedQueue.consume();
                    Thread.sleep(200); // Consumer processes slower than producer
                }
            } catch (InterruptedException ignored) {}
        }, "Consumer-Thread");

        consumer.start();
        producer.start();
    }
}
```

---

## 17. Execute multiple tasks using ExecutorService.

### Why Use `ExecutorService`?

Directly instantiating `new Thread()` in application code is an anti-pattern:
* Threads are expensive operating system resources (each allocates ~1MB stack space).
* Spawning unbounded threads causes `OutOfMemoryError: unable to create new native thread`.
* An `ExecutorService` decouples task submission from thread execution, reuses pooled worker threads, and provides controlled thread lifecycles and graceful shutdown semantics.

### Implementation

```java
import java.util.concurrent.*;

public class ExecutorServiceBatchDemo {

    public static void main(String[] args) {
        int corePoolSize = 3;
        ExecutorService executor = Executors.newFixedThreadPool(corePoolSize);

        System.out.println("Submitting 8 asynchronous tasks across 3 pooled worker threads...\n");

        for (int taskId = 1; taskId <= 8; taskId++) {
            final int id = taskId;
            executor.submit(() -> {
                String threadName = Thread.currentThread().getName();
                System.out.printf("[%s] Started task #%d%n", threadName, id);
                try {
                    // Simulate I/O or database computation
                    Thread.sleep(150);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                System.out.printf("[%s] Finished task #%d%n", threadName, id);
            });
        }

        // ========================================================
        // Standard Graceful Shutdown Protocol (Oracle Recommended)
        // ========================================================
        executor.shutdown(); // 1. Reject new submissions, allow running tasks to complete
        System.out.println("\nExecutor shutdown initiated. Waiting for tasks to complete...");

        try {
            // 2. Wait up to 5 seconds for existing tasks to terminate
            if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                System.err.println("Tasks took too long! Forcing shutdown now...");
                executor.shutdownNow(); // Cancel executing tasks via interrupt
            } else {
                System.out.println("All tasks completed cleanly. Pool closed.");
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
```

---

## 18. Implement Callable and Future.

### `Runnable` vs. `Callable<V>`

* **`Runnable`:** Has `void run()`. Cannot return any computational result and cannot throw checked exceptions.
* **`Callable<V>`:** Has `V call() throws Exception`. Returns a generic result of type `V` and can throw checked exceptions.
* **`Future<V>`:** Represents the pending result of an asynchronous operation. Provides `.get()` to block for completion, `.isDone()` to poll status, and `.cancel()` to abort execution.

### Implementation

```java
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

public class CallableFutureDemo {

    // Task calculating sum of numbers in a range asynchronously
    static class RangeSumTask implements Callable<Long> {
        private final long start;
        private final long end;

        public RangeSumTask(long start, long end) {
            this.start = start;
            this.end = end;
        }

        @Override
        public Long call() throws Exception {
            if (start > end) {
                throw new IllegalArgumentException("Start range cannot exceed end range!");
            }
            long sum = 0;
            for (long i = start; i <= end; i++) {
                sum += i;
            }
            Thread.sleep(100); // Simulate processing latency
            return sum;
        }
    }

    public static void main(String[] args) {
        ExecutorService executor = Executors.newFixedThreadPool(3);
        List<Future<Long>> futures = new ArrayList<>();

        // 1. Submit Callable tasks to ExecutorService
        futures.add(executor.submit(new RangeSumTask(1, 100_000)));
        futures.add(executor.submit(new RangeSumTask(100_001, 200_000)));
        futures.add(executor.submit(new RangeSumTask(200_001, 300_000)));

        long totalSum = 0;

        // 2. Retrieve results from Futures
        for (int i = 0; i < futures.size(); i++) {
            Future<Long> future = futures.get(i);
            try {
                // Blocks until the specific task finishes, with an optional safety timeout
                Long result = future.get(1, TimeUnit.SECONDS);
                System.out.printf("Task #%d finished with result: %,d%n", (i + 1), result);
                totalSum += result;
            } catch (InterruptedException e) {
                System.err.println("Thread was interrupted while waiting!");
                Thread.currentThread().interrupt();
            } catch (ExecutionException e) {
                // Unwraps any exception thrown inside Callable.call()
                System.err.println("Exception inside task: " + e.getCause().getMessage());
            } catch (TimeoutException e) {
                System.err.println("Task timed out! Cancelling task...");
                future.cancel(true); // Interrupt the running task
            }
        }

        System.out.printf("Combined Total Sum: %,d%n", totalSum);
        executor.shutdown();
    }
}
```

---

## 19. Demonstrate CompletableFuture for asynchronous execution.

### Asynchronous Pipelines in Java 8+

`CompletableFuture<T>` provides non-blocking, event-driven asynchronous programming. Unlike legacy `Future`, which blocks on `.get()`, `CompletableFuture` supports fluent functional chaining, error fallbacks, and composing multiple concurrent pipelines.

### Key API Methods Demonstrated

1. `supplyAsync()`: Starts an asynchronous supplier task on `ForkJoinPool.commonPool()`.
2. `thenApply()`: Synchronously transforms the result of the previous stage ($1 \to 1$).
3. `thenCompose()`: Chains dependent futures sequentially (avoids nested `CompletableFuture<CompletableFuture<T>>`).
4. `thenCombine()`: Runs two independent futures concurrently and combines their results when both complete.
5. `allOf()`: Waits for an arbitrary array of futures to finish simultaneously.
6. `exceptionally()`: Gracefully handles failures with fallback defaults.

### Implementation

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class CompletableFutureAsyncPipelineDemo {

    // Async Task 1: Fetch user profile from database
    static CompletableFuture<String> fetchUser(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            sleep(100);
            System.out.println("[DB] User profile fetched for: " + userId);
            return "User: Harshit Vasu (ID: " + userId + ")";
        });
    }

    // Async Task 2: Fetch account credit score from external API
    static CompletableFuture<Integer> fetchCreditScore(String userId) {
        return CompletableFuture.supplyAsync(() -> {
            sleep(150);
            System.out.println("[API] Credit score fetched for: " + userId);
            return 785;
        });
    }

    // Async Task 3: Calculate risk assessment based on score
    static CompletableFuture<String> calculateRisk(int creditScore) {
        return CompletableFuture.supplyAsync(() -> {
            sleep(50);
            return (creditScore >= 750) ? "LOW_RISK_APPROVED" : "HIGH_RISK_REVIEW";
        });
    }

    public static void main(String[] args) {
        System.out.println("Initiating Asynchronous Pipeline...\n");

        // 1. Combining Two Independent Futures Concurrently (thenCombine)
        CompletableFuture<String> creditCheckReport = fetchUser("USR_999")
            .thenCombine(fetchCreditScore("USR_999"), (user, score) -> {
                return String.format("%s | Credit Score: %d", user, score);
            });

        // 2. Chaining Dependent Futures (thenCompose)
        CompletableFuture<String> finalDecision = fetchCreditScore("USR_999")
            .thenCompose(score -> calculateRisk(score)) // Dependent on fetchCreditScore
            .thenApply(decision -> "Underwriting Result: [" + decision + "]")
            .exceptionally(ex -> "Fallback: Manual Review Required (Reason: " + ex.getMessage() + ")");

        // Wait for results non-blockingly or join at application boundary
        System.out.println("\nReport:   " + creditCheckReport.join());
        System.out.println("Decision: " + finalDecision.join());

        // 3. Parallel Fan-Out with CompletableFuture.allOf()
        CompletableFuture<Void> taskA = CompletableFuture.runAsync(() -> sleep(50));
        CompletableFuture<Void> taskB = CompletableFuture.runAsync(() -> sleep(80));
        CompletableFuture<Void> taskC = CompletableFuture.runAsync(() -> sleep(60));

        CompletableFuture<Void> allTasks = CompletableFuture.allOf(taskA, taskB, taskC);
        allTasks.thenRun(() -> System.out.println("\nAll parallel fan-out tasks completed!"));
        allTasks.join();
    }

    private static void sleep(long millis) {
        try { TimeUnit.MILLISECONDS.sleep(millis); } catch (InterruptedException ignored) {}
    }
}
```

---

## 20. Implement Singleton using double-checked locking.

### Why Double-Checked Locking is Challenging

In naive double-checked locking:
```java
// BROKEN WITHOUT volatile!
if (instance == null) {
    synchronized (Singleton.class) {
        if (instance == null) {
            instance = new Singleton(); // HAZARD!
        }
    }
}
```
In Java, `instance = new Singleton()` is **not an atomic instruction**. The JVM executes it in three steps:
1. `mem = allocate();` // Allocate heap memory
2. `ctor(mem);`       // Invoke constructor to initialize fields
3. `instance = mem;`   // Assign reference to `instance`

Under compiler and CPU **instruction reordering**, the JVM may reorder step 2 and step 3:
1. `mem = allocate();`
2. `instance = mem;`   // Non-null reference published prematurely!
3. `ctor(mem);`       // Constructor is still executing!

If Thread B enters the first `if (instance == null)` check while Thread A is between step 2 and step 3, Thread B observes `instance != null` and returns a **partially-constructed object**, causing unpredictable NullPointerExceptions or data corruption!

### The Fix: The `volatile` Keyword

Marking `instance` as **`volatile`** introduces CPU **Memory Barriers (Fences)**:
* Prevents the JVM from reordering the constructor call after the reference assignment.
* Guarantees that any write to `instance` is immediately visible to all reading threads.

### Implementation

```java
public class DoubleCheckedLockingSingleton {

    // 1. MUST BE VOLATILE to establish a happens-before memory barrier
    // and prevent instruction reordering of constructor execution!
    private static volatile DoubleCheckedLockingSingleton instance;

    private final String connectionString;

    // Private constructor prevents external instantiation
    private DoubleCheckedLockingSingleton() {
        this.connectionString = "jdbc:postgresql://prod-db.internal:5432/main";
        System.out.println("Singleton fully initialized with connection: " + connectionString);
    }

    public static DoubleCheckedLockingSingleton getInstance() {
        // First Check (No locking - fast path for 99.999% of requests)
        DoubleCheckedLockingSingleton localRef = instance;
        if (localRef == null) {

            // Synchronize only during initial construction
            synchronized (DoubleCheckedLockingSingleton.class) {

                // Second Check (Inside synchronized lock - prevents race condition)
                localRef = instance;
                if (localRef == null) {
                    // Safe allocation: volatile prevents premature publication of half-initialized object
                    instance = localRef = new DoubleCheckedLockingSingleton();
                }
            }
        }
        return localRef;
    }

    public String getConnectionString() {
        return connectionString;
    }

    public static void main(String[] args) {
        // Multi-threaded verification
        Runnable task = () -> {
            DoubleCheckedLockingSingleton s = DoubleCheckedLockingSingleton.getInstance();
            System.out.printf("[%s] Retrieved instance: %d%n", 
                Thread.currentThread().getName(), System.identityHashCode(s));
        };

        Thread t1 = new Thread(task, "Thread-1");
        Thread t2 = new Thread(task, "Thread-2");
        Thread t3 = new Thread(task, "Thread-3");

        t1.start(); t2.start(); t3.start();
    }
}
```
