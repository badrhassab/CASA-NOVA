# Assistronaut – Frontend Integration Guide (React + TypeScript)

This guide explains how to add the Assistronaut AI companion UI into your React + TypeScript (`.tsx`) frontend with **zero merge conflicts**.

---

## 1. Zero-Conflict Architecture

- **Self-contained components**: All components live in their own `.tsx` files and don't overwrite any of your existing components.
- **Typed with TypeScript**: Fully typed interfaces in `types/assistronaut.ts` matching your Supabase database schema (destinations, missions, astronauts, biometrics, ECLSS).
- **Tailwind CSS styled**: Pre-styled with a dark space-grade sci-fi aesthetic using standard Tailwind classes. No custom CSS imports or external UI library dependencies needed.
- **Customizable**: Teammates can freely adjust colors, layout, avatars, or add animations to suit your application's design system.

---

## 2. Drop-in Steps

### Step 1: Copy files to your frontend `src/`

Copy the files from `frontend/src/` into your React project:

```bash
# 1. Types
cp Assistronaut/frontend/src/types/assistronaut.ts your-frontend/src/types/

# 2. API Service
cp Assistronaut/frontend/src/services/assistronaut.ts your-frontend/src/services/

# 3. Components
cp Assistronaut/frontend/src/components/AssistronautChat.tsx your-frontend/src/components/
cp Assistronaut/frontend/src/components/AssistronautWidget.tsx your-frontend/src/components/
```

### Step 2: Install dependencies (if not already installed)

Assistronaut service uses `axios` for HTTP requests:

```bash
npm install axios
```

*(Ensure Tailwind CSS is configured in your project).*

### Step 3: Choose Integration Pattern

You have two ready-to-use options:

#### Option A: Dedicated Full-Page Route (`AssistronautChat.tsx`)
Adds a comprehensive command-center chat view with real-time astronaut telemetry sidebar and source citation badges.

In your `App.tsx` router:

```tsx
import { Route, Routes } from 'react-router-dom';
import { AssistronautChat } from './components/AssistronautChat';

// In your router:
<Routes>
  {/* Your existing routes ... */}
  <Route path="/assistronaut" element={<AssistronautChat />} />
</Routes>
```

Add a link in your navigation bar:
```tsx
<Link to="/assistronaut" className="text-sky-400 hover:text-sky-300 font-medium">
  🚀 AI Companion
</Link>
```

#### Option B: Floating Widget on Every Screen (`AssistronautWidget.tsx`)
Adds a floating astronaut bubble in the bottom-right corner of every screen that expands into a conversational modal.

In your root layout or `App.tsx`:

```tsx
import { AssistronautWidget } from './components/AssistronautWidget';

export function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Existing navigation and page routes */}
      <Navbar />
      <Routes>
        {/* ... existing routes ... */}
      </Routes>

      {/* Floating Assistronaut AI Companion */}
      <AssistronautWidget />
    </div>
  );
}
```

---

## 3. Passing Live Supabase Astronaut Data

Both `AssistronautChat` and `AssistronautWidget` accept optional props:

```tsx
<AssistronautChat astronautId={currentUser.astronaut_id} />
```

Or pass the full `astronaut` object if your frontend state already loaded it:

```tsx
<AssistronautChat astronaut={liveAstronautData} />
```

If neither prop is provided, Assistronaut will query Django which automatically fetches the active astronaut from Supabase!

---

## 4. Frontend Environment Variables

By default, the service connects to `http://localhost:8000/api/assistronaut`.

If your Django backend is deployed or running on another port, set this in your `.env`:

```env
VITE_ASSISTRONAUT_API_URL=http://localhost:8000/api/assistronaut
```
