# HEALTHCLAIM

### Verify before you follow.

**HealthClaim** is an AI-powered Chrome extension that verifies health claims directly where they appear, helping users understand health and nutrition content through **evidence, context, and risk-aware analysis**.

Rather than simply labeling information as *True* or *False*, HealthClaim evaluates the strength of available evidence, identifies missing context and exaggeration, and flags potentially harmful health advice.

---

## 🩺 The Problem

Health misinformation travels faster than evidence.

Social media platforms such as **Instagram, YouTube, and TikTok** contain large amounts of health and nutrition content covering foods, treatments, supplements, diseases, and medicines.

The challenge is not that all health content is false. The problem is that its **accuracy, context, and potential risk are often unclear**.

Users frequently encounter:

* Personal experiences presented as facts
* Exaggerated health claims
* Incomplete information
* Potentially harmful advice

Traditional verification often requires users to:

**Copy → Search → Compare → Decide**

HealthClaim aims to remove this friction by bringing verification directly to the point where the claim is encountered.

---

## 💡 Our Solution

HealthClaim is a **Chrome extension for instant, evidence-based health claim verification**.

Users can click **"Verify Health Claim"** on health-related content without copying the claim, opening another tab, or manually searching for evidence.

### Core Principle

> **Trusted sources provide the evidence. AI interprets it.**

HealthClaim verifies the **specific health claim**, rather than treating an entire post as true or false.

The system focuses on:

**Evidence + Context + Risk**

instead of simple binary classification.

---

## ✨ Key Features

### 🔍 Claim-Level Verification

HealthClaim isolates and verifies a **specific health claim** instead of evaluating an entire post.

This allows users to focus on the exact statement that requires verification.

### 🧠 Context-Aware Classification

Claims are classified into four categories:

* **Supported**
* **Partially Supported**
* **Insufficient Evidence**
* **Potentially Harmful**

### 📚 Evidence Retrieval

The system retrieves relevant medical and scientific evidence from credible sources and presents the evidence used for the assessment.

### 💬 "Why?" Explanation

HealthClaim explains the assessment in simple language and highlights:

* Exaggeration
* Missing context
* Potential risks
* Evidence supporting the claim

### ⚠️ Risk Awareness

HealthClaim identifies potentially harmful advice.

It is designed to support informed evaluation of health information and **does not diagnose users or prescribe treatment**.

### 🔎 Source Transparency

Users can see the relevant evidence and sources behind the assessment rather than receiving an unexplained AI-generated verdict.

### 🎥 Multimodal Claim Extraction

The system is designed to eventually extract health claims from:

* Text
* Speech
* Captions
* On-screen information

The **MVP focuses on text-based claim verification**, while OCR and speech-to-text capabilities are planned extensions.

---

## 🔄 How HealthClaim Works

The verification process follows six major stages:

```text
┌──────────────┐
│   ENCOUNTER  │
│              │
│ User sees    │
│ health       │
│ content      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    VERIFY    │
│              │
│ Click        │
│ "Verify      │
│ Health Claim"│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    EXTRACT   │
│     CLAIM    │
│              │
│ Caption      │
│ Spoken       │
│ Visual       │
│ information  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   RETRIEVE   │
│   EVIDENCE   │
│              │
│ Search       │
│ credible    │
│ medical &    │
│ scientific   │
│ sources      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   ANALYZE +  │
│   CLASSIFY   │
│              │
│ Supported    │
│ Partially    │
│ Supported    │
│ Insufficient │
│ Evidence     │
│ Potentially  │
│ Harmful      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   EXPLAIN +  │
│    SOURCES   │
│              │
│ Evidence     │
│ Context      │
│ Exaggeration │
│ Risk         │
└──────────────┘
```

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │       USER          │
                    │  Social/Web Content │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   CHROME EXTENSION  │
                    │                     │
                    │ Claim Detection     │
                    │ Verify Button       │
                    │ Result Interface    │
                    └──────────┬──────────┘
                               │
                               │ Claim
                               ▼
                    ┌─────────────────────┐
                    │     BACKEND API     │
                    │   Node.js + Express │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
       ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
       │  GEMINI API  │ │   EVIDENCE   │ │   SUPABASE   │
       │              │ │   RETRIEVAL  │ │              │
       │ Extraction   │ │              │ │ Verification │
       │ Normalize    │ │ Medical &    │ │ History &    │
       │ Classify     │ │ Scientific   │ │ Application  │
       │ Explain      │ │ Sources      │ │ Data         │
       └──────┬───────┘ └──────┬───────┘ └──────────────┘
              │                 │
              └────────┬────────┘
                       ▼
              ┌──────────────────┐
              │ VERIFICATION     │
              │ RESULT           │
              │                  │
              │ Verdict          │
              │ Explanation      │
              │ Evidence         │
              │ Risk             │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ CHROME EXTENSION │
              │                  │
              │ Clear result +   │
              │ supporting       │
              │ sources          │
              └──────────────────┘
