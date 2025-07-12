
# Git Commit Message Rules

## Format Structure
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types (Required)
- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `chore`
- `ci`
- `build`
- `revert`

## Scope (Optional)
- Component, file, or feature area affected
- Use kebab-case: `user-auth`, `payment-api`
- Omit if change affects multiple areas

## Description Rules
- Use imperative mood
- No capitalization of first letter
- No period at end
- Max 50 characters
- Be specific and actionable

## Body Guidelines
- Wrap at 72 characters
- Explain what and why, not how
- Separate from description with blank line
- Use bullet points for multiple changes

## Footer Format
- `BREAKING CHANGE:` for breaking changes
- `Closes #123` for issue references
- `Co-authored-by: Vooster AI (@vooster-ai)`

## Examples
```
feat(auth): add OAuth2 Google login

fix: resolve memory leak in user session cleanup

docs(api): update authentication endpoints

refactor(utils): extract validation helpers to separate module

BREAKING CHANGE: remove deprecated getUserData() method
```

## Workflow Integration
**ALWAYS write a commit message after completing any development task, feature, or bug fix.**

## Validation Checklist
- [ ] Type is from approved list
- [ ] Description under 50 chars
- [ ] Imperative mood used
- [ ] No trailing period
- [ ] Meaningful and clear context
    