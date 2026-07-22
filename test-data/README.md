# Test Data

## Purpose

This directory is for local development and verification only.

It exists to support importer development, testing, and verification without treating any local files as production content.

The importer must never automatically scan this directory. Test files are selected manually through the Admin Import interface.

Bootstrap verification must resolve local files through filesystem directory reads, not hardcoded filenames. This preserves Unicode filenames on Windows, including Arabic PDF and Excel names.

## Local PDF Files

Developers may place local test PDF files inside:

```text
test-data/pdf/
```

These files are for local importer testing only.

Each PDF should follow the MVP importer rule: one page equals one question image.

## Local Excel Workbooks

Developers may place the active bootstrap Excel workbook inside:

```text
test-data/excel/active/
```

Exactly one Excel workbook may exist in `test-data/excel/active/` during bootstrap runs.

Google Sheets may be used as an external authoring tool, but spreadsheets must be exported as Excel `.xlsx` workbooks before import.

Old or unused workbooks belong in:

```text
test-data/excel/archive/
```

Archived workbooks must not be used for importer execution.

## Import Artifacts

The `test-data/imports/` directory is reserved for future importer artifacts, such as import manifests or debug reports.

Do not implement automatic imports or file watching for this directory.

## Production Content

Nothing inside `test-data/` should be treated as production content.