```

---

## 🛠️ Technology Stack

| Layer            | Technology                           | Purpose                                                         |
| ---------------- | ------------------------------------ | --------------------------------------------------------------- |
| **Frontend**     | React                                | Extension interface                                             |
| **Extension**    | Chrome Extension                     | Point-of-consumption verification                               |
| **Language**     | JavaScript / TypeScript              | Extension development                                           |
| **Styling**      | CSS / Tailwind CSS                   | UI development                                                  |
| **Intelligence** | Gemini API                           | Claim extraction, normalization, classification and explanation |
| **Backend**      | Node.js + Express                    | API and verification orchestration                              |
| **Evidence**     | Trusted medical & scientific sources | Evidence retrieval and source linking                           |
| **Database**     | Supabase                             | Verification history and application data                       |

The presentation identifies the MVP as **text-based claim verification**, with OCR and speech-to-text planned for future multimodal processing.

---

## 🤖 AI Pipeline

The Gemini-powered intelligence layer is responsible for:

```text
Raw Content
     │
     ▼
Claim Extraction
     │
     ▼
Claim Normalization
     │
     ▼
Evidence Retrieval
     │
     ▼
Context-Aware Classification
     │
     ▼
Explanation Generation
     │
     ▼
Risk-Aware Result
```

The AI layer does not replace evidence sources.

Instead:

```text
Trusted Sources → Evidence
                       │
                       ▼
                    AI Layer
                       │
                       ▼
              Interpretation
```

This follows HealthClaim's core principle:

**Trusted sources provide the evidence; AI interprets it.**

---

## 📊 Verification Categories

### 🟢 Supported

Available evidence supports the health claim within the relevant context.

### 🟡 Partially Supported

The claim has some supporting evidence but may contain limitations, exaggeration, or missing context.

### ⚪ Insufficient Evidence

There is not enough credible evidence to confidently support or reject the claim.

### 🔴 Potentially Harmful

The claim may encourage advice or behavior that presents a potential health risk.

HealthClaim therefore goes beyond conventional binary **True / False** fact-checking.

---

## 🔬 What Makes HealthClaim Different?

Traditional fact-checking often focuses on:

```text
TRUE / FALSE
```

HealthClaim focuses on:

```text
EVIDENCE
   +
CONTEXT
   +
RISK
```

### Health-Specific Verification

Designed specifically around health and nutrition claims and their potential risks.

### Context + Risk Assessment

Identifies missing context, misleading claims, exaggeration, and potentially harmful recommendations.

### Multi-Modal Analysis

The long-term vision extends verification beyond text to speech and on-screen information.

### Point-of-Consumption Verification

Verification happens directly within the social/web environment where users encounter the claim.

### Evidence Transparency

Users can see the evidence behind the assessment instead of receiving only a binary label.

---

## 🌐 Target Users

### Primary Users

* Consumers
* Students
* Parents
* Social-media users

### Future Partners

* Educators
* Healthcare organizations
* Educational institutions
* Digital wellness platforms
* Health-content platforms

HealthClaim aims to improve digital health literacy and encourage users to critically evaluate health and nutrition information.

---

## 📈 Scalability Roadmap

HealthClaim is designed to expand beyond the initial browser-based MVP.

```text
01 — Social Web
       ↓
