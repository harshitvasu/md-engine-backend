# 3. Networking

---

### 3.1 What happens when you enter a URL in a browser?

The complete end-to-end journey from keystroke to rendered pixel:

1. **URL Parsing & Protocol Identification:**
   - The browser parses the input URL (e.g., `https://api.example.com/v1/orders`) into its components: protocol (`https`), hostname (`api.example.com`), default port (`443`), and resource path (`/v1/orders`).
2. **DNS Resolution (Resolving Domain to IP):**
   - The browser checks hierarchical caches in sequence: Browser cache $\to$ OS DNS cache (hosts file) $\to$ Local router cache $\to$ ISP Recursive DNS Resolver.
   - If not cached, the Recursive Resolver queries the root servers (`.`), the TLD servers (`.com`), and finally the domain’s Authoritative Nameservers to retrieve the corresponding IP address (e.g., `93.184.216.34`).
3. **TCP Three-Way Handshake:**
   - The client initiates a TCP connection to the resolved server IP on port 443 via SYN $\to$ SYN-ACK $\to$ ACK.
4. **TLS/SSL Handshake (Securing the Channel):**
   - **ClientHello:** Sends supported TLS version, cipher suites, and a random number.
   - **ServerHello:** Server selects cipher suite, presents its X.509 Digital Certificate (containing its public key), and sends a server random number.
   - **Validation:** Browser validates certificate authenticity against trusted root Certificate Authorities (CAs).
   - **Key Exchange (Diffie-Hellman / ECDHE):** Client and server derive a shared symmetric **Session Key**, encrypting all subsequent application traffic.
5. **HTTP Request Generation & Transmission:**
   - The browser constructs the HTTP request (Method: `GET`, Headers: `Host`, `User-Agent`, `Accept`, Cookies) and transmits it over the encrypted TLS tunnel.
6. **Network Routing & Server Processing:**
   - Packets traverse routers and switches over IP.
   - Reaches the server infrastructure: DNS routing $\to$ Anycast / Cloudflare CDN $\to$ Web Application Firewall (WAF) $\to$ Reverse Proxy / Load Balancer (Nginx/HAProxy) $\to$ API Gateway $\to$ Application Microservice.
   - The backend service processes business logic, queries databases or caches, and constructs an HTTP response.
7. **HTTP Response & Browser Rendering Pipeline:**
   - Server returns response code (e.g., `200 OK`), response headers (`Content-Type: text/html`), and payload body.
   - **DOM Construction:** Browser parses raw HTML bytes into DOM tokens and builds the DOM Tree.
   - **CSSOM Construction:** Parses CSS rules into the CSS Object Model.
   - **Render Tree:** Combines DOM and CSSOM, ignoring hidden elements (`display: none`).
   - **Layout (Reflow):** Calculates the exact geometric coordinates and bounding boxes of every visible node on the screen.
   - **Paint & Composite:** Converts nodes into pixels across layers and composites them to the GPU frame buffer.

---

### 3.2 Difference between TCP and UDP

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection State** | **Connection-Oriented:** Requires explicit handshake (SYN, SYN-ACK, ACK) and teardown (FIN/RST). | **Connectionless:** Transmits standalone datagrams immediately without establishing a prior session. |
| **Reliability** | **Guaranteed Delivery:** Every packet is acknowledged. Lost packets are detected via timeouts and retransmitted. | **Best-Effort Delivery:** No acknowledgments; dropped packets are discarded without retransmission. |
| **Ordering** | **Strictly In-Order:** Packets carry sequence numbers; receiver reassembles them in original order. | **Unordered:** Packets can arrive out-of-order, duplicated, or not at all. |
| **Flow & Congestion Control** | Features **Sliding Window** (flow control) and **Congestion Avoidance** (Slow Start, AIMD) algorithms. | **None:** Transmits at arbitrary rates dictated by application; can overwhelm network links. |
| **Header Overhead** | Heavier: 20 bytes minimum (up to 60 bytes with options). | Lightweight: Fixed 8-byte header. |
| **Primary Use Cases** | Web traffic (HTTP/1.1, HTTP/2), File Transfer (FTP/SFTP), SSH, Email (SMTP), Relational Database connections. | Real-time gaming, Voice over IP (VoIP), live video streaming, DNS lookups, HTTP/3 (QUIC). |

