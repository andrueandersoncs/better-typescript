# Story-test template pseudocode

## Review shell

- Load ordered stories, itemized tests, and proposed Schemas, Errors, Services, and function signatures.
- Select one story and one `it.effect.prop` test.
- Edit the exact test file in Monaco.
- Run only the selected test and show its current result.
- Save a test and invalidate only that test.
- Save proposed code and invalidate every dependent test.
- Require every current test to pass before approval.
- Export the explicit decision and exact source snapshot.

## Local review server

- Accept loopback same-origin requests with the session token.
- Resolve every item through its allowlisted file ID.
- Reject stale or out-of-range saves.
- Write accepted source atomically and append its audit entry.
- Run the selected canonical test file with Vitest.
- Persist and return byte-identical review artifact content.
