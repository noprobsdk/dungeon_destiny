# FR-00003 changelog

Approved changes to this Feature Request, newest first.

## 2026-10-09: Unresolved decisions resolved

- **Change:** Moved the two Section 18 decisions to Section 7: the SuperAdmin
  email address is kept in the owner's private credential file as
  `STUDIO_SUPERADMIN_EMAIL`, and the Access policy lets in only the
  SuperAdmin. Removed the matching prerequisite blocker.
- **Reason:** The project owner approved both recommendations. The repository
  is public, so the email address must not be stored in it.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.

## 2026-10-09: Feature Request created

- **Change:** Created `README.md` with status `In Specification`. It delivers
  the first, empty Content Studio: the `studio-web` and `studio-api` Workers
  behind Cloudflare Access, with one SuperAdmin who can sign in with a
  one-time PIN and see a signed-in page. It uses no database.
- **Reason:** The project owner chose a basic Content Studio as the next step
  after DD-020, split so that Content D1 and the Staff users screen follow in
  a later Feature Request.
- **Affected files:** `README.md`, `CHANGELOG.md`.
- **Verification:** Both files match their approved proposals.
