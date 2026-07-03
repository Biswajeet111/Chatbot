# Premium Gemini AI Chatbot

A stunning, feature-rich, client-side web application powered directly by the **Google Gemini API**. It runs completely in the browser with **zero backend dependencies**, communicating directly with Google's API servers.

## Key Features

- **Interactive Glassmorphic Dark UI**: Modern dark theme using curated HSL color systems, responsive layouts, glowing gradients, custom scrollbars, and fluid collapsible sidebars.
- **Fast SSE Streaming Response**: Leverages the REST `streamGenerateContent` Server-Sent Events (SSE) endpoint to stream responses word-by-word.
- **Safe Local Storage Integration**: Stores your Gemini API Key and chat history strictly in your browser's `localStorage` for privacy and security.
- **Multi-Session Chat Threads**: Create, delete, select, and manage multiple chat histories dynamically.
- **Rich Markdown & Code Rendering**: Renders full markdown (headers, lists, tables, bold text, blocks) via `marked.js` with high-end syntax highlighting using `Prism.js` and built-in interactive **Copy Code** headers.
- **Voice Typing**: Talk to the chatbot directly using built-in Voice-to-Text dictation powered by the Web Speech API.
- **Text-to-Speech**: Listen to assistant responses read aloud using a custom premium TTS toggle.
- **Advanced Model Settings**: Customize your experience by selecting models (`gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`, `gemini-1.5-pro`), adjusting generation temperature, and setting custom **System Instructions**.
- **Chat Export**: Save and export complete conversations directly to local Markdown (`.md`) files.

## How to Get Started

### 1. Obtain a Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Log in with your Google account.
3. Click on **Get API Key** and create a new API key.

### 2. Run the Chatbot
Since the app is built entirely with client-side HTML, CSS, and vanilla JS, there is no build step or package installation required!

#### Option A: Direct Open (Double Click)
- Simply open the [index.html](index.html) file directly in any modern web browser (Chrome, Edge, Firefox, Safari).

#### Option B: Lightweight Local Server
To run a local web server (useful to ensure all browser APIs like Web Speech work optimally in some security environments):
- Using Python:
  ```bash
  python -m http.server 8000
  ```
  Then open `http://localhost:8000` in your browser.
- Using Node.js / npx:
  ```bash
  npx serve
  ```

### 3. Usage
1. When you first open the app, it will prompt you to set your API Key.
2. Click **Settings** (gear icon in the bottom-left), paste your Gemini API Key, select your model configuration, and click **Save Settings**.
3. Type a message in the input bar or use the Voice Dictation mic, then click **Send** or press `Enter` to start streaming!
