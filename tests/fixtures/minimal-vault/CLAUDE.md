# Minimal Vault Fixture — Schema

`schema_version: 1`

This fixture is a tiny, valid vault used by the Bats test suite. It mirrors
the shape of `docs/vault-example/` but keeps every file to the minimum content
needed to pass `scripts/verify-ingest.sh`.

Do not treat this as reference documentation — the authoritative schema lives
in `docs/vault-example/CLAUDE.md`. Tests copy this fixture to a temp directory via
`setup_fixture_vault()` and mutate the copy.
