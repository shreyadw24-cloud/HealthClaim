# 🩺 HealthClaim

### Verify before you follow.

HealthClaim is an **AI-powered Chrome Extension** that helps users verify health and nutrition claims directly where they encounter them — on social media, websites, blogs, or any other online content.

Instead of simply marking a claim as **True** or **False**, HealthClaim analyzes the available evidence, considers context, identifies exaggerations or missing information, and highlights potential health risks.

> **Trusted sources provide the evidence. AI interprets it.**

---

## 🚨 The Problem

Health and nutrition misinformation spreads rapidly — across food, medicines, supplements, diseases, fitness, home remedies, and social media advice.

The bigger problem isn't that every claim is false — it's that users usually can't tell whether a claim is supported by evidence, missing context, exaggerated, or potentially harmful to follow.

Verifying a claim the traditional way means: **Copy → Search → Compare → Decide.** HealthClaim removes that friction by bringing verification to the point where the claim is encountered.

---

## 💡 Our Solution

The user selects a health claim on any page and clicks **"Verify Health Claim."** HealthClaim then extracts and normalizes the claim, retrieves relevant evidence, analyzes it with AI, classifies the claim, flags risks, and returns a plain-language explanation with sources.

The goal isn't just *"Is this true?"* — it's **"What does the evidence say, what's missing, and is this safe to follow?"**

---

## ✨ Key Features

- **Claim-Level Verification** — evaluates the specific claim, not the whole post
- **Context-Aware AI Analysis** — flags missing information, overgeneralization, exaggeration, and misleading interpretations
- **Evidence Retrieval** — pulls from medical and scientific sources; AI interprets evidence rather than acting as the source of truth
- **Four-Level Classification** (see below) — goes beyond binary True/False
- **"Why?" Explanation** — explains the reasoning, not just the label
- **Risk Awareness** — specifically checks whether following a claim could be harmful
- **Source Transparency** — shows the evidence used, not an unexplained verdict
- **Point-of-Consumption Verification** — works where the content is, no tab-switching
- **Multimodal Input** — extracts and verifies claims from text, images, and audio using Gemini vision/audio, not just captions

### Classification Levels

| Classification | Meaning |
|---|---|
| 🟢 **Supported** | Evidence supports the claim in context |
| 🟡 **Partially Supported** | Some support, but limitations, exaggeration, or missing context |
| ⚪ **Insufficient Evidence** | Not enough credible evidence for a reliable conclusion |
| 🔴 **Potentially Harmful** | Following the claim/advice may pose a health risk |

---

## 🔄 How It Works

```text
USER ENCOUNTERS HEALTH CONTENT
        │
        ▼
  VERIFY HEALTH CLAIM (click)
        │
        ▼
  Claim Extraction → Normalization
        │
        ▼
  Evidence Retrieval (medical/scientific sources)
        │
        ▼
  Context-Aware AI Analysis → Classification → Risk Assessment
        │
        ▼
  Explanation + Sources → VERIFICATION RESULT
```

**Architecture:** Chrome Extension (claim detection, popup/result UI) → Node.js + Express backend → Gemini API (analysis) + Evidence Retrieval + Supabase (history) → result returned to the extension.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Extension Frontend | React | User interface |
| Browser Integration | Chrome Extension APIs | In-page claim verification |
| Language | JavaScript / TypeScript | Application development |
| Styling | CSS / Tailwind CSS | Interface design |
| Backend | Node.js + Express.js | Server-side logic & API |
| AI | Gemini API (text, image, audio) | Claim extraction, analysis, and explanation |
| Database | Supabase | Application data & verification history |
| Evidence | Medical & Scientific Sources | Supporting verification evidence |

---

## 📁 Project Structure

```text
HealthClaim/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── public/
│   └── package.json
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── package.json
├── .gitignore
└── README.md
```

> Folder structure may evolve as the project develops.

---

## 🔌 API

### `POST /verify-claim`

**Request**
```json
{
  "claim": "Drinking lemon water cures diabetes."
}
```

**Response**
```json
{
  "verdict": "Potentially Harmful",
  "harmLevel": "High",
  "explanation": "There is no reliable evidence that lemon water cures diabetes...",
  "sources": [
    { "name": "Trusted Medical Source", "url": "https://example.com" }
  ]
}
```

---

## ⚙️ Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/shreyadw24-cloud/HealthClaim.git
cd HealthClaim
```

### 2. Set up the client
```bash
cd client
npm install
npm run dev
```
Create the required environment variables according to the project's configuration before starting.

### 3. Set up the server
```bash
cd server
npm install
npm run dev
```
Configure environment variables in `server/.env` (see below) before starting.

---

## 🔐 Environment Variables

Create a `.env` file in the `server` directory:

```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
PORT=5000
```

> Never commit API keys, database credentials, or other secrets to GitHub.

---

## 🎯 Target Users

Consumers, students, parents, social-media users, and general internet users — anyone trying to make more informed decisions about health information they encounter online.

---

## 🌱 Future Scope

- **Platform Expansion** — broader coverage across social platforms and short-form video
- **Evidence Expansion** — evidence strength scoring, source reliability ranking, contradictory-evidence detection
- **Multilingual Support** — verification in multiple languages for wider accessibility
- **Healthcare Partnerships** — integrations with healthcare organizations, educators, and wellness platforms
- Personal verification history with deeper detail

---

## 🔒 Disclaimer

HealthClaim is an **information-verification tool** designed to help users evaluate health-related claims using evidence and context.

It is **not a medical diagnostic tool** and does not replace professional medical advice, diagnosis, or treatment. Users should consult qualified healthcare professionals for medical decisions.

---

## 🚧 Project Status

**Current MVP**
- [x] Chrome extension with claim detection and verify workflow
- [x] Claim-level, AI-assisted classification
- [x] Evidence-based verification with context-aware explanations
- [x] Multimodal claim extraction — text, image, and audio via Gemini
- [x] Risk awareness and source transparency
- [x] Backend verification API + Supabase-backed history

**Planned**
- [ ] Broader platform / short-form video coverage
- [ ] Multilingual support
- [ ] Advanced evidence scoring & source reliability ranking
- [ ] Deeper verification history and reports
- [ ] Healthcare & education partnerships

---

## 👥 Team — QuadCore

| Member | Role |
|---|---|
| **Shreya Dwivedi** | Team Lead · Backend API · Database |
| **Priyanshi Jain** | Extension Shell · Popup UI |
| **Shriya Mohan** | AI Pipeline · Evidence Retrieval |
| **Tiya Singh** | Content Script · Page Injection |

---

### Verify before you follow. 🩺