02 — Video & Short-Form Content
       ↓
03 — Health Blogs & Articles
       ↓
04 — Multimodal Content
```

Future development can expand verification across different content formats and environments.

---

## 💼 Business Model

### B2C — Freemium

Core verification can be provided as the free experience, with premium capabilities such as:

* Detailed evidence reports
* Verification history
* Advanced claim analysis

### B2B — Organizations

Potential organizational users and partners include:

* Healthcare organizations
* Educational institutions
* Digital wellness platforms
* Health-content platforms

---

## 📁 Repository Structure

```text
healthclaim/
│
├── extension/
│   ├── src/
│   │   ├── popup/
│   │   ├── content/
│   │   ├── background/
│   │   └── shared/
│   ├── manifest.json
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── db/
│   │   ├── ai/
│   │   └── evidence/
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── setup.md
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔌 API

### `POST /verify-claim`

Accepts a health claim and returns its verification result.

#### Request

```json
{
  "claim": "Example health claim"
}
```

#### Response

```json
{
  "verdict": "Supported",
  "harmLevel": "Low",
  "explanation": "Explanation of the assessment.",
  "sources": [
    {
      "name": "Trusted Source",
      "url": "https://example.com"
    }
  ],
  "analyzedInMs": 12000
}
```

### `GET /history`

Returns a user's previous verification results.

---

## ⚙️ Local Development

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd healthclaim
```

### 2. Install extension dependencies

```bash
cd extension
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
npm install
```

### 4. Configure environment variables

Create a `.env` file using `.env.example`.

Example:

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
PORT=5000
```

### 5. Start the backend

```bash
npm run dev
```

### 6. Build the extension

```bash
cd ../extension
npm run build
```

Then load the generated extension through **Chrome → Extensions → Developer Mode → Load unpacked**.

---

## 🔐 Security

API keys and private credentials must **never be committed to GitHub**.

Use:

```text
.env
```

for local secrets and:

```text
.env.example
```

for documenting required environment variables.

---

## 🌿 Git Workflow

HealthClaim uses a feature-branch workflow.

```text
                         main
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
       feature/       feature/      feature/
        backend      extension-ui   content-script
             │
             └──── feature/ai-evidence
```

### Team Rules

1. Do not push directly to `main`.
2. Create a feature branch for your work.
3. Make small, meaningful commits.
4. Pull the latest `main` regularly.
5. Open a Pull Request when your feature is ready.
6. Review and test changes before merging.
7. Resolve merge conflicts collaboratively.

---

## 👥 Team — QuadCore

| Member             | Role                               |
| ------------------ | ---------------------------------- |
| **Shreya Dwivedi** | Team Lead · Backend API · Database |
| **Priyanshi Jain** | Extension Shell · Popup UI         |
| **Shriya Mohan**   | AI Pipeline · Evidence Retrieval   |
| **Tiya Singh**     | Content Script · Page Injection    |

---

## 🎯 Project Vision

HealthClaim aims to make health-information verification as easy as consuming the content itself.

Instead of asking users to:

**Copy → Search → Compare → Decide**

HealthClaim brings verification directly to the content.

### Verify before you follow.

---

## ⚠️ Disclaimer

HealthClaim is an information-verification tool designed to help users evaluate health-related claims using evidence and context.

It is **not a medical diagnostic tool** and does not replace professional medical advice, diagnosis, or treatment.

---

## 📌 Project Status

**Current focus:** Building the functional Chrome extension MVP and integrating the verification pipeline.

### MVP

* Text-based health claim extraction
* Claim-level verification
* Evidence retrieval
* AI classification
* Context-aware explanation
* Risk awareness
* Source transparency
* Chrome extension interface

### Planned

* OCR
* Speech-to-text
* Broader multimodal verification
* Additional content platforms
* Advanced evidence reports
* Expanded verification history


