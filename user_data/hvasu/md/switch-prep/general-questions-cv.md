You got it—no tables this time. Here are 50 fundamental questions a principal engineer would likely ask based directly on your resume, organized into four scannable sections.

### System Design & Architecture

1.  **How did you design the IVR masked calling microservice to handle 60K+ calls a month at Zoomcar?**
    
2.  **What was the architecture of the event-driven vehicle health scoring system?**
    
3.  How did you ensure fault tolerance in the high-throughput Node.js routing service at BrowserStack?
    
4.  **Explain how you automated the booking block process for unsafe vehicles without creating race conditions.**
    
5.  How did you design the backend for the Shipsy User Management system?
    
6.  **What were the main trade-offs you considered when building the Express.js LMS during your sabbatical?**
    
7.  How did you handle idempotency for the financial workflows (refunds, ledger settlements) in Ruby on Rails?
    
8.  Walk me through how you structured the Daily Summary Reports system at Shipsy for scale.
    
9.  How did you decide between microservices and monoliths for your backend projects?
    
10.  **How would you rate-limit your Spring Boot APIs if traffic suddenly spiked?**
    
11.  How do you handle distributed tracing and logging across your microservices?
    
12.  **When designing RESTful APIs, how do you handle versioning and backward compatibility?**
    

### Backend Languages & Frameworks

13.  **How does the Node.js event loop handle high concurrent test executions like the ones at BrowserStack?**
    
14.  What are the key architectural differences between NestJS and Express.js based on your experience?
    
15.  How did you manage dependency injection in your Spring Boot microservices?
    
16.  What are the core benefits of using TypeScript over JavaScript in backend systems like Shipsy's?
    
17.  How do you handle deep-stack asynchronous errors or promise rejections in Node.js?
    
18.  Can you explain the lifecycle of a Spring Bean?
    
19.  How did you debug and optimize memory usage in your Node.js routing services?
    
20.  In Ruby on Rails, how did you handle background job processing for ledger settlements?
    
21.  How do you enforce Object-Oriented Programming (OOP) principles in your daily coding?
    
22.  What strategies do you use to ensure thread safety in Java applications?
    
23.  How does Express middleware execute under the hood?
    
24.  How do you typically structure your project folders in a NestJS application?
    
25.  Explain the differences in concurrency handling between Python, Ruby, and Node.js.
    

### Databases & Messaging

26.  Why did you choose Kafka for the vehicle health scoring system instead of a traditional message queue like RabbitMQ?
    
27.  How did you structure your Kafka topics and consumer groups for the health scoring system?
    
28.  How do you handle message ordering and exactly-once processing in Kafka?
    
29.  How did you model the schemas for your MongoDB database in your LMS project?
    
30.  What was your strategy for optimizing PostgreSQL queries for the Daily Summary Reports at Shipsy?
    
31.  Can you explain how database transaction isolation levels worked for your financial workflows?
    
32.  How do you decide when to use a NoSQL database (like MongoDB) versus a relational one (like PostgreSQL/MySQL)?
    
33.  What indexing strategies do you typically apply to speed up slow SQL queries?
    
34.  How did you manage schema migrations safely in your production databases?
    
35.  How do you prevent database deadlocks in high-concurrency systems?
    
36.  What happens if a Kafka broker fails while you are processing a vehicle score?
    
37.  How do you design efficient foreign key relationships in PostgreSQL for User Management systems?
    

### DevOps, Cloud, & Engineering Impact

38.  How did you Dockerize your full-stack Learning Management System?
    
39.  Which AWS services did you utilize for the LMS, and how did you configure them?
    
40.  Can you walk me through the CI/CD pipeline you set up or used with Jenkins?
    
41.  How did you maintain 85%+ code coverage using RSpec at BrowserStack?
    
42.  What are the key quality gates you enforced during code reviews at Zoomcar?
    
43.  How exactly did your IVR microservice reduce support intervention by 80%?
    
44.  What was the most challenging technical disagreement you had while mentoring the 3 junior developers at Zoomcar?
    
45.  How did you measure the 30% improvement in onboarding metrics for the Quick Integration Guide?
    
46.  Walk me through the hardest production bug you faced in the Node.js routing service and how you fixed it.
    
47.  How did you prioritize technical debt versus feature delivery to meet your sprint deadlines at Zoomcar?
    
