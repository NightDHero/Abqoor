# Import Data Sources - Abqoor

## Purpose

Define the approved MVP content sources used by the Abqoor import pipeline.

This document exists to keep the content workflow simple, predictable, and aligned across engineering and content operations.

## Codex Instructions

- Treat this document as the source of truth for MVP import data sources.
- Do not implement direct Google Sheets importing during the MVP.
- Do not add automatic folder scanning, file watching, or background imports.
- Keep future direct Google Sheets synchronization as a post-MVP enhancement.

## MVP Supported Import Sources

### PDF

PDF is the official source for question images.

Rules:

- Each PDF page represents one complete question image.
- PDF pages are converted into PNG question images by the importer.
- PDF content is not text-extracted or interpreted.

### Excel

Excel `.xlsx` is the official spreadsheet import format for MVP metadata enrichment.

Rules:

- Excel workbooks provide metadata such as question number and correct answer.
- Excel workbooks are selected manually through the Admin Import interface.
- Excel remains the only spreadsheet import pipeline for the MVP.

## Google Sheets

Google Sheets is an external authoring tool only during the MVP.

Content creators may prepare or review metadata in Google Sheets, but they must export the spreadsheet as an Excel `.xlsx` workbook before importing it into Abqoor.

The MVP importer does not:

- Connect to Google Sheets directly.
- Use the Google Sheets API.
- Store Google API credentials.
- Synchronize content from Google Sheets.

## Development Content Workflow

The approved MVP development workflow is:

1. Prepare questions in Google Sheets, if useful.
2. Export the spreadsheet as an Excel `.xlsx` workbook.
3. Place the workbook inside `test-data/excel/active/`.
4. Place the source PDF inside `test-data/pdf/`.
5. Open the Admin Import interface.
6. Select the PDF manually.
7. Select the Excel workbook manually.
8. Run Preview.
9. Review the import manifest.
10. Run Commit.

This workflow must not be automated during the MVP.

During bootstrap validation, `test-data/excel/active/` must contain exactly one Excel workbook. If more than one workbook exists in `active/`, validation must stop with `Multiple active Excel workbooks found`.

Archived workbooks belong in `test-data/excel/archive/` and must be ignored completely during importer verification.

## Future Enhancements

Direct Google Sheets synchronization may be considered after the MVP.

TODO:

- Define post-MVP Google Sheets synchronization requirements.
- Define authorization and credential handling for future Google integrations.
- Define whether future synchronization is one-way import, recurring sync, or admin-triggered refresh.
