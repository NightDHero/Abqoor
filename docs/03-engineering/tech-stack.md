# Tech Stack - Abqoor

## Purpose

Define the final approved technology stack used to implement all systems in Abqoor.

This is a locked decision document. Changes to this document should be treated as architecture decisions and should not be made casually.

---

## Codex Instructions

- Do not change architecture decisions from other documents.
- Do not redesign systems here.
- This document only defines implementation technologies.
- Do not add code, endpoints, or database schema.
- Leave decisions that are not finalized as TODOs.

---

## Backend

### Backend Framework

Abqoor uses **Express** for the backend application framework.

Reason:

- Simple and widely supported.
- Flexible enough for modular backend systems.
- Suitable for REST APIs during the MVP.
- Scales clearly when paired with disciplined module boundaries.

### Runtime Environment

Abqoor uses **Node.js** with **TypeScript** for backend runtime and application code.

Reason:

- Shared language across backend and frontend.
- Strong developer ecosystem.
- Good fit for API services, file upload workflows, and admin tooling.

### API Style

Abqoor uses **REST** as the approved API style for MVP systems.

Reason:

- Simple to implement and operate.
- Easy to test and debug.
- Well suited to the current backend and frontend architecture.

TODO:

- Define long-term API versioning strategy.
- Define production API documentation process.

---

## Frontend

### Frontend Framework

Abqoor uses **React** for the frontend application.

Reason:

- Mature ecosystem.
- Strong fit for interactive study flows and admin tools.
- Works well with TypeScript and Vite.

### State Management Approach

Abqoor uses **local React state** for MVP state management.

Reason:

- Keeps MVP implementation simple.
- Avoids adding global state libraries before the product requires them.
- Supports current authentication, question display, and admin import workflows.

TODO:

- Reevaluate state management if cross-page state becomes complex.

### UI Rendering Approach

Abqoor uses **client-side rendering** with Vite.

Reason:

- Simple development workflow.
- Fast build and feedback loop.
- Appropriate for the current authenticated app experience.

TODO:

- Define whether future server-side rendering is needed.

---

## Database

### Database Type

Abqoor currently uses **SQLite** through `better-sqlite3`.

Reason:

- Simple local development and MVP operation.
- Low operational overhead.
- Good fit for early product iteration.

### Relationship Handling Approach

Abqoor uses relational data modeling concepts.

This document does not define table structure, foreign keys, or schema details.

TODO:

- Define production database migration strategy.
- Define whether and when to move from SQLite to a managed relational database.
- Define relationship constraints in the database specification when approved.

---

## File Storage

### Question Image Storage

Question images are stored as static files under:

```text
/media/questions/
```

### Media Serving

Question images are served through the public question image path defined by the Media System:

```text
/question-images/
```

### Relationship to Media System

The Media System remains the source of truth for media handling behavior.

Related document:

- `docs/03-engineering/media-system.md`

TODO:

- Define production object storage or CDN strategy.
- Define backup and retention policy for media files.

---

## PDF / Excel Processing

### File Parsing Location

PDF and Excel processing happens on the backend.

Reason:

- Keeps admin import workflows controlled and auditable.
- Avoids placing import responsibility in the browser.
- Allows importer behavior to remain centralized.

### PDF Processing

PDF page processing is handled by backend importer tooling.

Approved tools:

- `pdfjs-dist` for PDF document inspection.
- Poppler `pdftoppm` for PDF page to PNG conversion.

Related document:

- `docs/03-engineering/question-importer.md`

### Excel Processing

Excel enrichment is handled by backend importer tooling.

Approved tools:

- `read-excel-file` for workbook parsing.
- `fflate` for safe XLSX archive inspection when needed by importer fallback logic.

Related document:

- `docs/02-content/excel-import.md`

### Google Sheets Authoring (MVP Decision)

Google Sheets is treated as an external content authoring tool only during the MVP.

Content creators may use Google Sheets while editing question metadata, but they must export the spreadsheet as an Excel `.xlsx` workbook before importing it into Abqoor.

MVP rules:

- The backend does not read Google Sheets directly.
- No Google Sheets API integration is used in the MVP importer.
- No Google authentication or Google Sheets credentials are required by the MVP importer.
- Excel `.xlsx` is the official spreadsheet import format.

Future direct Google Sheets synchronization is a post-MVP enhancement and must be added without redesigning the importer architecture.

### Importer Connection

File parsing connects to the Import System only.

The importer uses parsed files to:

- Generate question images.
- Enrich imported questions with approved metadata.
- Produce import manifests.

This document does not redefine importer behavior.

---

## Deployment

### Hosting Approach

Hosting is not finalized.

TODO:

- Define backend hosting provider.
- Define frontend hosting provider.
- Define media storage hosting.
- Define database hosting for production.

### Environment Separation

Abqoor should conceptually support:

- Development
- Staging
- Production

TODO:

- Define environment variable strategy.
- Define staging data policy.
- Define production secrets management.

### Build and Deploy Flow

At a high level, Abqoor builds frontend and backend artifacts before deployment.

Current build flow:

- Backend TypeScript build.
- Frontend TypeScript check and Vite build.

TODO:

- Define CI/CD pipeline.
- Define deployment approvals.
- Define rollback process.

---

## Design Principles for Stack

- Simplicity first.
- Avoid overengineering.
- Optimize for maintainability.
- Prefer widely supported tools.

---

## Important Rules

- Do not change architecture decisions from other docs.
- Do not redesign systems here.
- This document only defines implementation technologies.
- No code, no endpoints, no schema.

---

## Related Documents

- `docs/03-engineering/architecture.md`
- `docs/03-engineering/media-system.md`
- `docs/03-engineering/question-importer.md`
- `docs/02-content/import-data-sources.md`
- `docs/02-content/excel-import.md`
- `docs/03-engineering/database.md`

---

## TODO

- Define production hosting provider.
- Define production database decision.
- Define CDN or object storage strategy.
- Define post-MVP direct Google Sheets synchronization strategy if needed.
- Define CI/CD deployment workflow.
