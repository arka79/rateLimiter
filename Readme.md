# MongoDB-Based Rate Limiter

A simple rate-limiting system built using **Node.js, Express.js, and MongoDB** that controls the number of requests a client can make within a fixed time window.

This project implements the **Fixed Window Counter Algorithm** to restrict excessive requests to an API endpoint. It tracks requests based on the client's IP address and stores counters in MongoDB.

## Overview

Rate limiting is a technique used to control the frequency of requests sent to a server. It helps prevent excessive API usage, protects server resources, and reduces the impact of abuse or repeated requests.

This implementation allows a maximum of **5 requests per client IP address within a 60-second window**. Requests exceeding the limit are rejected with an HTTP `429 Too Many Requests` response.

## Features

- **Fixed Window Counter Algorithm** – limits requests within fixed time intervals.
- **IP-Based Tracking** – identifies clients using their IP address.
- **MongoDB Storage** – stores request counters and time-window information.
- **Atomic Counter Updates** – uses MongoDB's `$inc` operation to increment request counts.
- **Automatic Data Cleanup** – uses MongoDB TTL indexes to remove expired records.
- **HTTP Response Headers** – provides rate-limit information to clients.
- **Express Middleware** – makes the rate limiter reusable across endpoints.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Web server and API framework |
| MongoDB | Stores rate-limit counters |
| Mongoose | MongoDB object modeling |
| dotenv | Environment variable management |

## How It Works

The rate limiter follows these steps:

1. **Identify the client** – the client's IP address is used as the unique identifier.
2. **Determine the time window** – requests are grouped into fixed 60-second windows.
3. **Retrieve or create a counter** – MongoDB finds the client's record for the current window or creates one.
4. **Increment the counter** – the request count is increased using the atomic `$inc` operation.
5. **Check the limit** – if the count is greater than 5, the request is rejected.
6. **Allow or block** – requests within the limit are processed, while excess requests receive HTTP 429.
7. **Clean up expired records** – MongoDB's TTL index automatically removes expired counter documents.

## Algorithm: Fixed Window Counter

The Fixed Window Counter Algorithm divides time into fixed intervals. Each client has a request counter for the current interval.

For this implementation:

- **Request limit:** 5 requests
- **Window duration:** 60 seconds
- **Identifier:** Client IP address

Each request increments the counter for its current time window. When a new window begins, a new counter is used.

### Example

| Request | Counter | Response |
|---|---:|---|
| 1 | 1 | 200 OK |
| 2 | 2 | 200 OK |
| 3 | 3 | 200 OK |
| 4 | 4 | 200 OK |
| 5 | 5 | 200 OK |
| 6 | 6 | 429 Too Many Requests |

The first five requests are allowed. The sixth request is blocked because it exceeds the configured limit.

## Data Model

MongoDB stores each client's rate-limit information as a document.

### Sample Document

```json
{
  "clientId": "127.0.0.1",
  "windowStart": "2026-11-24T19:20:00.000Z",
  "count": 4,
  "expiresAt": "2026-11-24T19:21:00.000Z"
}
```

### Fields

| Field | Description |
|---|---|
| `clientId` | Identifies the client, currently using its IP address |
| `windowStart` | Starting timestamp of the fixed window |
| `count` | Number of requests made in the current window |
| `expiresAt` | Expiration timestamp for automatic cleanup |

### Indexes

- **Compound unique index:** `{ clientId: 1, windowStart: 1 }` ensures a client has a unique counter record for a particular window.
- **TTL index:** `{ expiresAt: 1 }` with `expireAfterSeconds: 0` allows MongoDB to automatically delete expired documents.

## Project Structure

```text
rl/
├── src/
│   ├── server.js
│   ├── mongo.js
│   └── rateLimiter.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

| File | Purpose |
|---|---|
| `server.js` | Initializes Express, connects to MongoDB, and defines API routes |
| `mongo.js` | Handles the MongoDB connection |
| `rateLimiter.js` | Implements the rate-limiting middleware and data model |
| `.env` | Stores environment configuration |
| `.gitignore` | Prevents sensitive files and dependencies from being committed |

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/mongodb-rate-limiter.git
cd mongodb-rate-limiter
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
PORT=8000
MONGODB_URI=mongodb://127.0.0.1:27017/rateLimiterDB
```

Ensure MongoDB is running locally before starting the application.

### 4. Start the server

```bash
npm start
```

Expected output:

```text
MongoDB connected successfully
Server running on http://localhost:8000
```

## API Endpoints

### Health Check

| Property | Value |
|---|---|
| Endpoint | `/` |
| Method | GET |
| Purpose | Checks whether the application is running |

Example:

```bash
curl http://localhost:8000/
```

Expected response:

```json
{
  "success": true,
  "message": "MongoDB Rate Limiter is running"
}
```

### Rate-Limited Endpoint

| Property | Value |
|---|---|
| Endpoint | `/api/test` |
| Method | GET |
| Limit | 5 requests |
| Time window | 60 seconds |

Example:

```bash
curl -i http://localhost:8000/api/test
```

Successful response:

```json
{
  "success": true,
  "message": "Request allowed"
}
```

Blocked response:

```json
{
  "success": false,
  "message": "Rate limit exceeded. Try again in the next window.",
  "limit": 5,
  "remaining": 0
}
```

## Rate Limit Response Headers

The API returns the following headers:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Maximum allowed requests |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `X-RateLimit-Reset` | Unix timestamp at which the current window ends |

## Testing

### Test a single request

```bash
curl -i http://localhost:8000/api/test
```

### Test the rate limit

Run six requests quickly:

```bash
for i in {1..6}; do curl -i http://localhost:8000/api/test; done
```

### Expected behavior

- Requests 1–5 should return HTTP `200 OK`.
- Request 6 should return HTTP `429 Too Many Requests`.
- MongoDB should contain a counter document for the client.
- The request counter should increment for each request.
- Expired records should eventually be deleted by the TTL index.

## Advantages

- Simple and easy-to-understand algorithm.
- Efficient counter updates using MongoDB atomic operations.
- Persistent counter storage.
- Automatic cleanup of expired documents.
- Suitable for small APIs and educational demonstrations.

## Limitations

- Fixed windows can allow bursts of requests around window boundaries.
- IP-based identification may treat multiple users behind the same network as one client.
- TTL deletion is asynchronous and may not occur exactly at the expiration time.
- This implementation is intended as a demonstration and is not yet designed for distributed production-scale rate limiting.

## Future Improvements

- Support user-based or API-key-based rate limiting.
- Implement Sliding Window or Token Bucket algorithms.
- Add configurable limits for different API endpoints.
- Add dashboard-based monitoring and analytics.
- Improve handling of concurrent requests during initial record creation.
- Support distributed deployments.

## Conclusion

This project demonstrates how a Fixed Window Counter rate limiter can be implemented using Node.js, Express.js, and MongoDB. By tracking client requests and enforcing a predefined limit within a time window, it provides a basic mechanism for controlling API traffic.

The implementation combines middleware-based request handling, MongoDB atomic operations, indexed data storage, and automatic document expiration to demonstrate the fundamental concepts of rate limiting.

## Author

**Arka Kuilya**

GitHub Repository: https://github.com/arka79/rateLimiter.git
