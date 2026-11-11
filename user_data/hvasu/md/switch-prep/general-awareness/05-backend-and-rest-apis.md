# 5. Backend & REST APIs

---

### 5.1 What is REST and what are its principles?

REST (Representational State Transfer) is an architectural style designed by Roy Fielding (2000) for distributed hypermedia systems. It leverages the native stateless semantics of the HTTP protocol.

#### The 6 Core Constraints of REST:
1. **Client-Server Architecture:** Separation of user interface concerns from data storage concerns, allowing frontend and backend to evolve independently.
2. **Statelessness:** Every incoming request from a client must contain all context and authentication credentials necessary for the server to process it. The server stores no conversational session state between requests.
3. **Cacheability:** Responses must explicitly define whether they are cacheable using standard HTTP headers (`Cache-Control`, `ETag`, `Expires`) to eliminate redundant server round trips.
4. **Uniform Interface (The Defining Feature):**
   - **Identification of Resources:** Resources are uniquely addressed using clean URIs (`/api/v1/vehicles/42`).
   - **Manipulation through Representations:** Clients manipulate resources via standard formats (JSON, XML).
   - **Self-Descriptive Messages:** Each request and response carries metadata headers (`Content-Type`, `Accept`) describing how to parse the payload.
   - **HATEOAS (Hypermedia As The Engine Of Application State):** The response includes hypermedia links directing the client to permitted subsequent actions.
5. **Layered System:** The client cannot tell whether it is communicating directly with the end application server or through intermediaries (proxies, CDNs, load balancers, API gateways).
6. **Code on Demand (Optional):** Servers can extend client functionality by transmitting executable code (e.g., JavaScript).

---

### 5.2 Difference between PUT and PATCH

| Dimension | `PUT` | `PATCH` |
| :--- | :--- | :--- |
| **Semantic Meaning** | **Full Replacement** of the target resource. | **Partial Modification** of the target resource. |
| **Payload Requirement** | The request body must contain the **entire entity representation**. Any existing fields omitted from the payload are replaced with null or default values. | The request body contains **only the delta** (the specific fields that need to be changed). Omitted fields remain untouched. |
| **Idempotency** | **Guaranteed Idempotent:** Executing $N$ identical `PUT` requests produces the exact same resource state as executing it once ($f(f(x)) = f(x)$). | **Non-Idempotent by specification**, though often implemented idempotently for simple key-value updates. (e.g., a JSON Patch operation like `{"op": "add", "path": "/items", "value": "x"}` is non-idempotent). |
| **SQL Equivalent** | Complete row overwrite: `UPDATE users SET name=?, email=?, age=?, role=? WHERE id=?;` | Selective column update: `UPDATE users SET email=? WHERE id=?;` |

---

### 5.3 What is idempotency?

An operation is **idempotent** if performing it multiple times with the identical parameters produces the exact same side-effects and resulting system state as executing it once:
$$f(f(x)) = f(x)$$

#### HTTP Method Idempotency Matrix:
- **Idempotent:** `GET`, `HEAD`, `PUT`, `DELETE`, `OPTIONS`. (Calling `DELETE /orders/10` repeatedly leaves the order deleted; the database state is unchanged after the first execution).
- **Non-Idempotent:** `POST` (Repeated calls create multiple duplicate orders or charges).

#### How to Guarantee Idempotency in Production Payments (`POST`):
1. **Idempotency Key Generation:** The client generates a unique UUID (e.g., `Idempotency-Key: 7b6e92f2-1a4c...`) and passes it in the request header.
2. **Atomic Lock & Cache Check:** The server checks Redis using an atomic `SET key value NX EX 120` command:
   - If the key **already exists** and processing is complete: The server immediately returns the previously cached response payload without re-executing the payment.
   - If the key **is currently processing**: The server returns `409 Conflict` or waits for the lock.
   - If the key **is new**: The server stores the key with a `PROCESSING` status, executes the business logic inside a database transaction, updates the Redis key with the final response, and responds `201 Created`.

---

### 5.4 JWT vs session-based authentication

| Dimension | Session-Based Authentication | JSON Web Token (JWT) Authentication |
| :--- | :--- | :--- |
| **State Location** | **Stateful:** Session data is persisted on the server (in memory, PostgreSQL, or Redis). | **Stateless:** All user claims and metadata are encoded directly inside the token string held by the client. |
| **Verification Overhead** | Requires a database or Redis lookup on **every single incoming HTTP request** to validate the `session_id`. | Zero database lookups: The server validates the cryptographic signature mathematically using its private/public key. |
| **Horizontal Scalability** | Requires sticky sessions or a centralized, shared cache layer (e.g., Redis cluster) across microservices. | High: Any microservice can independently verify the token using the shared public key without shared state. |
| **Revocation / Invalidation** | **Instant and Easy:** Deleting the session record from Redis terminates the user's session immediately. | **Difficult:** A valid, unexpired token remains valid until its `exp` timestamp. Instant revocation requires maintaining a revocation blacklist in Redis (reintroducing state). |
| **Payload Overhead** | Small: Transmits a short opaque string (e.g., 32-byte UUID) inside a Cookie header. | Large: Base64-encoded JSON payload, headers, and signature (often 500+ bytes transmitted on every HTTP request). |

