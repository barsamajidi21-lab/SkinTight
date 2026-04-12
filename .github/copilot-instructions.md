# AI Agent Instructions for SkinTight

## Project Overview
SkinTight is a Firebase-based web application (currently in early setup phase). The project uses Firebase v12.11.0 for backend services with a minimal static HTML frontend structure.

**Current State**: Bootstrap phase with minimal source code. Most implementation remains to be completed.

## Architecture & Major Components

### Technology Stack
- **Backend**: Firebase (Realtime Database, Authentication, Hosting, or Cloud Functions)
- **Frontend**: Static HTML with JavaScript (index.html in public/)
- **Dependencies**: Firebase SDK only

### Project Structure
```
public/               # Served as static assets (Firebase Hosting)
  index.html         # Entry point (currently empty)
package.json         # Node dependencies (Firebase SDK)
```

## Critical Developer Workflows

### Setup & Dependencies
```bash
npm install          # Installs Firebase SDK
```

### Firebase Integration
- All backend operations use the Firebase SDK imported from `node_modules/firebase`
- Configuration (API keys, project ID) should be embedded or loaded from environment variables
- No backend API layer exists yet - direct Firebase client SDK usage pattern expected

### Build & Deployment
- **Frontend**: Static files in `public/` are served directly by Firebase Hosting
- **No build process defined**: index.html is currently empty - needs implementation
- Firebase CLI not configured in package.json

## Project-Specific Patterns & Conventions

### Firebase Integration Pattern
When adding Firebase features:
1. Import from `firebase/app` for core functionality
2. Import feature modules (auth, database, etc.) from `firebase/<feature>`
3. Initialize Firebase client before using services
4. Handle async operations with promises or async/await

**Example**: 
```javascript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
// Initialize and use services
```

### Current Gaps to Address
- **No application code**: `public/index.html` is empty - implement the UI here
- **No Firebase config**: Will need firebaseConfig object (typically from Firebase Console)
- **No env management**: Consider `.env` or `.env.local` for sensitive configs
- **No build tooling**: Consider Vite, webpack, or similar if SPA features are needed

## Key Integration Points

### Firebase Services (Likely Used)
- **Realtime Database** or **Firestore**: Data persistence
- **Authentication**: User management
- **Hosting**: Deployment platform (already configured for `public/` folder)

### External Dependencies
- Only Firebase SDK v12.11.0 - no other npm dependencies

## Development Guidelines

1. **Bootstrap the Frontend**: Start by adding content to `public/index.html`
2. **Configure Firebase**: Add firebaseConfig initialization before using any Firebase services
3. **Security**: Store sensitive configs in environment variables, never commit to repo
4. **Testing**: No test framework configured yet - consider Jest or Vitest if needed
5. **Code Organization**: As features grow, consider splitting code into modules within `public/` or a separate `src/` directory

## Useful Commands
```bash
npm install                    # Install dependencies
firebase login                # Authenticate with Firebase CLI
firebase deploy               # Deploy to Firebase Hosting
firebase emulators:start      # Run local Firebase emulator suite
```

---
**Last Updated**: April 2026 | **Version**: 1.0
