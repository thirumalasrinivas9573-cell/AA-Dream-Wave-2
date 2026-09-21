# Security Release Blockers

Status: **external remediation required before Version 1 production deployment**.

The production-hardening audit found historical repository content containing credentials for database and third-party providers. The affected working-tree documentation/editor configuration has been removed, and ignore rules now exclude local editor AI configuration. Removing current files does not remove values from git history and does not invalidate provider credentials.

## Mandatory owner actions

1. Rotate all MongoDB users/passwords that have ever appeared in the repository.
2. Revoke and replace all exposed OpenAI API keys.
3. Revoke and replace the exposed Firebase service-account key.
4. Rotate Twilio authentication credentials and review Verify usage.
5. Rotate Resend API keys and review sending logs.
6. Review Stripe credentials and rotate if repository history or local copies contained real values.
7. Replace deployment secret-store values and verify each integration.
8. Purge exposed blobs from every branch and tag using `git filter-repo` or BFG.
9. Force-push the cleaned history in a coordinated maintenance window.
10. Require every contributor to re-clone after history replacement.
11. Run a secret scanner against the rewritten repository and release artifact.

## Verification evidence required

- Provider console confirms old credentials revoked.
- MongoDB audit logs show no unknown access.
- Git secret scan reports no live or historical credentials.
- Production OTP, email, AI, database, and payment smoke tests pass with replacement credentials.
- Security owner signs off before the Version 1 tag is promoted.

Until these actions are complete, the codebase may be engineering-complete but is **not authorized for production release**.