48.  How did you leverage AI-assisted tools for deploying your AWS/Docker infrastructure during your career break?
    
49.  How do you plan to transition back to a full-time, high-paced engineering environment after your UPSC sabbatical?
    
50.  When leading system design decisions, how do you handle pushback from product managers on technical constraints?
    

---
## How did you design the IVR masked calling microservice to handle 60K+ calls a month at Zoomcar?

### 1\. The Core Architecture (The "From-To" Mapping)

"To handle the 60K+ monthly calls at Zoomcar, I designed the Spring Boot microservice to act as the routing brain for our third-party telephony provider (like Exotel or Twilio). When a driver or rider dialed the masked virtual number, the provider immediately fired a **synchronous webhook to our Spring Boot API**. Our service looked up the active trip data, identified the real destination number, and returned the routing instructions in real-time."

### 2\. Low-Latency Caching (The Secret Sauce)

"Because IVR webhooks require extremely low latency (otherwise the user hears dead air before the ring), hitting a relational database directly for every call wasn't scalable. I designed the system to cache the active 'Virtual Number + Caller ID -> Destination Number' **mappings in memory** (or Redis). The relational database (MySQL/PostgreSQL) was only used as the source of truth for historical records."

### 3\. Lifecycle Management (The "Bunch of Other Stuff")

"The complexity wasn't just routing; it was managing the lifecycle of the virtual numbers. I implemented business logic to:

-   **Provisioning:** Bind a virtual number to a specific trip only 30 minutes before the trip started.
    
-   **De-provisioning:** Automatically expire and recycle the virtual number 30 minutes after the trip ended so it could be reused, saving the business money on virtual number leases.
    
-   **Security:** Block any calls originating from numbers not actively associated with a live trip."
    

### 4\. Asynchronous Analytics & Fallbacks

"To prove the 80% reduction in support tickets, we needed data. The telephony provider sent async webhooks with **Call Detail Records (CDRs)** after the call ended. I pushed these into an asynchronous pipeline (likely using Kafka, which was already in our stack) so we could log call durations and connection failures without blocking the main application threads. If the telephony provider went down, we had circuit breakers in place to gracefully degrade the service."

---
## What was the architecture of the event-driven vehicle health scoring system?

### 1\. The Problem: Why Event-Driven?

"Before this system, evaluating a car's health was likely a batch process or relied on synchronous REST calls that could bottleneck the main booking engine. We needed to evaluate vehicle history in real-time without tightly coupling the telemetry ingestion to the core reservation system. That is why we introduced Kafka as the central nervous system."

### 2\. Ingestion & The Partitioning Strategy

"We had multiple data sources—IoT telemetry from the cars (engine alerts, battery levels) and trip lifecycle events (user reports, trip completions)—acting as producers. They published events to specific Kafka topics.

The most critical architectural decision I made here was **partitioning the Kafka topics by `vehicle_id`**. This guaranteed that all health-related events for a _single specific car_ were processed strictly in order by the same consumer thread, preventing race conditions where an 'all clear' signal might accidentally be processed before a 'check engine' signal."

### 3\. The Scoring Consumer (The Brain)

"I built a consumer group (likely in Spring Boot/Java based on your stack) that listened to these partitions. As events flowed in, the service evaluated them against our business rules. If a car reported a critical fault, or accumulated enough minor faults to cross the safety threshold, the system updated the vehicle's internal health score in our operational database (like PostgreSQL or MySQL)."

### 4\. Closing the Loop: Automated Blocking

"The final piece was taking action. Once the scoring consumer flagged a vehicle as unsafe, it didn't just update a database—it emitted a high-priority **'Block Vehicle' event** or triggered a webhook to the core booking engine. This allowed us to automatically block bookings for unsafe vehicles in real-time, successfully protecting over 3,000 trips a month without requiring human support agents to manually intervene."

---
## Explain how you automated the booking block process for unsafe vehicles without creating race conditions.

### 1\. The Race Condition Threat

"The primary risk we faced was a classic 'Check-Then-Act' race condition. Imagine our Kafka consumer evaluates the telemetry data and decides to block Vehicle A just as a user clicks 'Pay Now' for Vehicle A in the app. If the booking engine and the health scoring system query the vehicle's availability at the exact same time, both see it as 'available.' The user books an unsafe car, and our system fails to protect them."

