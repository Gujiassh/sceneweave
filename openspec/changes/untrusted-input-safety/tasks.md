## 1. Design and baseline

- [x] Record observed GLB and ZIP boundary failures and preserve existing contract references.
- [x] Define self-contained resources and validated-entry-only ZIP extraction.
- [x] Review design and embedded-image-safe loader defense before implementation.

## 2. Model policy

- [x] Add shared private GLB/text glTF resource-policy validation with deterministic malformed-input errors.
- [x] Enforce policy at inspection and runtime before parser/subresource access.
- [x] Preserve embedded buffer/image and data-URI fixtures; cover external buffer/image in both containers and runtime entry.

## 3. ZIP boundary

- [x] Validate EOCD, full central directory, single-disk/count consistency and local-header/payload ranges.
- [x] Extract only validated stored/deflate entries with bounded output and exact lengths.
- [x] Add malformed count/directory/local metadata/range/budget regressions and valid compressed/descriptor round trips.

## 4. Verification and acceptance

- [x] Run focused archive/runtime asset tests and relevant static checks.
- [x] Run full integrated automated checks and inspect unrelated generated changes; record the full-format limitation separately.
- [x] Verify normal model/archive import, actual embedded-image decoding and understandable rejection/recovery in a visible browser.
- [x] Record decisions, commands, bounded acceptance, independent review, rework and limitations in acceptance/delivery records and docs.

- [x] Complete bounded independent input-safety source review and archive its result in docs/reviews.