---

### 5.5 How do you handle API authentication and authorization?

A production-grade microservice architecture implements a two-stage security model:

```
[Client] ---> [API Gateway / Envoy] ---> [Downstream Microservices]
                  |
             (Validates JWT)
             (Extracts Claims)
                  |
                  v
       Forwards Header: `X-User-Id: 101`, `X-User-Roles: ADMIN`
```

1. **Authentication (AuthN - "Who are you?"):**
   - Implemented centrally at the **API Gateway** or Ingress Controller.
   - The client exchanges user credentials with an Identity Provider (Keycloak, Auth0, Okta) via **OAuth 2.0 / OpenID Connect (OIDC)** and obtains a short-lived access JWT (e.g., 15-minute expiration) and a long-lived refresh token.
   - The API Gateway intercepts the request, verifies the JWT's digital signature via JSON Web Key Sets (JWKS), validates timestamps (`exp`, `nbf`), and checks issuer/audience claims (`iss`, `aud`).
2. **Authorization (AuthZ - "What are you permitted to do?"):**
   - **Role-Based Access Control (RBAC):** Users are assigned roles (e.g., `ROLE_ADMIN`, `ROLE_OPERATOR`). Gateways or application controllers enforce route annotations (`@PreAuthorize("hasRole('ADMIN')")`).
   - **Attribute-Based Access Control (ABAC):** Granular access evaluation based on user attributes, resource attributes, and context (e.g., Open Policy Agent - OPA). Example: *"A fleet manager can only edit vehicle records that belong to their specific assigned city hub."*

---

### 5.6 How do you handle retries and API failures?

A resilient strategy for handling remote service failures incorporates five core patterns:

1. **Classify Errors (Transient vs. Non-Transient):**
   - *Retry Only Transient Failures:* Network dropouts, connection timeouts, `HTTP 429 Too Many Requests`, and `HTTP 503 Service Unavailable`.
   - *Never Retry Non-Transient Failures:* Client errors (`HTTP 400 Bad Request`, `401 Unauthorized`, `404 Not Found`) or business validation rejections.
2. **Exponential Backoff with Full Jitter:**
   - Instead of retrying immediately (which hammers a recovering downstream service), delay retries exponentially:
     $$T_i = \min(M, B \times 2^i)$$
   - Add **Full Jitter** (randomization) to prevent synchronized retry waves from causing a thundering herd:
     $$\text{Sleep} = \text{random}(0, T_i)$$
3. **Idempotency Guarantees:** Ensure all retried requests carry idempotency tokens to prevent duplicate mutations.
4. **Timeouts & Context Deadlines:** Always configure aggressive socket and connection timeouts (e.g., 2000ms). Propagate request deadlines across downstream calls so that if an upstream client cancels, downstream processing aborts immediately.
5. **Dead-Letter Queues (DLQ):** For asynchronous event-driven calls, messages that fail after maximum retry attempts (e.g., 3 retries) are routed to a DLQ for operational alerting, root cause analysis, and manual replay.

---

### 5.7 What is API pagination? Offset vs cursor-based

Pagination divides large datasets into manageable chunks to conserve database CPU, memory, and network bandwidth.

#### 1. Offset-Based Pagination:
```sql
SELECT * FROM vehicles 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 40000;
```
- **How it works:** The database skips the first 40,000 rows and returns the subsequent 20 rows.
- **Drawbacks:**
  - **Terrible Performance at Scale ($O(N)$):** The database engine must scan and read all 40,000 rows from disk into memory before discarding them.
  - **Page Drift / Inconsistency:** If a new record is inserted while the user is on page 1, moving to page 2 will show the last item from page 1 again (duplicate items or skipped items).
- **Advantage:** Allows jumping directly to an arbitrary page number (e.g., *"Jump to Page 15"*).

#### 2. Cursor-Based (Keyset) Pagination:
```sql
SELECT * FROM vehicles 
WHERE (created_at, id) < (:last_created_at, :last_id)
ORDER BY created_at DESC, id DESC 
LIMIT 20;
```
- **How it works:** Uses a sequential, indexed unique column (or composite key) as a cursor pointer to seek directly to the next set of rows.
- **Advantages:**
  - **Constant Time Performance ($O(1)$):** The database utilizes the B+ Tree index to jump directly to the cursor key without scanning discarded rows.
  - **Immune to Page Drift:** Adding or deleting rows does not alter the relative order of the remaining items.
- **Drawback:** Cannot jump to an arbitrary page number; only supports sequential forward and backward navigation (`next_cursor` / `prev_cursor`).