### 2\. The Solution: Distributed Locking

"To solve this, we needed a synchronization mechanism. When the Kafka consumer processed a critical fault and decided to block the car, it didn't just run a simple `UPDATE` query. Instead, we implemented locking on the `vehicle_id`.

Depending on the exact implementation, we either used a distributed lock via Redis or a pessimistic database lock (`SELECT FOR UPDATE`) in our relational database (PostgreSQL or MySQL). This guaranteed that whoever got to the `vehicle_id` row first—the booking engine or the health scoring system—locked it exclusively."

### 3\. Handling the Conflict Gracefully

"If the Kafka consumer acquired the lock first, it updated the vehicle status to 'Blocked for Maintenance.' When the user's checkout request arrived a millisecond later, the booking engine would fail to acquire the lock, read the new status, and politely reject the booking with a 'Vehicle no longer available' message.

If the user acquired the lock first and completed the checkout, our blocking service would wait. Once the user's transaction committed, the blocking service would acquire the lock, mark the vehicle as unsafe, and immediately emit an event to the 'Reassignment Service' to find the user a new, safe car."

### 4\. The Business Impact

"By strictly enforcing these locks, we completely decoupled the health scoring logic from the core booking monolith. We were able to automatically evaluate vehicle history in real-time and successfully protect over 3,000 trips a month without a single data corruption or double-booking incident."

---
## How did you ensure fault tolerance in the high-throughput Node.js routing service at BrowserStack?

### 1\. The Threat: Event Loop Lag & Memory Leaks

"In a high-throughput Node.js routing service, the biggest risk to fault tolerance is blocking the single-threaded event loop. When routing thousands of concurrent automated tests, a single **synchronous bottleneck**, an **unhandled promise rejection**, or a **memory leak** could cause severe event loop lag—hanging all active test sessions. I focused heavily on **profiling heap dumps and monitoring event loop metrics** to identify and eliminate these internal bottlenecks before they could cause a cascading failure."

### 2\. Process Redundancy via Clustering

"To ensure high availability at the application tier, we never relied on a single Node.js process. We utilized Node.js clustering (or a **process manager like PM2**) to spawn **multiple worker threads across all available CPU cores**. If a specific worker process crashed due to a deep-stack error or an out-of-memory exception, the process manager would immediately restart it. Meanwhile, our load balancer would seamlessly route incoming test execution commands to the surviving healthy workers."

### 3\. Multi-Region Failover & Timeouts

"Because we were routing tests to global device farms covering 135+ countries, network latency and regional outages were constant threats. I designed the routing layer with strict **timeout policies and multi-region fault tolerance**. If a specific regional device cluster went offline during an active test session, the routing service would detect the timeout and dynamically fail over to a healthy device cluster in another region, ensuring the user's test suite completed successfully."

### 4\. Observability for SLA Guarantees

"Finally, fault tolerance requires deep observability. To consistently meet our SLA guarantees and resolve deep-stack test failures quickly, we relied on **distributed tracing and correlation IDs**. This allowed us to track a single test request end-to-end across multiple network hops. When a test failed, we didn't have to guess where the bottleneck was—we could instantly isolate whether it was our routing service, the network latency, or the destination device farm."

---
## What were the main trade-offs you considered when building the Express.js LMS during your sabbatical?

### 1\. Express.js: Development Velocity vs. Architectural Structure

-   **The Decision:** Utilizing Express.js for the backend framework.
    
-   **The Trade-off:** Express.js is highly **unopinionated and minimal**, which is excellent for rapid prototyping and moving quickly on an independent project. However, the trade-off is the lack of built-in architectural guardrails. Unlike **heavily structured frameworks such as NestJS or Spring Boot—which enforce strict dependency injection and modularity**—Express requires the developer to **manually enforce design patterns, custom error handling, and folder structures** to prevent the codebase from deteriorating as the application scales.
    

### 2\. MongoDB: Schema Flexibility vs. Relational Integrity

-   **The Decision:** Selecting MongoDB (NoSQL) for the database.
    
-   **The Trade-off:** An LMS deals with highly variable data structures, such as courses containing a mix of text modules, video lectures, and quizzes. MongoDB’s document model accommodates this perfectly through data embedding, avoiding the need for complex database schemas. The cost of this flexibility is the sacrifice of strict ACID transactions and relational integrity found in SQL databases like PostgreSQL or MySQL. Ensuring data consistency—such as keeping user enrollment data synchronized across multiple course documents—has to be manually managed at the application layer.
    

