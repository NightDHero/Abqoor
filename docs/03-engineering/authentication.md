# Authentication

## Purpose

Document authentication and session behavior for Abqoor.

## Codex Instructions

- Do not invent roles, permissions, or account features.
- Keep documentation aligned with implemented authentication behavior.
- Mark future access-control decisions as TODOs.

## TODO

- Expand current registration and login behavior.
- Expand session storage and expiration behavior.
- Define future role or admin requirements if approved.

## Implemented Behavior

- Users can register with email and password.
- Users can log in with email and password.
- Users can log out.
- Sessions use an HTTP-only cookie.

## Admin Import Access Rule

- Admin import endpoints are protected using the `ADMIN_EMAILS` environment variable.
- This does not change the authentication system or introduce role-based authentication.
- This is a runtime authorization check only for importer endpoints.