---

### 3.3 Explain the TCP three-way handshake

The three-way handshake establishes a reliable, bidirectional stream connection between a client and server, synchronizing Initial Sequence Numbers (ISNs) and allocating buffer resources:

```
    Client                                     Server
       |                                          |  LISTEN
       | -------- 1. SYN (seq = X) -------------> |  SYN_RCVD
SYN_SENT|                                         |
       | <--- 2. SYN-ACK (seq = Y, ack = X+1) --- |
ESTABLISHED                                      |
       | -------- 3. ACK (seq = X+1, ack = Y+1) ->|  ESTABLISHED
```

1. **Step 1 — SYN (Synchronize):**
   - The client selects a random 32-bit Initial Sequence Number ($X$) and sends a segment with the `SYN` flag set to the server.
   - Client transitions to the `SYN_SENT` state.
2. **Step 2 — SYN-ACK (Synchronize-Acknowledge):**
   - The server receives the SYN packet, allocates socket buffers, selects its own random Initial Sequence Number ($Y$), and sets the acknowledgment field to $X + 1$.
   - It transmits a packet with both `SYN` and `ACK` flags set.
   - Server transitions to the `SYN_RCVD` state.
3. **Step 3 — ACK (Acknowledge):**
   - The client receives the SYN-ACK, confirms the server acknowledged its sequence number, and responds with an `ACK` packet where `seq = X + 1` and `ack = Y + 1`.
   - Client and server both transition to the `ESTABLISHED` state. Data transfer can now commence.

---

### 3.4 Difference between HTTP and HTTPS

| Dimension | HTTP (HyperText Transfer Protocol) | HTTPS (HTTP Secure) |
| :--- | :--- | :--- |
| **Security Layer** | Transmits cleartext data directly over unencrypted TCP. | Encapsulates HTTP payloads within an encrypted **TLS (Transport Layer Security)** tunnel. |
| **Default Port** | Port **80** | Port **443** |
| **Confidentiality & Eavesdropping** | Vulnerable to packet sniffing, Man-in-the-Middle (MitM) inspection, and ISP injection. | Fully encrypted using symmetric cipher algorithms (AES-GCM, ChaCha20); data cannot be read by intermediaries. |
| **Data Integrity** | No verification; packets can be modified or forged in transit without detection. | Cryptographic Message Authentication Codes (HMAC) guarantee that payloads have not been tampered with. |
| **Authentication** | No identity verification of the server. | Requires a verified digital **X.509 Certificate** signed by a trusted CA, proving the server's identity. |
| **Performance** | Zero encryption overhead; immediate connection. | Requires initial TLS handshake (1-2 network RTTs; 0-RTT in TLS 1.3 resumption) and lightweight CPU crypto processing. |

---

### 3.5 What is DNS?

The Domain Name System (DNS) is the globally distributed, hierarchical naming database that translates human-memorable hostnames (such as `api.zoomcar.com`) into computer-routable IP addresses (such as `52.76.12.89` or `2606:4700::6810`).

#### Hierarchical DNS Architecture:
1. **Root Nameservers (`.`):** 13 logical root server clusters worldwide that direct queries to appropriate TLD servers.
2. **Top-Level Domain (TLD) Nameservers:** Manage domain suffixes (`.com`, `.org`, `.net`, `.io`).
3. **Authoritative Nameservers:** Final authority holding actual DNS records configured by the domain owner (e.g., Route 53, Cloudflare).

#### Common DNS Record Types:
- **A Record:** Maps a hostname to an IPv4 address.
- **AAAA Record:** Maps a hostname to an IPv6 address.
- **CNAME (Canonical Name):** Maps an alias name to another canonical domain name (e.g., `www.example.com` $\to$ `example.com`).
- **MX (Mail Exchange):** Directs email to responsible mail exchange servers.
- **TXT Record:** Holds arbitrary text data (widely leveraged for domain ownership verification, SPF, DKIM, and DMARC email security).
- **NS (Name Server):** Specifies the authoritative nameservers for a domain zone.

---

### 3.6 What is a reverse proxy and load balancer?

