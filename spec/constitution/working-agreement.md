# Working Agreement

- Use `spec/features/NNN-name/` for new features or complex changes.
- Update `spec.md` or `plan.md` before changing scope.
- Implement one feature at a time.
- Preserve Spanish-first voice UX unless a spec explicitly changes it.
- Keep AI provider integrations behind the provider registry.
- Keep `server.ts` as the backend entrypoint.
- Do not add secrets, provider keys, or Android signing material to the repo.
- For Android changes, preserve `com.vozartdev.app` / `VozArt Dev` unless explicitly requested.
- Verify with the smallest relevant checks first, then broader checks when risk warrants it.
