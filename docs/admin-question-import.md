# Admin Question Import System

## Purpose

Define the production administrator workflow for validating, importing, auditing, searching, and rolling back Abqoor question-bank batches.

The workflow is:

```text
Upload -> Analyze -> Validate -> Match -> Detect duplicates -> Preview
       -> Confirm -> Import -> Record history
```

File selection or successful analysis never changes the question bank. A separate explicit confirmation is required.

## Architecture

The feature extends the existing Abqoor modules:

- Authentication continues to use the existing session cookie and `ADMIN_EMAILS` authorization rule.
- Questions continue to use the existing `questions` table, repository, service validation, deterministic `Q-NNN` IDs, and image-based student contract.
- Media continues to use `/media/questions/` and `/question-images/`.
- PDF rendering continues to use the existing PDF adapter and Poppler integration.
- Excel parsing continues to use `read-excel-file`.
- `import_jobs` is the batch source of truth and `import_job_items` records per-question analysis, decisions, outcomes, and rollback snapshots.
- Multipart uploads use a generated-name disk scratch directory under the existing media root, are never trusted by their original filename, and are removed after each analysis request. Import staging and rollback media are isolated by import ID.

Excel question text and options are retained in import audit items for preview and history. They do not replace the image as the canonical student-facing question content.

## Administrator Access

- Administrators are authenticated users whose normalized email appears in `ADMIN_EMAILS`.
- The profile menu shows `لوحة الإدارة` only when the authenticated user is an administrator.
- Every `/admin` API independently applies the server-side admin authorization middleware.
- Frontend visibility is not an authorization boundary.

## Workbook Contract

The workbook must contain these sheets in this exact order:

1. `بنك التناظر عام`
2. `اكمال الجمل عام`
3. `الخطأ السياقي عام`
4. `المفردة الشاذة عام`
5. `استعياب المقروء عام`

All sheets must exist. A sheet may contain zero data rows.

### Standard Sheets

`بنك التناظر عام`, `الخطأ السياقي عام`, and `المفردة الشاذة عام` use:

| Column | Header | Meaning |
| --- | --- | --- |
| A | رقم السؤال | Question number |
| B | السؤال | Question text |
| C | أ | Option A |
| D | ب | Option B |
| E | ج | Option C |
| F | د | Option D |
| G | الاجابة | Correct answer |

### Sentence Completion Sheet

`اكمال الجمل عام` uses:

| Column | Header | Meaning |
| --- | --- | --- |
| A | رقم السؤال | Question number |
| B | السؤال | Question text |
| C | الإجابة نص | Reference text, never an answer option |
| D | أ | Option A |
| E | ب | Option B |
| F | ج | Option C |
| G | د | Option D |
| H | الاجابة | Correct answer |

Column C is never imported as an option.

### Reading Comprehension Sheet

`استعياب المقروء عام` currently accepts an empty data set. Its category remains present in the preview with a count of zero.

## Excel Validation

Analysis validates, without database question writes:

- exact sheet names and order;
- expected headers and column positions;
- positive integer question numbers;
- globally unique question numbers across the workbook;
- required question text and four options;
- valid answers `A`, `B`, `C`, `D`, or their Arabic equivalents `أ`, `ب`, `ج`, `د`;
- malformed, partially empty, and unexpected rows.

Trailing fully empty rows are ignored. An empty row between populated rows is reported. Invalid rows remain visible in the preview and block confirmation.

## Category Mapping

The five sheets map to the existing Arabic taxonomy:

| Sheet | Topic slug |
| --- | --- |
| بنك التناظر عام | `verbal-analogy` |
| اكمال الجمل عام | `sentence-completion` |
| الخطأ السياقي عام | `contextual-error` |
| المفردة الشاذة عام | `odd-word-out` |
| استعياب المقروء عام | `reading-comprehension` |

The canonical subject is Arabic/verbal. Since the workbook has no difficulty column and the current question schema requires a value, imported rows use difficulty `1` until a future approved workbook contract supplies difficulty.

## PDF Numbering And Matching

The administrator supplies `startQuestionNumber`.

```text
questionNumber = startQuestionNumber + zeroBasedPageIndex
```

For a start number of 500:

```text
Page 1   -> Question 500 -> Q-500
Page 2   -> Question 501 -> Q-501
Page 201 -> Question 700 -> Q-700
```

Analysis reports every page mapping. Excel numbers and mapped PDF numbers must match exactly. Missing or extra mappings are reported and block confirmation.

## Individual Image Matching

An import uses either one PDF or individual PNG images, never an ambiguous mixture.

Images are matched only by deterministic filenames such as:

```text
500.png
Q-500.png
```

