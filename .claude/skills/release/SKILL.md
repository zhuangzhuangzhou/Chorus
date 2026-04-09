---
name: release
description: Release a new version of Chorus — bump version, update CHANGELOG, commit, tag, and create GitHub release.
license: AGPL-3.0
metadata:
  author: chorus
  version: "0.1.0"
  category: development
---

# Chorus Release Process

Step-by-step guide to cut a new release of Chorus.

## Prerequisites

- `gh` CLI is authenticated (`gh auth status`)
- Working tree is clean (`git status`)
- You are on the `develop` branch

## Steps

### 1. Fetch remote and identify the diff since last release

```bash
# Fetch remote tags and branches so local refs are up to date
git fetch --tags origin

# Find the previous release tag
git tag -l 'v*' --sort=-version:refname | head -5

# List commits since previous tag on develop
git log --oneline v<PREV>..develop

# Review each commit for CHANGELOG-worthy changes
git show --stat <commit-hash>
```

### 2. Draft CHANGELOG and get user approval

Based on the commits identified in Step 1, draft the new CHANGELOG section and **present it to the user for review**. Use this structure:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- **Feature name**: Description of what was added.

### Changed
- **Area**: Description of what changed.

### Fixed
- **Bug name**: Description of what was fixed.

### Plugin
- Plugin version changes if applicable.

---
```

**Rules:**
- Only include commits **after** the previous release tag
- Group by Added / Changed / Fixed / Deprecated / Removed / Plugin
- Omit empty groups
- Each entry should start with a **bold label** followed by a concise description
- Separate from the previous release section with `---`

**IMPORTANT:** After drafting, show the CHANGELOG content and the proposed version number to the user. **Do NOT proceed** until the user explicitly approves. The user may request edits to wording, version number, or grouping.

### 3. Write CHANGELOG.md (on develop)

After user approval, write the approved content into `CHANGELOG.md` — add the new section at the top, below the `# Changelog` header and above the previous release section.

### 4. Bump version in package.json (on develop)

```bash
# Edit package.json "version" field
# e.g., "0.1.0" → "0.1.1"
```

Follow [semver](https://semver.org/):
- **patch** (0.1.0 → 0.1.1): bug fixes, minor additions
- **minor** (0.1.0 → 0.2.0): new features, non-breaking changes
- **major** (0.1.0 → 1.0.0): breaking changes

### 5. Commit to develop and open PR to main

```bash
# Commit the release prep on develop
git add CHANGELOG.md package.json
git commit -m "chore: bump version to vX.Y.Z and update CHANGELOG"
git push origin develop

# Open a PR from develop → main
gh pr create --base main --head develop \
  --title "chore: release vX.Y.Z" \
  --body "Release vX.Y.Z — version bump and CHANGELOG update."
```

Wait for CI to pass, then merge the PR:

```bash
# Merge the PR (use the PR number returned above)
gh pr merge <PR_NUMBER> --merge
```

### 6. Create GitHub release with tag (on main)

After the PR is merged into `main`:

```bash
# Fetch the latest main so the tag targets the correct commit
git fetch origin main

gh release create vX.Y.Z \
  --target main \
  --title "vX.Y.Z" \
  --notes "$(cat <<'EOF'
<paste only the new version's CHANGELOG section here, without the ## header>
EOF
)"
```

**Important:** The `--notes` should contain **only** the new version's content, not the entire CHANGELOG file.

### 7. Sync develop with main and verify

```bash
# Pull the merge commit back into develop
git checkout develop
git pull origin develop

# Confirm tag exists
git tag -l 'vX.Y.Z'

# Confirm release is visible
gh release view vX.Y.Z
```

## Checklist

- [ ] `git fetch --tags origin` run — local tags are up to date
- [ ] `git log v<PREV>..develop` reviewed — no commits missed
- [ ] CHANGELOG draft presented to user and **approved**
- [ ] CHANGELOG.md written with approved content
- [ ] package.json version bumped
- [ ] Changes committed and pushed to `develop`
- [ ] PR from `develop` → `main` created, CI passed, and merged
- [ ] `gh release create` with tag targeting `main`
- [ ] Release notes contain only the new version's section
- [ ] `develop` synced with `main` after merge
- [ ] `gh release view` confirms everything looks correct
