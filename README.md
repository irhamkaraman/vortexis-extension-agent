<div align="center">

  <img src="public/icons/icon.svg" alt="VORTEXIS Logo" width="110" height="110" />

  # VORTEXIS
  ### Autonomous In-Browser AI Agent & Local RAG Copilot

  <p align="center">
    <strong>Take full autonomous control over web browsing workflows with in-memory RAG and lightning-fast DOM orchestration.</strong>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Manifest-V3-00F2FE?style=flat-square&logo=googlechrome&logoColor=black" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/SenseNova-6.8_Flash_Lite-7F00FF?style=flat-square" alt="SenseNova LLM" />
    <img src="https://img.shields.io/badge/Vite-CRXJS-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  </p>

</div>

---

## ⚡ Overview

**VORTEXIS** is a cutting-edge Chrome Extension (Manifest V3) designed to transform standard web browsing into an autonomous, AI-driven workspace. Embedded natively in the **Chrome SidePanel**, VORTEXIS ingests active webpage context using a client-side **Retrieval-Augmented Generation (RAG)** pipeline and converts natural language instructions into precise, deterministic DOM interactions (clicking, form filling, extraction, and navigation) via **SenseNova LLM** (`sensenova-6.8-flash-lite`).

---

## 🚀 Key Capabilities

* **🧠 In-Memory Browser-Side RAG:** Chunks, indexes, and queries active webpage content directly in-memory without sending raw DOM bloat across the wire.
* **🦾 Autonomous DOM Executor:** Synthetically triggers resilient user actions (`click`, `input`, `scroll`, `submit`) with built-in reactivity support for React/Vue dynamic forms.
* **⚡ SenseNova LLM Integration:** Optimized with OpenAI-compatible endpoints using ultra-fast structured JSON function/action planning.
* **🛡️ Modular Monolithic Architecture:** Strict separation of concerns (SoC), clean architecture boundaries, and Single Responsibility Principle (SRP) for enterprise-grade extensibility.
* **🔮 Cyberpunk Minimalist SidePanel:** Sleek, responsive, and distraction-free dark UI built with Tailwind CSS and Lucide icons.

---

## 🏗️ Architecture Blueprint

```text
vortexis-extension-agent/
├── manifest.json               # Manifest V3 specification
├── vite.config.ts              # CRXJS + Vite bundling configuration
├── src/
│   ├── background/             # Chrome Service Worker & tab routing
│   ├── content/                # DOM driver, interaction & extractors
│   ├── sidepanel/              # React SidePanel interface & logs
│   ├── core/                   # Domain types, config, and abstract ports
│   └── modules/
│       ├── ai/                 # SenseNova LLM client & structured planners
│       ├── rag/                # Client-side text chunking & vector search
│       └── dom-driver/         # Resilient event dispatchers & scrapers

```

---

## 🛠️ Getting Started

### Prerequisites

* Node.js `>= 18.x`
* npm or pnpm
* SenseNova API Key

### 1. Installation

```bash
# Clone the repository
git clone [https://github.com/irhamkaraman/vortexis-extension-agent.git](https://github.com/irhamkaraman/vortexis-extension-agent.git)

# Navigate into project directory
cd vortexis-extension-agent

# Install dependencies
npm install

```

### 2. Development & Build

```bash
# Run development mode with HMR
npm run dev

# Build extension for production
npm run build

```

### 3. Load Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the generated `dist/` directory.
4. Click the extensions puzzle icon, open the **Side Panel**, and activate **VORTEXIS**.

---

## 🔑 Configuration

1. Open the VORTEXIS side panel.
2. Insert your **SenseNova API Key** into the settings input.
3. Click **Index Page (RAG)** to vectorize the active tab.
4. Submit your autonomous goal and let VORTEXIS execute.

---

## 📄 License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).

```