### 3\. Docker & AWS: Infrastructure Control vs. Operational Overhead

-   **The Decision:** Containerizing the application with Docker and deploying it on AWS.
    
-   **The Trade-off:** The alternative for an independent project would be using a fully managed Platform-as-a-Service (PaaS) like Heroku or Vercel, which handles deployments automatically. Choosing Docker and AWS trades ease-of-use for total environmental control. It requires manually managing multi-stage container builds, networking, and security configurations, introducing significant operational overhead. However, it ensures the application is enterprise-ready and avoids vendor lock-in.
    

### 4\. AI-Assisted Development: Coding Speed vs. Verification Overhead

-   **The Decision:** Leveraging AI-assisted development tools to engineer the platform.
    
-   **The Trade-off:** AI tools drastically accelerate the generation of boilerplate code and test structures. The primary trade-off is that AI-generated code cannot be implicitly trusted; it can introduce hallucinations, anti-patterns, or insecure dependencies. The massive gain in initial coding velocity must be paid for later with rigorous manual code reviews and the implementation of robust test suites to verify the logic against strict architectural standards
    

---
## How would you rate-limit your Spring Boot APIs if traffic suddenly spiked?

### 1\. Immediate Mitigation (Infrastructure Layer)

If traffic spikes suddenly in production, changing application code is too slow. Mitigation must happen before traffic hits the Spring Boot JVMs:

-   **Web Application Firewall (WAF):** Enable rules in Cloudflare or AWS WAF to block abusive IPs or enable "Under Attack" mode.
    
-   **Load Balancer / Ingress:** Apply `limit_req` directives at the NGINX or HAProxy layer.
    
-   **Why this matters:** Drops requests at the edge, preventing memory exhaustion, thread pool starvation, and database overload.
    

### 2\. Architectural Solution (API Gateway)

In a scalable microservices ecosystem, rate limiting should be abstracted away from individual Spring Boot worker nodes.

-   **Spring Cloud Gateway:** Use the built-in `RequestRateLimiter` filter.
    
-   **State Management:** Back the gateway with **Redis** (`RedisRateLimiter`) to share request counts across all gateway instances.
    
-   **Granularity:** Limit by client IP, JWT user ID, or specific API route.
    

### 3\. Application-Level Implementation (Code Layer)

If rate limiting must live inside the Spring Boot application itself, these are the standard tools:

| Library | Algorithm Focus | Best Use Case | Distributed Support |
| --- | --- | --- | --- |
| Bucket4j | Token Bucket | Fine-grained, per-user limits. | Excellent (via Redis/Hazelcast). |
| Resilience4j | Custom RateLimiter | Protecting downstream API calls. | Requires custom setup. |

> **Critical Distributed Systems Note:** Using a simple `ConcurrentHashMap` in memory fails during a spike if you have multiple Spring Boot instances running. The rate limiter **must** be backed by a distributed cache (like Redis) so all nodes share the same state.

### 4\. Core Algorithms Expected

-   **Token Bucket (Bucket4j):** Allows for sudden bursts of traffic up to a maximum capacity, then drops requests until tokens refill.
    
-   **Leaky Bucket (NGINX):** Smooths out bursts into a steady, constant stream of processed requests.
    

### 5\. HTTP Compliance

When a limit is breached, the Spring Boot app or Gateway must respond correctly to clients:

-   **Status Code:** Return `429 Too Many Requests` (never a 500 Internal Server Error).
    
-   **Headers:** Include a `Retry-After: [seconds]` header to tell well-behaved clients exactly when to try again.
    
-   **Body:** Provide a standard JSON payload explaining the quota limit.
    

---
## When designing RESTful APIs, how do you handle versioning and backward compatibility?

### 1\. API Versioning Strategies (The "How")

When introducing breaking changes, the API must be versioned to prevent breaking existing clients. There are four industry-standard approaches:

