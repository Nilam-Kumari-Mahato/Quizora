# 🎯 Quizora

Quizora is a real-time quiz platform designed for fair and time-bound assessments.  
It uses server-driven timer logic to prevent client-side manipulation and ensures consistency across all users.

---

## 🚀 Features

- ⏱️ Server-controlled quiz timer
- 🔐 Authentication with Clerk
- ⚡ Real-time backend with Convex
- 📊 Accurate submission & auto-timeout handling
- 🌐 Open-source & contributor-friendly

---

## 🧩 Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS

### Backend
- Convex (real-time database + server logic)
- Clerk (authentication & user management)

### Tooling
- Node.js
- Vite
- ESLint + Prettier
- Vercel

---
## 🎨 Frontend Development Guidelines

Quizora’s frontend is built with **React, TypeScript, and Tailwind CSS**, and follows a clean separation between UI, state, and backend logic.

### Key Principles

- **Frontend is not a source of truth**
  - Quiz timing, submissions, and validation are handled server-side
- UI components should remain **stateless where possible**
- All backend interactions go through Convex functions
- Authentication state is derived from Clerk only

---

### Environment Awareness

The frontend relies on `VITE_` prefixed environment variables:

- `VITE_CONVEX_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`

These values differ between local and production environments.

> ⚠️ Never hardcode URLs, keys, or environment-specific values in components.

### State Management

- Local UI state → React hooks
- Server state → Convex queries & mutations
- Avoid duplicating backend state on the client

---

## 🧠 Core Backend Logic (Server-Authoritative & Passive Timer)

Quizora uses a **server-authoritative but passive timer model**—the server defines strict time boundaries but doesn't actively force-submit answers.

### How it works:

1. **Server-Defined Time Window**: When a question starts, the backend stores `currentQuestionStartTime` and `currentQuestionEndTime` as the official time window.

2. **Passive System**: The server doesn't run active timers. If time expires without a submission, no answer is recorded.

3. **Submission Validation**: When a player submits, the client sends `client_timestamp`. The server validates it against `currentQuestionEndTime`.

4. **Grace Period & Late Penalty**:
   - **5-second grace period** accounts for network latency
   - **Late submissions** (after deadline + grace) are marked as incorrect (`is_correct: false`), regardless of answer content

### Why this approach?

✅ **Security**: Prevents browser refresh cheating and clock manipulation  
✅ **Efficiency**: No overhead of managing active timers for thousands of users  
✅ **Robustness**: Time window remains authoritative even after disconnects

---

## 📦 Environment Variables

Create a `.env.local` file using `.env.example`:

```env
# Convex
CONVEX_DEPLOYMENT=your_convex_deployment
VITE_CONVEX_URL=your_convex_url

# Clerk Authentication
CLERK_ISSUER_URL=your_clerk_issuer_url
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# ImageKit (for media storage)
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint

```

## 🛠️ Local Development Setup

### 1️⃣ Clone & Install

```bash
git clone https://github.com/your-org/quizora.git
cd quizora
npm install
```

### 2️⃣ Setup Services

> **Important**: Each contributor must use their own service accounts. See [Service Isolation Policy](#-service-isolation--local-development-policy) below.

#### **Convex** (Database & Backend)
```bash
npx convex dev
```
This generates required Convex files locally and provides your `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL`.

#### **Clerk** (Authentication)
1. Create a free account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy `CLERK_ISSUER_URL` and `VITE_CLERK_PUBLISHABLE_KEY` from the dashboard

#### **ImageKit** (Media Storage)
1. Create a free account at [imagekit.io](https://imagekit.io)
2. Get your credentials from the dashboard:
   - `IMAGEKIT_PUBLIC_KEY`
   - `IMAGEKIT_PRIVATE_KEY`
   - `IMAGEKIT_URL_ENDPOINT`

### 3️⃣ Configure Environment

Create `.env.local` and add all credentials (see [Environment Variables](#-environment-variables) section).

### 4️⃣ Run the App

```bash
npx convex dev
```
Open new terminal and run

```bash
npm run dev
```

App will be available at: 👉 **http://localhost:8080**

---

## 🔒 Service Isolation & Local Development Policy

**Each contributor must use their own service accounts** for Convex, Clerk, and ImageKit.

**Why?**  
✅ Prevents accidental data leaks  
✅ Avoids billing abuse or quota exhaustion  
✅ Ensures safe, isolated development environments  
✅ Follows industry-standard open-source practices

**What this means:**
- Your local data is **fully isolated** from production
- Images, users, and quiz data created locally **won't appear in production**
- Production credentials are **never shared** publicly

> 🔐 **Never commit real credentials or reuse production service keys for local development.**

## 🤝 Contributing

We welcome contributions of all kinds!

Please read CONTRIBUTING.md
 before submitting a pull request.