The numeric filename value maps to the Excel question number. Duplicate, missing, extra, non-PNG, or unparseable filenames are errors. Uploaded names are never used as storage paths.

## Validation And Preview

Analysis creates a persistent import job and item manifest, renders or copies media into an isolated staging directory, and returns:

- sheet counts;
- total questions;
- PDF page/image mappings;
- new and duplicate counts;
- missing and extra media counts;
- global and question-level errors;
- question text, options, answer, category, image status, and planned status.

Jobs with validation errors cannot be confirmed.

## Duplicate Handling

Duplicates are detected by deterministic question ID before confirmation. Each duplicate requires one decision:

- `replace`: replace the current question and image, then continue;
- `skip`: preserve the current question and continue;
- `stop`: import valid earlier questions and stop before this duplicate and every later question.

The administrator may apply one decision to all duplicates. No default overwrite or silent skip exists.

## Import Lifecycle

Persisted statuses are:

```text
analyzing -> ready -> importing -> completed
                  \-> cancelled
                  \-> failed
completed -> rolled_back
```

An interrupted `importing` job is recovered as `failed` when the API restarts. Preview analysis and commit belong to the same import ID.

## Confirmation And Progress

- Confirmation is a separate authenticated request.
- Replacement counts are displayed before confirmation.
- Confirmation is rejected until every duplicate has a valid decision.
- The API reports persisted status and in-process item progress.
- The frontend polls the import detail endpoint while status is `importing`.

## Transaction And File Safety

- All question and import-item database writes for confirmation run in one SQLite transaction.
- Rendered/uploaded images are staged before confirmation.
- Existing images are backed up inside the import directory before replacement.
- If commit fails, file changes are compensated and the database transaction is rolled back.
- Invalid questions are never inserted.
- Temporary multipart files are deleted after analysis or a handled upload failure. Only per-job staged images and replacement backups remain until confirmation, cancellation, failure cleanup, or rollback no longer requires them.

## Import History

History retains:

- import ID and status;
- administrator and timestamps;
- Excel and PDF/image source filenames;
- total, new, duplicate, created, replaced, skipped, and failed counts;
- sheet and media summaries;
- per-question validation and outcome details.

History is not deleted by rollback.

## Rollback

Rollback is available only for completed imports and requires explicit confirmation.

- Questions created by the batch are removed only when they still belong to that import.
- Replaced questions are restored from their recorded question and image snapshots.
- Skipped questions are unchanged.
- Imported images are removed or restored with their question records.
- A conflicting later modification causes rollback to fail safely rather than overwrite newer content.
- The job becomes `rolled_back` and remains visible in history.

Rollback database changes use one SQLite transaction with compensating file restoration on failure.

## API

All routes are under the existing admin import router and require admin authorization.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/admin/import/analyze` | Upload Excel plus PDF or PNG images and create preview |
| `GET` | `/admin/import/jobs` | List import history |
| `GET` | `/admin/import/jobs/:id` | Read preview, progress, or import details |
| `POST` | `/admin/import/jobs/:id/confirm` | Confirm duplicate decisions and start commit |
| `POST` | `/admin/import/jobs/:id/cancel` | Cancel an uncommitted import and clean staging |
| `POST` | `/admin/import/jobs/:id/rollback` | Roll back one completed import |
| `GET` | `/admin/import/questions` | Paginated question-bank search and sorting |

The earlier `/admin/import/pdf` endpoint remains available for compatibility but is not used by the new administrator workflow.

## Frontend Flow

The Arabic RTL dashboard provides:

1. Overview
2. Import Questions
3. Question Bank
4. Import History

The import page uses a staged flow: select, analyze, inspect summary and individual items, choose duplicate behavior, confirm, monitor progress, and open history. The question bank uses server-side pagination and exact/partial question-number search without loading full-size images eagerly.

## Security

- Session-cookie authentication and `ADMIN_EMAILS` are enforced server-side.
- Multipart types, field names, extensions, magic bytes, counts, and size limits are validated.
- Files are stored under generated import/question identifiers, never raw upload paths.
- Paths are resolved beneath known media/import roots.
- Workbook/PDF parser failures return Arabic actionable errors without stack traces.
- CORS, cookies, and the authentication architecture are unchanged.

## Testing

Coverage must include:

- exact workbook sheets, headers, standard rows, sentence-completion columns, and empty reading comprehension;
- invalid workbook rows and answers;
- PDF start-number mapping including pages 1 through 201 mapping questions 500 through 700;
- deterministic image matching, missing images, and extra images;
- duplicate detection and replace, skip, stop, and apply-to-all planning;
- preview without question writes;
- confirmation, history, transaction failure safety, and rollback;
- admin authorization and non-admin rejection;
- frontend typecheck/build and manual RTL workflow verification.
