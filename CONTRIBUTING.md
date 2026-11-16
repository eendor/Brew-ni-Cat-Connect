# Contributing to Brew ni Cat Connect

There is no required format for branches, commits or pull requests. Write them
however explains the change best.

## Rules

- Start from an up-to-date `main` and keep each branch to one change.
- Never commit credentials, keys, the Android signing key, personal customer
  data or production exports.
- Don't invent business information. Write `TODO: Confirm with Brew ni Cat owner.`
  and label fixtures `MOCK DATA — FOR DEVELOPMENT ONLY`.
- Add tests for important business logic. Run the checks before merging
  (CI runs them too), and report only the commands you actually ran.
- Update the affected documentation and the development log.
- Database changes need a migration and a matching rollback in `supabase/`.
- Use your own Git identity. Don't add automated co-author trailers.

## Reviews

The lead developer may approve their own pull requests; say so in a comment on
the pull request. A teammate's pull request needs a review before it is merged.

## Releases

- **Android app:** follow the Release steps in `android/README.md`. Install
  the signed build and sign in once before publishing it.
- **Website:** merging to `main` deploys it.
