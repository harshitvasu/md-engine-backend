# 📝 Markdown Engine CMS

A full-stack, lightweight Markdown Content Management System built with React and Node.js.

This project is a **flat-file CMS**—meaning there is no database setup required (no MongoDB, no SQL). All your data, sections, and metadata (like counters and completion status) are stored directly alongside your `.md` files in companion `.meta.json` files. Just clone it, drop in your markdown files, and start tracking your progress!

## ✨ Features

-   **📂 Smart File Explorer:** Nested, collapsible directory tree with real-time search filtering.
    
-   **✍️ Rich Text Editing:** Tiptap-powered editor with a floating formatting toolbar (supports GFM tables, lists, code blocks, etc.).
    
-   **📌 Section Tracking:** Break markdown files into sections. Mark sections as "Done" and track iterations with built-in counters.
    
-   **👀 Scroll-Spy Navigation:** The sidebar automatically highlights and tracks your current reading position as you scroll.
    
-   **🏷️ Custom Metadata:** Rename files with human-readable titles without altering the underlying raw file names.
    
-   **🚀 Zero-Database Setup:** Highly portable. Zip your `/md` folder and your entire workspace (including tracking metadata) moves with you.
    

## 🛠️ Tech Stack

**Frontend:**

-   React (Vite)
    
-   Tailwind CSS v4 (with `@tailwindcss/typography`)
    
-   Tiptap (Headless Rich Text Editor)
    
-   React Router DOM
    
-   Lucide React (Icons)
    

**Backend:**

-   Node.js & Express
    
-   Native `fs` (File System module)
    
-   `markdown-it` (Markdown to HTML)
    
-   `turndown` & `turndown-plugin-gfm` (HTML back to Markdown)
    
-   `cheerio` (HTML parsing)
    

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/?utm_source=gemini) (v18 or higher) installed on your machine.

### 1\. Clone the Repository

Bash

    git clone https://github.com/yourusername/markdown-engine.git
    cd markdown-engine
    

### 2\. Backend Setup

The backend serves the files, handles the markdown parsing, and updates the `.meta.json` files.

Bash

    # Navigate to the backend directory
    cd backend
    
    # Install dependencies
    npm install express markdown-it cheerio turndown turndown-plugin-gfm
    
    # Start the server (runs on port 4444)
    node server.js
    

_Note: Make sure there is an_ `md` _folder inside your backend directory (e.g.,_ `backend/md/`_). This is where all your files will be stored._

### 3\. Frontend Setup

Open a new terminal window/tab to start the React application.

Bash

    # Navigate to the frontend directory
    cd frontend
    
    # Install core dependencies
    npm install react-router-dom lucide-react
    
    # Install Tiptap editor dependencies
    npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell
    
    # Install Tailwind Typography (Tailwind v4 is assumed already configured via Vite)
    npm install @tailwindcss/typography
    
    # Start the Vite development server
    npm run dev
    

### 4\. Vite Proxy Configuration

Ensure your `vite.config.js` in the frontend is set to proxy API requests to the backend so you don't get CORS errors:

JavaScript

    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    import tailwindcss from '@tailwindcss/vite'
    
    export default defineConfig({
      plugins: [react(), tailwindcss()],
      server: {
        port: 3000,
        proxy: {
          '/api': 'http://localhost:4444'
        }
      }
    })
    

## 📁 Directory Architecture

How your data is stored on the backend:

Plaintext

    backend/
    ├── server.js
    └── md/                           <-- Your Root Storage
        ├── 2026/
        │   └── react-notes/
        │       ├── hooks-guide.md              <-- The raw Markdown file
        │       └── hooks-guide.md.meta.json    <-- Stores custom titles, checkboxes, and counters
        └── general-ideas.md
    

## 💡 How to Use

1.  **Access the App:** Open `http://localhost:3000` in your browser.
    
2.  **Create a File:** Click the floating `+` button in the bottom right of the explorer to create a new markdown file.
    
3.  **Edit Sections:** Click on a file. Click the pencil icon to enter Edit Mode. Use the toolbar to format text.
    
4.  **Track Progress:** Hover over sections in the left sidebar to mark them as done (check mark) or increment their counter (+).
    
5.  **Add Content:** Hover _between_ sections to reveal a hidden `+` button, allowing you to insert new blocks of text exactly where you want them.