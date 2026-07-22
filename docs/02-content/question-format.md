# Question Format — Abqoor

## Purpose

Defines the required structure for all questions in the Abqoor platform.

This system is image-first and metadata-driven to support scalable Qudurat exam preparation.

---

## Codex Instructions

- Do not invent new fields without explicit approval.
- All changes must remain compatible with production database design.
- Question content is ALWAYS image-based (no text-based question body).
- Metadata is the only source of logic for adaptive learning and grading.
- Use placeholders for future expansion only when necessary.

---

## Core Concept

A Question in Abqoor consists of:

- ONE image that contains:
  - The full question text
  - All answer options (A, B, C, D)
- A set of metadata fields stored in the database

The system NEVER extracts text from images.

---

## Question Data Model (MVP)

```ts
Question {
  id: string;

  // DISPLAY
  questionImageUrl: string;

  // ANSWER LOGIC
  correctAnswer: "A" | "B" | "C" | "D";

  // CLASSIFICATION
  subject: "quantitative" | "verbal";
  topic: string;
  subtopic?: string;

  // DIFFICULTY SYSTEM
  difficulty: number; // 1–10
  estimatedTimeSeconds?: number;

  // ADAPTIVE ENGINE SUPPORT
  skillTags?: string[];
  importanceWeight?: number; // 0–1

  // SOURCE TRACKING
  source: "pdf" | "excel" | "manual";
  version: number;

  // FUTURE EXTENSIONS
  explanationVideoUrl?: string;
}