# NATIVCODEX_PROJECT_MANIFEST [INTERNAL_ONLY]
## VERSION: 2.1_STABLE
## LAST_SYNC: 2025-12-29

### 1. PROJECT_OVERVIEW
NativeCodeX is a sovereign gaming ecosystem designed for the technically elite. It merges high-fidelity competitive gaming with a hacker-themed administrative interface, powered by Google Gemini AI and Firebase-ready infrastructure.

### 2. CORE_MODULES (FEATURES)
- **NEXUS (Home)**: Central hub for matchmaking and system status. Features a simulated VPN-tunneled matchmaking sequence.
- **ARENA (Tournaments)**: Real-time registration system for global eSports operations.
- **STUDIO (Content Operations)**: VOD ingestion and live-streaming command center with integrated AI content gating.
- **SHADOW_MARKET (Marketplace)**: Decentralized asset exchange for cosmetics and functional HUD overlays.
- **HALL_OF_FAME (Leaderboards)**: Global operator ranking system with win-rate efficiency tracking.
- **AI_SHELL (Assistant)**: Terminal-based interface for monetization strategy, grounded in real-time Google Search data.

### 3. TECHNICAL_STACK
- **Frontend**: React 19.x (ESM modules)
- **Styling**: Tailwind CSS + Custom Cyberpunk Design System
- **Icons**: Lucide-React (Vector protocol)
- **AI Engine**: @google/genai (Gemini 3 Flash/Pro)
- **Backend Architecture**: Firebase SDK (Initialized for Auth, Firestore, and Cloud Storage)
- **State Management**: Reactive Hooks with Persistent Local Storage Bridge

### 4. AI_PROTOCOLS & SERVICES
The platform utilizes **Gemini 3 Flash Preview** across three primary vectors:

| Protocol | Service Function | Implementation |
| :--- | :--- | :--- |
| **CONTENT_GUARD** | `moderateContent` | Scans VOD titles/descriptions to enforce strictly gaming-only content. |
| **MARKET_GROUNDING** | `analyzeMonetization` | Uses `googleSearch` tool to provide live advice on gaming trends and prize pools. |
| **IDENTITY_MANIFEST** | `generateGamerArchetype` | Analyzes user interests to generate unique "Hacker Archetypes" and bios. |

### 5. BACKEND_MESH (BACKEND_SERVICE.TS)
The project implements a **High-Fidelity Firebase Simulation** that is drop-in ready for production project keys:
- **Auth Service**: Manages Google OAuth handshakes and identity session persistence via `AUTH_SESSION_KEY`.
- **Database Service**: Simulated Firestore collections for `users`, `audit_logs`, and `market_assets`.
- **Storage Service**: Asset ingestion logic with real-time progress callbacks for VOD uploads.
- **Sync Protocol**: Uses a `CloudMesh` helper to ensure data persistence across local browser nodes.

### 6. RECENT_ENHANCEMENTS
- **V2.0 Integration**: Added full Firebase SDK support and Google OAuth UI components.
- **Search Grounding**: Integrated Google Search into the AI Shell for real-world competitive intelligence.
- **Audit Logging**: Implemented a persistent "Manifest Audit Log" in the Studio to track AI moderation decisions.
- **UI Optimization**: Refactored the Layout to include a "Live Rail" for active stream nodes.

### 7. METHODS_SUMMARY
- **`syncToCloudMesh(data)`**: Core persistence method for local data synchronization.
- **`backendService.uploadAsset(file, onProgress)`**: Simulates multi-part cloud storage uploads.
- **`analyzeMonetization(query, stats)`**: Advanced AI grounding method utilizing the Gemini search tool config.
- **`moderateContent(title, desc)`**: Automated JSON-response parsing for real-time content filtering.

### 8. SECURITY_NOTICE
This manifest is a private technical document. All nodes must maintain credential isolation. Google Search Grounding is restricted to Admin-tier sessions.
