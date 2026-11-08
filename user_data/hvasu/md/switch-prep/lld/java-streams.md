Here are practical Java code examples for each type of stream.

### 1\. Collections (Direct `.stream()`)

Java

    import java.util.*;
    
    public class CollectionStreams {
        public static void main(String[] args) {
            // --- LIST ---
            List<String> endpoints = List.of("/api/v1/users", "/api/v1/orders", "/health");
            System.out.println("List Stream:");
            endpoints.stream()
                    .filter(path -> path.startsWith("/api"))
                    .forEach(System.out::println);
    
            // --- SET ---
            Set<Integer> uniqueIds = Set.of(101, 102, 103, 104);
            System.out.println("\nSet Stream:");
            uniqueIds.stream()
                    .filter(id -> id % 2 == 0) // Keep only even IDs
                    .forEach(System.out::println);
    
            // --- QUEUE ---
            Queue<String> taskQueue = new LinkedList<>(List.of("Task_A", "Task_B", "Task_C"));
            System.out.println("\nQueue Stream:");
            taskQueue.stream()
                    .map(task -> task + "_PROCESSED")
                    .forEach(System.out::println);
        }
    }
    

### 2\. Maps (Indirect streaming)

Java

    import java.util.*;
    
    public class MapStreams {
        public static void main(String[] args) {
            Map<String, Integer> requestCounts = Map.of(
                "User_A", 150,
                "User_B", 20,
                "User_C", 350
            );
    
            // --- THE VALUES ---
            System.out.println("Values Stream:");
            requestCounts.values().stream()
                    .filter(count -> count > 100)
                    .forEach(System.out::println);
    
            // --- THE KEYS ---
            System.out.println("\nKeys Stream:");
            requestCounts.keySet().stream()
                    .filter(key -> key.endsWith("_A"))
                    .forEach(System.out::println);
    
            // --- THE PAIRS (ENTRIES) ---
            System.out.println("\nEntry Stream:");
            requestCounts.entrySet().stream()
                    .filter(entry -> entry.getValue() > 100)
                    .forEach(entry -> System.out.println(entry.getKey() + " made " + entry.getValue() + " requests"));
        }
    }
    

### 3\. Arrays

Java

    import java.util.Arrays;
    import java.util.stream.Stream;
    
    public class ArrayStreams {
        public static void main(String[] args) {
            // --- FROM AN EXISTING ARRAY ---
            int[] errorCodes = {400, 401, 403, 404, 500, 502};
            System.out.println("Arrays.stream():");
            Arrays.stream(errorCodes)
                    .filter(code -> code >= 500) // Filter server errors
                    .forEach(code -> System.out.println("Server Error: " + code));
    
            // --- FROM A LIST OF ITEMS ---
            System.out.println("\nStream.of():");
            Stream.of("Node1", "Node2", "Node3")
                    .map(node -> node + ".localnet")
                    .forEach(System.out::println);
        }
    }
    

### 4\. Strings

Java

    public class StringStreams {
        public static void main(String[] args) {
            // --- STREAM OF CHARACTERS ---
            String data = "A1B2C3";
            System.out.println("String.chars():");
            data.chars()
                .filter(Character::isDigit) // Filter only numbers
                .mapToObj(c -> (char) c)    // Convert ASCII integer back to char
                .forEach(System.out::println);
    
            // --- STREAM OF LINES ---
            String logs = "INFO: Application started\nERROR: Connection timeout\nINFO: Retrying...";
            System.out.println("\nString.lines():");
            logs.lines()
                .filter(line -> line.startsWith("ERROR"))
                .forEach(System.out::println);
        }
    }
    

### 5\. Numbers (Ranges)

    import java.util.stream.IntStream;
    
    public class NumberStreams {
        public static void main(String[] args) {
            // --- NUMBER RANGES (Exclusive at the end) ---
            // Good for sliding windows or matrix traversal where index goes from 0 to length-1
            System.out.println("IntStream.range(0, 5):");
            IntStream.range(0, 5) // Prints 0, 1, 2, 3, 4
                    .forEach(i -> System.out.print(i + " "));
            
            System.out.println("\n");
    
            // --- INCLUSIVE RANGES ---
            // Good for business logic like "Days 1 through 7"
            System.out.println("IntStream.rangeClosed(1, 5):");
            IntStream.rangeClosed(1, 5) // Prints 1, 2, 3, 4, 5
                    .forEach(i -> System.out.print(i + " "));
        }
    }
    

Java

---

