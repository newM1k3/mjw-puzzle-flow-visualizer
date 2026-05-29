# Escape Room Puzzle Flow Visualizer

A premium drag-and-drop canvas tool for escape room designers. Map your game's puzzle flow using industry-standard node types, connect them with animated edges, and export a clean, GM-ready PDF — all in the browser, no account required.

## What It Does

Unlike generic diagramming tools (Visio, Miro), this tool uses terminology and node shapes that escape room designers already know:

| Node | Shape | Meaning |
|------|-------|---------|
| **Starting Point** | Yellow circle | A prop or clue that begins a path |
| **Plugin Action** | Green square | Simple physical task — "green for go" |
| **Decode Action** | Red square | Brain work that slows teams down — "red for slow" |
| **Result** | Grey rounded rect | A gated prop or piece of info gained from an action |
| **Meta Puzzle** | Purple diamond | Convergence point requiring inputs from multiple paths |
| **Finale** | Blue bordered badge | The final escape state |

**Key interactions:**
- Drag any node from the left sidebar onto the canvas
- Draw connections between nodes by dragging from any handle
- Double-click a node's label to edit it inline (Enter to commit, Escape to cancel)
- Delete selected nodes or edges with the Delete key
- Zoom and pan freely; the canvas is infinite
- Export the entire canvas to a landscape PDF with one click

## Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Canvas engine | @xyflow/react (React Flow v12) |
| PDF export | html-to-image + jsPDF |
| Hosting | Netlify (static) |

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

No environment variables are required. This is a fully static app.

## Available Scripts

```bash
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # ESLint check
npm run typecheck  # TypeScript type check (no emit)
```

## Netlify Deployment

The `netlify.toml` at the project root configures everything automatically:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**No environment variables are needed** — deploy straight from the repository. Netlify will build and serve the static `dist/` folder.

## Current Limitations

- **No persistence** — the canvas state is not saved between browser sessions. Refreshing the page resets to the starter example flow.
- **No undo/redo** — there is no history stack yet.
- **No multi-user collaboration** — this is a single-user, single-tab tool.
- **PDF export captures the visible viewport** — very large flows may need to be zoomed out before exporting.

## Roadmap (v2)

- [ ] Local auto-save via `localStorage` so the canvas survives page refreshes
- [ ] Named flow management (save / load multiple flows)
- [ ] PocketBase cloud persistence for cross-device access (backend stub already present in `src/lib/pocketbase.ts`)
- [ ] Undo/redo history stack
- [ ] Custom edge labels (e.g. "requires key", "optional path")
- [ ] Flow validation — warn when a Finale node has no incoming path
- [ ] Dark/light theme toggle

## Project Structure

```
src/
  components/
    nodes/
      StartingPointNode.tsx   # Yellow circle
      PluginActionNode.tsx    # Green square
      DecodeActionNode.tsx    # Red square
      ResultNode.tsx          # Grey rounded rect
      MetaPuzzleNode.tsx      # Purple diamond
      FinaleNode.tsx          # Blue badge
      useNodeLabel.ts         # Shared inline-editing hook
    FlowCanvas.tsx            # React Flow canvas + drag-drop wiring
    Sidebar.tsx               # Node palette sidebar
  lib/
    pocketbase.ts             # PocketBase client stub (v2 readiness)
  utils/
    exportPdf.ts              # html-to-image + jsPDF export
  App.tsx                     # Root layout + toolbar
  main.tsx                    # Entry point
```

---

Part of the **MJW Personal App Platform**.
