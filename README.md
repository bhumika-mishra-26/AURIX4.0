<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6E56CF,100:009688&height=200&section=header&text=AURIX&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Agentic%20Unified%20Risk%20Intelligence%20Platform&descAlignY=58&descSize=20" width="100%"/>

<img src="https://readme-typing-svg.demolab.com/?font=Fira+Code&weight=600&size=20&duration=2800&pause=900&color=636EF1&center=true&vCenter=true&width=760&lines=Don't+alert+me+%E2%80%94+prove+it.;Red+Agent+exploits.+Blue+Agent+patches.;Zero-false-positive%2C+self-healing+AppSec." />

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express-API-000000?style=for-the-badge&logo=express&logoColor=white)](#)
[![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](#)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestration-6E56CF?style=for-the-badge)](#)
[![Docker](https://img.shields.io/badge/Docker-%2B%20gVisor-2496ED?style=for-the-badge&logo=docker&logoColor=white)](#)
[![Supabase](https://img.shields.io/badge/Supabase-DB%20%2B%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](#)
[![License](https://img.shields.io/badge/License-MIT-lightgrey?style=for-the-badge)](#)

</div>

## 📖 Contents

[What is AURIX](#-what-is-aurix) • [Project Description](#-project-description) • [Modules at a Glance](#-modules-at-a-glance) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [How a Scan Works](#-how-a-scan-works) • [Repo Structure](#-repository-structure) • [Roadmap](#-roadmap)

---

## 💡 What is AURIX?

**AURIX** is an autonomous, **zero-false-positive** security remediation platform. Instead of dumping another list of "maybe" vulnerabilities on a developer, it makes an AI **attack its own findings** — and only reports a bug once it has been exploited for real, inside an isolated sandbox, and confirmed patched.

| Instead of...                                  | AURIX does...                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| SAST tools that flag 200 "possible" issues       | A **Red Agent** writes a real exploit PoC for each finding             |
| Manual triage to separate signal from noise      | A **Consensus Gate** auto-drops anything scoring below 80% confidence |
| Developers guessing how to fix a CVE              | A **Blue Agent** generates a patch, verified against the live exploit |
| Running untrusted exploit code on a dev machine   | Everything runs in an **ephemeral, network-isolated Docker/gVisor sandbox** |
| Hoping the LLM isn't hallucinating a fix          | Agent reasoning is **RAG-grounded** in OWASP guidelines & CVE data      |

---

## 📝 Project Description

AURIX is a full-stack, AI-driven application security platform that turns unverified static-analysis alerts into proven, patchable findings. A **LangGraph-orchestrated multi-agent engine** sits at its core: a **Logic Agent** scores each raw finding for real-world exploitability, a **Red Agent** writes and executes a working exploit Proof-of-Concept against it, and a **Blue Agent** generates a fix — all inside an ephemeral, network-isolated Docker/gVisor sandbox so nothing unsafe ever touches a real machine. Only findings that are exploited *and* successfully patched are surfaced to the developer.

The platform ships as four cooperating services: a **Node.js + Supabase backend** that handles auth, storage, job queuing, and a `pgvector`-backed RAG pipeline grounding agent reasoning in OWASP and CVE data; a **Next.js web dashboard** for triaging verified vulnerabilities with an AI-generated executive summary and chat assistant; a **VS Code extension** that scans local workspaces, screens for secrets with an LLM before upload, and streams AI-generated patches inline as Copilot-style "Ghost-Text"; and the **AI engine** itself, which runs the scanning, wargaming, and remediation pipeline end to end.

---

## 🧩 Modules at a Glance

<table>
<tr>
<td width="50%" valign="top">

### 🧠 AI Engine
**LangGraph · Docker · gVisor**

The brain of the system. A stateful multi-agent graph scores every finding, then wargames it: a **Red Agent** writes and runs a live exploit PoC, a **Blue Agent** writes the patch, and a **Reflexion loop** lets the Red Agent self-correct a broken exploit before giving up.

`Consensus Gate` · `Red/Blue Agents` · `Sandbox Runner`

</td>
<td width="50%" valign="top">

### ⚙️ Backend
**Node.js · Express · Supabase · Redis**

The gateway and system of record. Handles auth, ingests codebases, queues async scan jobs via Redis, and owns the **RAG pipeline** — embedding OWASP/CVE data into `pgvector` so agent reasoning stays grounded, not hallucinated.

`REST API` · `JWT Auth` · `RAG / pgvector`

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎨 Web Dashboard
**Next.js · Tailwind · Vercel AI SDK**

Where developers triage results. A Kanban-style risk board, syntax-highlighted PoC/patch viewer, one-click GitHub PR, and an **AI Executive Summary** that streams a plain-English "Threat Landscape Report" plus a contextual chat assistant.

`Triage Board` · `Streaming AI Summary` · `Auto-PR`

</td>
<td width="50%" valign="top">

### 🧩 VS Code Extension
**TypeScript · Inline Completion API**

Security, without leaving the editor. Zips and ships the workspace (`.gitignore`-aware), runs an **AI-powered secret guard** before anything uploads, and streams AI-generated fixes as **"Ghost-Text"** — accept a patch with a single `Tab`, Copilot-style.

`Secret Guard` · `Ghost-Text Patches` · `Attack Path Webview`

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
   VS Code Extension              Web Dashboard (Next.js)
          │                              │
          └───────────────┬──────────────┘
                          ▼
                 Node.js Backend  ◄────► Supabase (Auth · DB · Storage · pgvector)
                          │
                          ▼
                 Upstash Redis Queue
                          │
                          ▼
       Triage & Semantic Slicer  (Opengrep · Trivy · Gitleaks · Hadolint)
                          │
                          ▼
        LangGraph Orchestrator
     Logic Agent → Consensus Gate (≥ 0.80)
          🔴 Red Agent   ⇄   🔵 Blue Agent
                          │
                          ▼
        Ephemeral Docker / gVisor Sandbox
           (exploit → verify → patch)
                          │
                          ▼
      Webhook → Dashboard · VS Code · GitHub PR
```

---

## 🧰 Tech Stack

<table>
<tr><td><b>🖥️ Backend</b></td><td>

![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/-Express-000000?logo=express&logoColor=white) ![Supabase](https://img.shields.io/badge/-Supabase-3ECF8E?logo=supabase&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-4169E1?logo=postgresql&logoColor=white) ![Redis](https://img.shields.io/badge/-Upstash%20Redis-DC382D?logo=redis&logoColor=white)

</td></tr>
<tr><td><b>🧠 AI Engine</b></td><td>

![LangGraph](https://img.shields.io/badge/-LangGraph-6E56CF) ![Gemini](https://img.shields.io/badge/-Gemini%20Pro-8E75B2?logo=googlegemini&logoColor=white) ![OpenAI](https://img.shields.io/badge/-GPT--4o-412991?logo=openai&logoColor=white) ![Docker](https://img.shields.io/badge/-Docker%20%2B%20gVisor-2496ED?logo=docker&logoColor=white)

</td></tr>
<tr><td><b>🎨 Frontend</b></td><td>

![Next.js](https://img.shields.io/badge/-Next.js-000000?logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black) ![Tailwind](https://img.shields.io/badge/-Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white) ![Vercel AI SDK](https://img.shields.io/badge/-Vercel%20AI%20SDK-000000?logo=vercel&logoColor=white)

</td></tr>
<tr><td><b>🧩 IDE Extension</b></td><td>

![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white) ![VS Code](https://img.shields.io/badge/-VS%20Code%20Extension%20API-007ACC?logo=visualstudiocode&logoColor=white)

</td></tr>
<tr><td><b>🔎 Scanners</b></td><td>

![Semgrep](https://img.shields.io/badge/-Opengrep%2FSemgrep-4B32C3) ![Trivy](https://img.shields.io/badge/-Trivy-1904DA) ![Gitleaks](https://img.shields.io/badge/-Gitleaks-FBCA04) ![Hadolint](https://img.shields.io/badge/-Hadolint-384D54)

</td></tr>
</table>

---

## 🚀 Quick Start

```bash
git clone https://github.com/<your-org>/aurix.git
cd aurix
cp .env.example .env    # add Supabase, Redis, and LLM API keys
```

<details>
<summary><b>⚙️ Backend</b></summary>

```bash
cd backend
npm install
npm run seed:rag        # seed OWASP/CVE embeddings
npm run dev              # → http://localhost:8000
```

</details>

<details>
<summary><b>🧠 AI Engine</b></summary>

```bash
cd ai-engine
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
docker build -t aurix-sandbox ./sandbox
python worker.py
```

</details>

<details>
<summary><b>🎨 Frontend</b></summary>

```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

</details>

<details>
<summary><b>🧩 VS Code Extension</b></summary>

```bash
cd vscode-extension
npm install
npm run compile    # then press F5 in VS Code to launch a dev host
```

</details>

<details>
<summary><b>🐳 Or spin up backend + AI engine together</b></summary>

```bash
docker compose up --build
```

</details>

---

## 🔄 How a Scan Works

| Step | What Happens |
|:---:|---|
| **1** | Code is ingested from VS Code (zipped locally) or the Web Dashboard (GitHub URL/OAuth) |
| **2** | Backend stores the payload and queues the job in Redis |
| **3** | AI Engine runs parallel static scanners, slices relevant context per finding |
| **4** | **Logic Agent** scores each finding's real-world exploitability |
| **5** | Findings ≥ 0.80 confidence pass the **Consensus Gate** into the wargaming loop |
| **6** | 🔴 **Red Agent** writes a PoC exploit · 🔵 **Blue Agent** writes a patch — both run in the sandbox |
| **7** | Failed PoCs trigger a **Reflexion** retry for self-correction |
| **8** | Exploits neutralized by the patch are marked **✅ Verified** |
| **9** | Results ship via webhook to the dashboard/IDE, with a one-click **GitHub PR** |

---

```

---



<div align="center">

<br/>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:009688,100:6E56CF&height=100&section=footer" width="100%"/>

</div>
