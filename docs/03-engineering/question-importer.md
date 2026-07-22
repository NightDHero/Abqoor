# Question Importer Specification

## Purpose

Define the system responsible for importing Qudurat exam questions from PDF files into the Abqoor platform.

Each PDF page represents one complete question image.

The system must convert PDF pages into question images and assign deterministic question IDs for database storage.

## Codex Instructions

- Treat this document as the source of truth for the Question Batch Importer system.
- Do not implement text extraction for importer workflows.
- Do not add AI interpretation, question solving, adaptive logic, or content modification to the importer.
- Do not change existing API routes or database schema unless explicitly instructed in a later implementation task.
- If implementation details are missing, stop and report the missing specification instead of inventing behavior.

## Core Principles

- Question content is image-based only, with no text extraction.
- Each PDF page equals one question.
- The system must support large-scale imports of 10,000 or more questions.
- Imports must be deterministic and repeatable.
- No manual renaming of files.
- No AI interpretation of question content.

## Input Format

The importer accepts:

- `PDF file` - required.
- `Excel .xlsx file` - required for MVP metadata enrichment.
- `startQuestionNumber` - required positive integer.
- `pageRange` - optional object:
  - `from` - number.
  - `to` - number.
- `overwriteExisting` - optional boolean, default `false`.
- `mode` - required, one of:
  - `preview`
  - `commit`

Google Sheets is not accepted directly by the MVP importer. Content prepared in Google Sheets must be exported as an Excel `.xlsx` workbook before import.

## Process Flow

### 1. Load PDF

- Read all pages from the uploaded PDF.
- Validate that the PDF is not empty.

### 1.1 Load Excel Metadata

- Read the uploaded Excel `.xlsx` workbook.
- Match rows to PDF questions by question number.
- Use Excel metadata only; do not generate question content from Excel.

### 2. Page Selection

- If `pageRange` is provided, only process pages within that range.
- If `pageRange` is not provided, process all pages.

### 3. Image Generation

- Convert each selected PDF page into a PNG image.
- Each image represents a full question.
- Do not apply cropping logic unless explicitly added in a future version.

### 4. Question ID Generation

Generate deterministic IDs using:

```text
Q-{startQuestionNumber + pageIndex}
```

Example:

```text
startQuestionNumber = 65

Page 1 -> Q-065
Page 2 -> Q-066
Page 3 -> Q-067
```

IDs must be unique and consistent.

### 5. File Naming Convention

Each generated image must follow:

```text
Q-XXX.png
```

Example:

```text
Q-065.png
```

### 6. Duplicate Handling

Before inserting a question:

- Check whether `questionId` already exists in the database.

If the question already exists:

- If `overwriteExisting = false`, block or skip with an error.
- If `overwriteExisting = true`, replace the existing record.

### 7. Modes

#### Preview Mode

- Do not write to the database.
- Generate only:
  - question IDs
  - image mappings
  - validation report
- Return the full import plan.

#### Commit Mode

- Write data to the database.
- Store:
  - `questionId`
  - `imageUrl`
  - metadata placeholders
- Return the import summary.

### 8. Error Handling

- Each page is processed independently.
- Failures on one page must not stop the full batch.
- The system must return per-page error logs.

### 9. Output Format

Return an import manifest:

```ts
[
  {
    questionId: string,
    imageUrl: string,
    pageIndex: number,
    status: "success" | "failed"
  }
]
```

### 10. Validation Rules

- `startQuestionNumber` must be a positive integer.
- `pageRange` must be valid if provided.
- The PDF must contain at least one page.
- Generated `questionId`s must not conflict unless overwrite is enabled.

## Non-Goals

- No text extraction from images.
- No question solving or AI interpretation.
- No adaptive logic inside the importer.
- No modification of question content.

## System Role

This importer is only responsible for:

```text
PDF + Excel -> Image + metadata -> Question ID mapping -> Database-ready structure
```

Google Sheets may be used outside Abqoor for authoring, but direct Google Sheets synchronization is a post-MVP enhancement.

## TODO

- Define where generated PNG files are stored.
- Define the exact `imageUrl` format.
- Define import report persistence rules, if any.