| Strategy | Example | Pros | Cons |
| --- | --- | --- | --- |
| URI Path | /api/v1/users | Explicit, easy to route at the API Gateway, easily cached by CDNs. | Not strictly RESTful (version isn't a resource), URLs change over time. |
| Header (Custom) | X-API-Version: | URLs stay clean and represent the resource purely. | Harder to test manually in a browser; requires custom header logic. |
| Query Parameter | /api/users?v= | Simple to implement and test. | Can interfere with caching layers; feels messy for resource identification. |
| Content Negotiation | Accept: application/vnd.company.v1+json | The most "pure" REST approach; versions the representation, not the resource. | Highly complex for clients to use; difficult to test via simple cURL/browser. |

> **Industry Standard:** **URI Path** is the most widely adopted pragmatic choice (used by Stripe, Twilio, Twitter) because of its simplicity for developer experience and infrastructure routing.

### 2\. Backward Compatibility (The "What")

The golden rule of API evolution is to avoid versioning unless absolutely necessary. Versioning **splits the codebase and increases maintenance overhead**.

**Safe Changes (Do NOT require a new version):**

-   Adding new API endpoints.
    
-   Adding new optional request parameters.
    
-   Adding new fields to the response payload (clients should be designed to ignore unknown JSON fields).
    
-   Relaxing input constraints.
    

**Breaking Changes (REQUIRE a new version):**

-   Removing or renaming an existing field or endpoint.
    
-   Changing the data type of a field (e.g., integer to string).
    
-   Adding a new _required_ request parameter or payload field.
    
-   Tightening input constraints (e.g., reducing max string length).
    

### 3\. The Codebase Strategy

To maintain multiple versions without duplicating the entire codebase, applications typically use one of two patterns:

-   **Adapter Pattern:** Controllers are versioned (`UserControllerV1`, `UserControllerV2`). Both controllers map to the same underlying domain model or service layer. The V1 controller transforms the modern internal domain object back into the legacy V1 JSON structure.
    
-   **API Gateway Routing:** The API gateway routes `/v1/` traffic to Legacy Service A, and `/v2/` traffic to Modern Service B.
    

### 4\. The Deprecation Lifecycle

You cannot support old versions forever. A graceful sunset strategy is critical:

1.  **Monitor:** Track metrics to see which clients are still using the deprecated version.
    
2.  **Headers:** Return standard `Deprecation: true` and `Sunset: [Date]` HTTP headers on the old endpoints.
    
3.  **Communicate:** Notify API consumers via email or developer portals well in advance (typically 6-12 months).
    
4.  **Brownouts:** Temporarily disable the V1 API for short windows (e.g., 1 hour) to force clients to realize it is being retired before the final shutdown.
    

---
## How does the Node.js event loop handle high concurrent test executions like the ones at BrowserStack?

### 1\. The Core Concept: Single-Threaded but Highly Concurrent

The most important concept to articulate is how a single thread can handle thousands of concurrent users.

-   **The Myth:** Node.js executes everything on a single thread, so it can only do one thing at a time.
    
-   **The Reality:** The _main event loop_ (V8 engine executing your JavaScript) is single-threaded. However, Node.js delegates heavy lifting (I/O operations) to background threads managed by a C++ library called **libuv**.
    

### 2\. The Java vs. Node.js Contrast (Your Differentiator)

-   **Java (Traditional Spring Boot / Tomcat):** Follows a **Thread-per-Request** model. If 1,000 users connect, the server spins up 1,000 OS threads. If a request queries a database, the thread sits blocked, consuming memory (context switching overhead) until the database responds.
    
-   **Node.js (Event-Driven):** Uses a **Non-Blocking I/O** model. If 1,000 users connect and query a database, the single main thread fires off 1,000 requests to the database, registers a callback for each, and immediately moves on. It doesn't wait. When the database responds, the callback is pushed to a queue for the main thread to execute.
    

### 3\. The Architecture (libuv and the Worker Pool)

When you explain _how_ it works, break it down into these components:

1.  **Call Stack (V8 Engine):** Executes synchronous JavaScript code.
    
2.  **Node APIs (C++ Bindings):** When you call `fs.readFile()` or make an HTTP request, V8 hands the task to Node.js bindings.
    
3.  **libuv (The Engine Room):**
    
    -   For **Network I/O** (HTTP requests, DB connections), libuv uses the operating system's native asynchronous interfaces (eepoll on Linux, kqueue on Mac). These consume almost zero threads.
        
    -   For **File I/O or Crypto** (things the OS can't do asynchronously), libuv uses a hidden **Worker Thread Pool** (default size: 4 threads) to process them without blocking the main loop.
        
4.  **Callback Queue:** When an asynchronous operation finishes, its callback is placed here.
    
5.  **The Event Loop:** An infinite `while` loop that constantly checks if the Call Stack is empty. If it is, it pulls the next callback from the Queue and pushes it to the Stack.
    

### 4\. The Event Loop Phases (The Deep Dive)

If the interviewer asks for the exact sequence, the Event Loop processes queues in strict phases:

| Phase | What it does |
| --- | --- |
| Timers | Executes callbacks scheduled by setTimeout() and setInterval(). |
| Pending Callbacks | Executes I/O callbacks deferred to the next loop iteration (e.g., TCP errors). |
| Idle, Prepare | Internal Node.js usage only. |
| Poll | Retrieves new I/O events; executes I/O related callbacks (almost all your code runs here). |
| Check | Executes callbacks scheduled by setImmediate(). |
| Close Callbacks | Executes closing logic, like socket.on('close', ...). |

### 5\. The Achilles Heel (When Node.js Fails)

To show senior-level maturity, you must know when _not_ to use Node.js:

-   **CPU-Bound Tasks:** Node.js excels at I/O-bound tasks (reading databases, calling other APIs). But if you give it a CPU-intensive task (e.g., image processing, heavy matrix manipulations, complex algorithmic challenges), it will block the main thread.
    
-   **The Consequence:** If one user uploads an image for processing and it takes 2 seconds, the main thread is blocked. No other users can connect, and the server appears frozen for those 2 seconds. (In Java, only that one user's thread would block).
    

---
## How does Express middleware execute under the hood?

Express middleware operates on a pattern similar to the Chain of Responsibility. An incoming HTTP request passes through a sequence of functions. Each function can either:

1.  Modify the request/response objects.
    
2.  Terminate the cycle by sending a response back to the client (e.g., `res.send()`).
    
3.  Pass control to the next middleware in the chain by calling `next()`.
    

### 2\. Under the Hood: The Router and The Stack

When you configure an Express application, you are essentially pushing functions into a hidden array (the stack).

-   **The `Layer` Object:** Every time you call `app.use()` or `app.get()`, Express wraps your middleware function in an internal object called a `Layer`. This layer stores the path matching logic and your actual function.
    
-   **The Stack:** The Express `Router` maintains an array of these `Layer` objects.
    
-   **Execution Loop:** When a request arrives, Express starts at index `0` of this array. It checks if the incoming URL matches the `Layer`'s path. If it matches, it executes the function. If it doesn't, it immediately skips to the next `Layer`.
    

### 3\. The Mechanics of `next()`

The `next()` function is the engine of the pipeline. It is essentially a recursive callback.

-   When a middleware finishes its work, it _must_ call `next()` to tell Express, "I'm done, move to the next matching `Layer` in the array."
    
-   If a middleware does not call `next()` and does not send a response (like `res.json()`), the request is left hanging, and the client's browser will eventually time out.
    
-   **Bypassing the Route:** If a middleware calls `next('route')`, Express will skip all remaining middleware in the current router instance and move to the next router.
    

### 4\. Error Handling Mechanics (The 4-Arity Check)

Express identifies error-handling middleware purely by the number of arguments it accepts (its _arity_).

-   Standard middleware has 3 arguments: `(req, res, next)`.
    
-   Error-handling middleware MUST have 4 arguments: `(err, req, res, next)`.
    
-   **The Trigger:** If you pass an argument to `next()`—for example, `next(new Error('DB failure'))`—Express immediately stops normal execution. It skips all standard middleware in the stack and jumps directly to the first function it finds that has exactly 4 arguments.
    

### 5\. Common Interview Pitfalls to Avoid

When writing or discussing middleware, candidates often miss these edge cases:

-   **Calling `next()` after sending a response:** If you execute `res.send()` but then accidentally call `next()`, the next middleware will run, potentially trying to modify headers that have already been sent to the client (causing the dreaded `ERR_HTTP_HEADERS_SENT` crash).
    
-   **Async/Await unhandled rejections:** In Express 4, if an `async` middleware throws an error or rejects a promise, it will crash the server unless you wrap it in a `try/catch` block and explicitly pass the error to `next(err)`. (Express 5 fixes this by handling async rejections automatically).