The `.collect()` method is a **terminal operation**, meaning it sits at the very end of your stream pipeline. Its job is to take all the processed items that come out of the stream and package them back together into a result—usually a `List`, `Set`, `Map`, or even a single `String`.

To use `.collect()`, you almost always pass in a helper method from the `Collectors` utility class.

Here are practical examples of the most common ways to collect stream data:

### 1\. Collecting to a List or Set

This is the most common use case: taking a stream and packing it into a standard collection.

Java

    import java.util.*;
    import java.util.stream.Collectors;
    
    public class BasicCollectors {
        public static void main(String[] args) {
            List<String> userRoles = List.of("ADMIN", "USER", "GUEST", "USER", "ADMIN");
    
            // --- TO LIST ---
            // Keeps duplicates, maintains order
            List<String> lowerCaseRoles = userRoles.stream()
                    .map(String::toLowerCase)
                    .collect(Collectors.toList()); 
            System.out.println("As List: " + lowerCaseRoles);
            // Output: [admin, user, guest, user, admin]
    
            // --- TO SET ---
            // Removes duplicates automatically
            Set<String> uniqueRoles = userRoles.stream()
                    .collect(Collectors.toSet());
            System.out.println("As Set: " + uniqueRoles);
            // Output: [ADMIN, GUEST, USER] (order not guaranteed)
        }
    }
    

### 2\. Joining Strings

If you have a stream of strings and want to combine them into a single string (like a comma-separated list), `Collectors.joining()` is incredibly useful.

Java

    import java.util.List;
    import java.util.stream.Collectors;
    
    public class JoiningCollector {
        public static void main(String[] args) {
            List<String> databases = List.of("PostgreSQL", "Redis", "MongoDB");
    
            // --- JOINING ---
            // Just smashes them together
            String basicJoin = databases.stream().collect(Collectors.joining());
            System.out.println("Basic join: " + basicJoin);
            // Output: PostgreSQLRedisMongoDB
    
            // --- JOINING WITH DELIMITER ---
            String csv = databases.stream().collect(Collectors.joining(", "));
            System.out.println("CSV style: " + csv);
            // Output: PostgreSQL, Redis, MongoDB
            
            // --- JOINING WITH DELIMITER, PREFIX, AND SUFFIX ---
            String formatted = databases.stream().collect(Collectors.joining(", ", "[", "]"));
            System.out.println("Formatted: " + formatted);
            // Output: [PostgreSQL, Redis, MongoDB]
        }
    }
    

### 3\. Collecting to a Map

You can use `Collectors.toMap()` to transform a list of objects into a key-value dictionary for fast lookups. You have to tell it how to extract the key and the value.

Java

    import java.util.*;
    import java.util.stream.Collectors;
    
    class Employee {
        int id;
        String name;
        
        Employee(int id, String name) { this.id = id; this.name = name; }
        public int getId() { return id; }
        public String getName() { return name; }
    }
    
    public class MapCollectors {
        public static void main(String[] args) {
            List<Employee> employees = List.of(
                new Employee(101, "Alice"),
                new Employee(102, "Bob")
            );
    
            // --- TO MAP ---
            // keyMapper: e -> e.getId()
            // valueMapper: e -> e.getName()
            Map<Integer, String> idToNameMap = employees.stream()
                    .collect(Collectors.toMap(Employee::getId, Employee::getName));
    
            System.out.println("ID to Name: " + idToNameMap);
            // Output: {101=Alice, 102=Bob}
    
            // --- TO MAP (Keeping the whole object) ---
            // If you want the value to be the whole Employee object, use e -> e
            Map<Integer, Employee> idToObjectMap = employees.stream()
                    .collect(Collectors.toMap(Employee::getId, e -> e));
        }
    }
    

### 4\. Grouping Elements (`groupingBy`)

This organizes elements into a Map based on a specific property. **This is exactly what your initial parking lot code was doing!** It grouped parking spots by their size.

Java

    import java.util.*;
    import java.util.stream.Collectors;
    
    class Transaction {
        String type;
        double amount;
        
        Transaction(String type, double amount) { this.type = type; this.amount = amount; }
        public String getType() { return type; }
    }
    
    public class GroupingCollectors {
        public static void main(String[] args) {
            List<Transaction> transactions = List.of(
                new Transaction("DEPOSIT", 1000),
                new Transaction("WITHDRAWAL", 200),
                new Transaction("DEPOSIT", 500)
            );
    
            // --- BASIC GROUPING ---
            // Groups the whole objects by type
            Map<String, List<Transaction>> groupedByType = transactions.stream()
                    .collect(Collectors.groupingBy(Transaction::getType));
            System.out.println("Grouped: " + groupedByType.keySet()); 
            // Keys: [DEPOSIT, WITHDRAWAL]
    
            // --- GROUPING WITH COUNTING ---
            // This counts how many items are in each group (just like your parking spot code)
            Map<String, Long> countByType = transactions.stream()
                    .collect(Collectors.groupingBy(Transaction::getType, Collectors.counting()));
            System.out.println("Counts: " + countByType);
            // Output: {DEPOSIT=2, WITHDRAWAL=1}
        }
    }
    