#### Reverse Proxy:
A server that sits in front of internal web servers, intercepting incoming client requests and forwarding them to appropriate backend instances:
- **Key Functions:**
  - **SSL/TLS Termination:** Offloads CPU-intensive cryptographic handshakes from application servers.
  - **Security & Obfuscation:** Hides internal network architecture, IP topologies, and microservice ports from the public internet.
  - **Static Asset Caching & Compression:** Serves cached images/assets and compresses responses (gzip/brotli).
  - **Centralized Routing:** Directs requests based on URI path (e.g., `/api/v1/users` $\to$ User Service). Examples: Nginx, Traefik, Envoy.

#### Load Balancer:
A specialized reverse proxy specifically designed to distribute traffic across a horizontal pool of application servers to maximize throughput, minimize response latency, and prevent single-point-of-failure outages.
- **Layer 4 vs. Layer 7 Load Balancing:**
  - **Layer 4 (Transport):** Operates on IP and TCP/UDP ports without inspecting application layer data (extremely fast, low CPU; e.g., AWS NLB).
  - **Layer 7 (Application):** Inspects HTTP headers, cookies, and URI paths to make smart routing decisions (e.g., AWS ALB, Nginx).
- **Core Algorithms:** Round Robin, Weighted Round Robin, Least Connections, IP Hash / Sticky Sessions.

---

### 3.7 What is CORS?

Cross-Origin Resource Sharing (CORS) is a **browser-enforced security standard** governed by the **Same-Origin Policy (SOP)**. Under SOP, a web page running on Origin A (`http://frontend.com:3000`) is blocked from reading data retrieved via AJAX/fetch requests from Origin B (`https://api.backend.com:8080`), unless Origin B explicitly returns HTTP headers authorizing Origin A.

*An origin is defined as the tuple: `(Protocol, Domain, Port)`.*

#### How CORS Works:
1. **Simple Requests (`GET`, `POST`, `HEAD` with standard headers):**
   - The browser attaches an `Origin: http://frontend.com:3000` header to the outgoing request.
   - If the server permits it, it responds with:
     `Access-Control-Allow-Origin: http://frontend.com:3000` (or `*`).
2. **Preflight Requests (`OPTIONS`):**
   - For non-simple requests (methods like `PUT`, `DELETE`, `PATCH` or custom headers like `Authorization: Bearer <token>`), the browser automatically dispatches an `OPTIONS` preflight request first:
     ```http
     OPTIONS /orders HTTP/1.1
     Origin: http://frontend.com:3000
     Access-Control-Request-Method: PUT
     Access-Control-Request-Headers: Authorization, Content-Type
     ```
   - The server evaluates the preflight and replies with permissions:
     ```http
     HTTP/1.1 204 No Content
     Access-Control-Allow-Origin: http://frontend.com:3000
     Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
     Access-Control-Allow-Headers: Authorization, Content-Type
     Access-Control-Max-Age: 86400
     ```
   - Only upon receiving preflight approval does the browser execute the actual `PUT` request.

> **Note:** CORS is strictly a client-side browser barrier. Direct server-to-server HTTP calls (e.g., via cURL, Postman, or backend microservices) do not enforce CORS.

---

### 3.8 What are WebSockets?

WebSocket is an advanced communication protocol providing **full-duplex, bidirectional, persistent communication channels** over a single long-lived TCP connection (`ws://` or encrypted `wss://`).

#### How it Works (The Upgrade Handshake):
1. The client initiates a standard HTTP GET request with an explicit `Upgrade` request:
   ```http
   GET /chat HTTP/1.1
   Host: server.example.com
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
   Sec-WebSocket-Version: 13
   ```
2. If supported, the server returns an HTTP status `101 Switching Protocols`:
   ```http
   HTTP/1.1 101 Switching Protocols
   Upgrade: websocket
   Connection: Upgrade
   Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
   ```
3. The underlying TCP socket remains open, switching immediately to the lightweight WebSocket framing protocol.

#### Comparison with HTTP:
- **HTTP:** Request-response and client-driven. Server cannot push data unless the client polls (Short Polling or Long Polling), incurring huge header overhead per request.
- **WebSocket:** Either client or server can emit framed messages at any time. Frames carry only a tiny 2 to 10-byte header overhead.
- **Ideal Use Cases:** Live chat systems, collaborative whiteboard tools (Figma), stock market ticker streams, real-time vehicle GPS tracking dashboards, multiplayer gaming.
