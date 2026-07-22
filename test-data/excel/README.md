# Excel Test Data

This directory is for local Excel `.xlsx` workbooks used to enrich imported PDF questions during development verification.

Content creators may prepare data in Google Sheets, but for the MVP they must export the spreadsheet as an Excel `.xlsx` workbook before importing it into Abqoor.

## Active Workbook

Only Excel files inside `test-data/excel/active/` are valid for bootstrap importer execution.

For bootstrap testing, the only allowed active workbook is:

```text
عبقور اسئلة (1).xlsx
```

There must be exactly one active workbook during bootstrap runs.

If more than one Excel workbook exists in `active/`, bootstrap execution must stop with:

```text
Multiple active Excel workbooks found
```

## Archive

Old or unused Excel workbooks belong in `test-data/excel/archive/`.

Archived workbooks must not be read by importer verification under any condition.

## Execution

Files are selected manually through the Admin Import interface.

The importer must never automatically scan this directory or auto-select between multiple files.

Nothing in this directory is production content.
