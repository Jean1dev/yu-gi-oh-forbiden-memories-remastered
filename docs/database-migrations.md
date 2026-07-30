# Database migrations

The files in `supabase/migrations/` are the only source of truth for the
production database schema. Do not change the production schema through the
Supabase SQL Editor or Table Editor.

## Development workflow

1. Create a new migration with `pnpm exec supabase migration new <name>`.
2. Apply the complete history locally with `pnpm db:reset`.
3. Run `pnpm exec supabase db lint --local --fail-on error`.
4. Run the Supabase-backed integration tests.
5. Commit the new migration. Never edit a migration that has been applied to a
   remote project.

Pull requests rebuild the local database from the committed history and run the
integration tests against it. A push to `main` deploys pending migrations only
after every repository and database check succeeds.

## Compatibility policy

Database and web deployments are independent, so every schema change must use
the expand/contract pattern:

1. **Expand:** add nullable columns, new tables, new functions, or compatible
   overloads without removing the old interface.
2. **Migrate:** deploy application code that understands the expanded schema
   and backfill data with an explicit, restartable migration when necessary.
3. **Contract:** remove the old interface in a later migration, after no
   deployed application version depends on it.

Renames are implemented as add/copy/switch/remove. Destructive DDL must not be
combined with the application change that stops using the old schema.

## Production deployment

The `Deploy Supabase migrations` GitHub Actions job uses the `Production`
environment and these values:

- Environment secret `SUPABASE_ACCESS_TOKEN`
- Environment secret `SUPABASE_DB_PASSWORD`
- Environment variable `SUPABASE_PROJECT_ID`

The job links the project, previews pending migrations with `db push --dry-run`,
and then runs `db push`. Deployments are serialized and seeds are never pushed
to production.

Before enabling the first automated deployment, run
`supabase migration list --linked` and confirm that migrations `0001` through
`0008` appear in both the local and remote columns.

## Failure and recovery

- Do not edit or delete the failed migration after it has been recorded
  remotely.
- Fix a deployed schema with a new forward migration.
- If the SQL failed before being recorded, correct it only after confirming its
  effects and the remote migration history.
- Use `supabase migration repair` only to reconcile a verified history mismatch;
  it does not apply or revert SQL.
- Restore data from the project's backup or Point-in-Time Recovery when a
  migration corrupts production data. A schema rollback migration is not a
  substitute for a data backup.
