# Frontend Integration Guide

## Steps to add Assistronaut to the React frontend

### 1. Copy components and services

Copy the components into your `src/components/` and the service into `src/services/`:

```bash
# From the Assistronaut directory:
cp frontend/src/components/AssistronautChat.jsx ../nasa-health-system/frontend/src/components/
cp frontend/src/components/AssistronautWidget.jsx ../nasa-health-system/frontend/src/components/
cp frontend/src/services/assistronaut.js ../nasa-health-system/frontend/src/services/
```

### 2. Option A: Dedicated Chat Page Route (Recommended)

In `nasa-health-system/frontend/src/App.jsx`:

```jsx
import AssistronautChat from './components/AssistronautChat';

// Inside your router <Routes>:
<Route path="/assistronaut" element={<AssistronautChat />} />
```

Then in `Navbar.jsx`, add a link:

```jsx
<Link to="/assistronaut" className="hover:text-sky-400 flex items-center gap-1">
  🚀 Assistronaut
</Link>
```

### 3. Option B: Floating Widget on All Pages

If you want an expandable chat bubble at the bottom-right of every page:

In `App.jsx` (or main layout wrapper):

```jsx
import AssistronautWidget from './components/AssistronautWidget';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Existing navigation and page routes */}
      <Navbar />
      <Routes>
        {/* ... existing routes ... */}
      </Routes>

      {/* Floating Assistronaut Health Widget */}
      <AssistronautWidget />
    </div>
  );
}
```

### 4. API Configuration

The service in `src/services/assistronaut.js` communicates with:
`http://localhost:8000/api/assistronaut/`

If your Django backend runs on another host or port, adjust `API_BASE_URL` in `src/services/assistronaut.js` or define `VITE_ASSISTRONAUT_API_URL` in your `.env`.

### 5. Styling

Both `AssistronautChat.jsx` and `AssistronautWidget.jsx` are styled exclusively with **Tailwind CSS** classes with a dark space-grade theme (`bg-slate-950`, `text-sky-400`, etc.). No external CSS dependencies or icon libraries are required.