### 5\. Partitioning (`partitioningBy`)

This is a special, highly optimized version of `groupingBy`. While `groupingBy` can have many categories (like sizes or types), `partitioningBy` only ever has two categories: `true` and `false`.

Java

    import java.util.*;
    import java.util.stream.Collectors;
    
    public class PartitioningCollector {
        public static void main(String[] args) {
            List<Integer> numbers = List.of(15, 2, 8, 99, 4, 11);
    
            // --- PARTITIONING ---
            // Splits the stream into two lists based on a boolean condition (is Even?)
            Map<Boolean, List<Integer>> evensAndOdds = numbers.stream()
                    .collect(Collectors.partitioningBy(n -> n % 2 == 0));
    
            System.out.println("Evens (true): " + evensAndOdds.get(true));
            // Output: [2, 8, 4]
            
            System.out.println("Odds (false): " + evensAndOdds.get(false));
            // Output: [15, 99, 11]
        }
    }
    

---

This specific line is one of the most powerful (and common) uses of the Java Streams API. It acts almost exactly like a `GROUP BY` and `COUNT()` statement in SQL.

Let’s break it down piece by piece so you can see exactly how the mechanics work.

Java

    .collect(Collectors.groupingBy(ParkingSpot::getSpotSize, Collectors.counting()));
    

### The Three Moving Parts

#### 1\. `Collectors.groupingBy(...)`

This is the master organizer. Its job is to look at every item flowing through the stream and sort them into different "buckets" (which become the **keys** of a `Map`).

By default, `groupingBy` takes one argument, but here we are using the two-argument version:

1.  **How to group them** (The Key)
    
2.  **What to do with the grouped items** (The Value)
    

#### 2\. `ParkingSpot::getSpotSize` (The Key)

This is called a **Classifier Function**. It tells Java: _"Look at the parking spot, call the `getSpotSize()` method, and use the result as the bucket label."_

_(Note: `ParkingSpot::getSpotSize` is just shorthand for the lambda `spot -> spot.getSpotSize()`)_.

#### 3\. `Collectors.counting()` (The Value)

This is called a **Downstream Collector**. When Java puts an item into a bucket, this tells Java what to actually store as the value in the map. Instead of storing the parking spots themselves, it just adds `+1` to a running tally.

### Step-by-Step Visualization

Imagine your stream contains three available parking spots:

-   `Spot 1` (Size: COMPACT)
    
-   `Spot 2` (Size: LARGE)
    
-   `Spot 3` (Size: COMPACT)
    

Here is exactly what Java does under the hood:

**Step 1: Look at Spot 1**

-   Call `getSpotSize()` -> Returns `COMPACT`.
    
-   Is there a `COMPACT` bucket yet? No. Create one.
    
-   Apply `counting()` -> `COMPACT` count is now `1`.
    

**Step 2: Look at Spot 2**

-   Call `getSpotSize()` -> Returns `LARGE`.
    
-   Is there a `LARGE` bucket yet? No. Create one.
    
-   Apply `counting()` -> `LARGE` count is now `1`.
    

**Step 3: Look at Spot 3**

-   Call `getSpotSize()` -> Returns `COMPACT`.
    
-   Is there a `COMPACT` bucket? Yes.
    
-   Apply `counting()` -> `COMPACT` count increases to `2`.
    

**Final Result:** A `Map<VehicleSize, Long>` that looks like this: `{ COMPACT=2, LARGE=1 }`

### What happens if we REMOVE `Collectors.counting()`?

To really understand how `counting()` works, it helps to see what happens if you don't use it.

If you just write this:

Java

    .collect(Collectors.groupingBy(ParkingSpot::getSpotSize));
    

You don't get counts. Instead, the default behavior of `groupingBy` is to collect the actual objects into a List.

Your result would be a `Map<VehicleSize, List<ParkingSpot>>` that looks like this: `{ COMPACT=[Spot 1, Spot 3], LARGE=[Spot 2] }`

By adding `Collectors.counting()` as the second argument, you intercept that default behavior and say, _"Don't keep the objects in a list, just count them."_