# Dream Wave AI Version 1 Database

MongoDB is accessed through Mongoose using `MONGODB_URL`. Production must use a dedicated least-privilege database user, TLS, backups, and network access controls.

## Identity and security

- `User`: portal identity and role.
- `RefreshToken`: hashed refresh-session records, family rotation/revocation, TTL.
- `Otp`, `PhoneOtpState`, `PasswordReset`: bounded challenge state with TTL indexes.
- `LoginHistory`: authentication audit history.
- `StudentProfile`, `CareerProfile`, `Resume`: student identity, preferences, evidence, career data.

## Learning

- `Goal`, `Task`, `Roadmap`: owner-first indexes and explicit relationships.
- `Chat`: `{ userId, session }` index; stored message history capped to prevent BSON growth.
- `Report`: `{ user, createdAt }` supports owner history.
- Focus sessions and lesson/AI state remain owner-scoped.

## Library

- `LibraryBook`: licensed source metadata and catalog indexes.
- `LibraryProgress`: unique `{ userId, bookId }`, recent-reading and favorites indexes.
- `LibraryReadingSession`: idempotent `{ userId, clientEventId }` and history indexes.
- `LibraryAnnotation`, collections, authors, publishers, categories, and tags support catalog and reader workflows.

## Career and organizations

- `Institution` and `CompanyProfile`: unique owner and slug relationships; approval/public state controls discovery.
- `Job`, `Internship`, `Course`, `Faculty`, `Scholarship`, `Research`, `PortalEvent`, `Promotion`: organization-owned content.
- `Application`: unique student/target relationship, status history, and resume reference.
- `PortalCertificate`: owner/date and recipient/date indexes.
- `Follow`, `Bookmark`, `Review`: unique student/target relationships.

## Platform

- `Notification`: owner/read/archive/pin/time indexes and partial unique dedupe key.
- `SearchIndex`: owner/recent index and 30-day TTL.
- `Recommendation`: expiry TTL.
- `ContentReport`: moderation queue, reporter history, and target indexes.
- `ContactInquiry`: organization/status/time indexes.
- `AdminLog`, `PlatformAnalytics`: administrative and operational audit data.

## Integrity rules

1. Public discovery queries must pair entity state with approved/public owner IDs.
2. Private entities always query by authenticated owner ID.
3. Cross-tenant mutations include organization ownership in the update predicate.
4. References are validated before creating interactions or moderation reports.
5. Unique indexes are created only after duplicate-data checks where legacy data may conflict.
6. TTL indexes are declared once in schemas; startup does not recreate the same key under conflicting names.

## Production operations

- Run backups and a restore drill before release.
- Review skipped unique-index warnings during deployment; reconcile duplicates before retrying.
- Monitor collection growth for chat, analytics, notifications, search history, and reading sessions.
- Use `explain("executionStats")` for high-volume dashboard, discovery, notification, and search queries.
- Do not run destructive migrations or `syncIndexes()` without a tested backup and maintenance plan.
