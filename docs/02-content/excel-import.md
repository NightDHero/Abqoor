# Excel Import Specification - Abqoor

## Purpose

Define how Excel files are used to provide metadata for questions imported from PDFs.

Excel is used only to enrich question data after PDF-to-image conversion. It does not generate questions, replace PDF images, or introduce adaptive learning behavior.

Excel `.xlsx` is the official MVP spreadsheet import format.

Content creators may use Google Sheets as an external authoring tool, but they must export the sheet as an Excel `.xlsx` workbook before importing it into Abqoor.

## Scope

This specification covers Excel-based enrichment for image-based questions already created by the Question Batch Importer.

The Excel importer is responsible for:

- Reading a structured Excel file.
- Matching rows to imported PDF questions by question number.
- Assigning validated metadata to existing question records.
- Returning mismatch and validation reports.

Google Sheets is not imported directly during the MVP.

The Excel importer is not responsible for:

- Creating questions without PDF images.
- Extracting text from PDFs or images.
- Editing question images.
- Implementing study sessions.
- Implementing adaptive learning.

## Excel Structure

The Excel file must use the following column layout:

| Column | Header | Meaning | System Use |
| --- | --- | --- | --- |
| A | رقم السؤال | Question number | Required for matching |
| B | السؤال | Question text | Reference only |
| C | A option | Option A | Future verification use |
| D | B option | Option B | Future verification use |
| E | C option | Option C | Future verification use |
| F | D option | Option D | Future verification use |
| G | الإجابة | Correct answer | Required metadata |

Each data row corresponds to one question.

## Core Mapping Rules

- Column A maps to `questionNumber`.
- Column G maps to `correctAnswer`.
- Columns C through F represent answer options and are reserved for future verification.
- Column B is reference-only and must not be used for question display or system logic.
- Question images remain the source of question content.

## Question ID Consistency

Excel question numbers must align with the deterministic question ID system used by the PDF importer.

Given a PDF import with:

- `startQuestionNumber = 1`
- PDF page 1 mapped to `Q-001`

The Excel row with question number `1` maps to question ID `Q-001`.

Given:

- `startQuestionNumber = 65`
- PDF page 1 mapped to `Q-065`

The Excel row with question number `65` maps to question ID `Q-065`.

## Integration With PDF Importer

Excel enrichment happens after PDF pages are converted into question images and database question records.

Process:

1. PDF importer creates question records with deterministic IDs and image URLs.
2. Excel importer reads rows from the uploaded Excel file.
3. For each imported PDF question, match the Excel row by question number.
4. Assign:
   - `correctAnswer` from column G.
5. Validate the enriched question.
6. Return a detailed success, failure, and mismatch report.

## Required Data

The following Excel fields are required for MVP enrichment:

- Question number from column A.
- Correct answer from column G.

No question can be committed as fully enriched without `correctAnswer`.

## Validation Rules

- Question number must be present.
- Question number must be a positive integer.
- `correctAnswer` must be present.
- `correctAnswer` must be one of:
  - `A`
  - `B`
  - `C`
  - `D`
- Excel row question numbers must match existing PDF-imported question IDs.
- If an Excel row is missing for a PDF-imported question, that question must be marked as failed or skipped with an explicit error.
- If an Excel row exists but the matching PDF question does not exist, the mismatch must be logged.
- No question can be committed without a valid `correctAnswer`.

## Error Handling

The importer must return a detailed mismatch report.

Failure cases include:

- Missing Excel row for a PDF question.
- Excel row exists but PDF question does not exist.
- Missing question number.
- Invalid question number.
- Missing correct answer.
- Invalid correct answer.
- Duplicate question number rows.

Each failed row or question must include:

- Question number when available.
- Question ID when derivable.
- Error message.
- Status.

Failures must be reported clearly without silently modifying unrelated question records.

## Output Format

The importer should return an enrichment manifest.

Example:

```json
[
  {
    "questionId": "Q-001",
    "questionNumber": 1,
    "status": "success",
    "correctAnswer": "A"
  },
  {
    "questionId": "Q-002",
    "questionNumber": 2,
    "status": "failed",
    "error": "Missing correctAnswer."
  }
]
```

## Commit Rules

- Preview mode should validate mappings and return a report without modifying the database.
- Commit mode should update existing question records only after validation.
- The importer must not create new question records from Excel alone.
- The importer must not change `questionImageUrl`.
- The importer must not overwrite image-based question content.

## Access Control

Excel enrichment is an admin-only operation.

Students must not be able to upload Excel files or modify question metadata.

## Codex Instructions

- Follow this document when implementing Excel-based question enrichment.
- Do not generate questions from Excel.
- Do not use column B as primary question content.
- Do not replace or edit PDF-generated images.
- Do not implement adaptive logic in this module.
- Do not modify unrelated modules unless required for integration.
- Keep implementation modular and aligned with the existing importer and media system.

## Non-Goals

- Do not generate questions from Excel.
- Do not replace PDF images.
- Do not extract text from images.
- Do not implement adaptive logic.
- Do not implement study sessions.
- Do not implement question solving.

## TODO

- Define admin API endpoint names.
- Define preview and commit request payloads.
- Define whether row mismatches block the full batch or only affected questions.
- Define whether option columns C through F will be stored later.
- Define audit logging requirements.
