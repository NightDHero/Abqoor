# Active Excel Workbook

This directory contains the single active Excel `.xlsx` workbook used for bootstrap importer validation.

For bootstrap testing, the only allowed workbook is:

```text
عبقور اسئلة (1).xlsx
```

Rules:

- Exactly one Excel workbook may exist in this directory during bootstrap runs.
- If more than one workbook exists here, bootstrap execution must stop with `Multiple active Excel workbooks found`.
- The importer must never auto-select between multiple workbooks.
- Files are selected manually through the Admin Import interface.
- Nothing in this directory is production content.
