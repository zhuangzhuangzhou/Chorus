---
name: blog
description: Write release blog posts for Chorus — problem-first narrative, bilingual (zh/en), following the project's editorial style.
license: AGPL-3.0
metadata:
  author: chorus
  version: "0.1.0"
  category: content
---

# Chorus Blog Post

Write bilingual (zh/en) release blog posts for the Chorus landing site.

## Prerequisites

- You know what version / feature to write about (user will tell you, or check recent CHANGELOG / git log)
- Existing blog posts live in `packages/landing/src/content/blog/`
- Naming convention: `zh-chorus-vX.Y.Z-release.md` (Chinese), `chorus-vX.Y.Z-release.md` (English)

## Editorial Style

These rules come from the project owner. Follow them strictly.

### Narrative structure

1. **Open from the reader's pain point, not the feature.** Don't start with "we released X." Start with the problem the reader is living with. Describe the scenario vividly so they recognize themselves in it.
2. **One line to introduce the solution.** After the pain point lands, say what this version does in one sentence.
3. **Break down the supporting mechanisms.** Explain the layers / building blocks that make the solution work. Order them by the flow the user experiences, not by importance.
4. **Industry context as supporting evidence, not the opening.** If there are relevant industry trends (e.g., new tools from Anthropic, competitor features), reference them to validate the direction. But they go in the middle or late section, never the lead.
5. **Converge to a conclusion.** Tie the pieces back together. The punchline should echo the opening pain point: "this is why you can now do X."

### Tone and voice

- **Don't speak for the reader.** Never write "you probably think X" or "you definitely feel Y." Describe the situation, let readers identify with it on their own.
- **Casual, not corporate.** Write like you're explaining to a sharp colleague, not writing a press release. No marketing speak, no filler adjectives.
- **No em dashes (——) in Chinese.** Use commas, periods, or sentence breaks instead.
- **Chinese should read like Chinese.** Not translated-from-English. Spoken rhythm, natural phrasing.
- **English should read like English.** Not translated-from-Chinese. Prefer short punchy sentences. Avoid "materialize," "leverage," "utilize" — use plain words.
- **Logical consistency matters.** The owner will catch contradictions immediately. If you say "we had X from day one," make sure that's actually true. If something was added in a specific version, say so.
- **No filler.** If one sentence covers it, don't stretch it to three.

### Title

- Include the version number: `Chorus vX.Y.Z: <hook>`
- The hook is the real title. It should make someone want to click.
- Can mix Chinese and English, use slang, be playful.
- Examples:
  - "Chorus v0.6.1: 你的时间比 Token 贵，/yolo it！"
  - "Chorus v0.6.0: 给你的 Agent 团队派个监工"

### Frontmatter

```markdown
---
title: "Chorus vX.Y.Z: <hook>"
description: "<1-2 sentences, written as a question or provocation, not a summary>"
date: YYYY-MM-DD
lang: zh  # or en
postSlug: chorus-vX.Y.Z-release
---
```

- `description` should hook the reader, not summarize the post. A question or a challenge works well.
- `postSlug` must be the same for both zh and en versions so they link together.

## Steps

### 1. Gather context

```bash
# Find the version's CHANGELOG entry
# Read recent commits if needed
# Read the relevant feature code / skill docs to understand what was built
```

Understand the feature deeply before writing. Read the code, the skill docs, the PR descriptions. Don't write from summaries alone.

### 2. Draft the Chinese version first

Write `zh-chorus-vX.Y.Z-release.md`. Chinese is the primary version, not a translation.

**Present the draft to the user for review.** Expect multiple rounds of feedback on:
- Narrative structure (what goes first, what to cut)
- Tone (too stiff, too corporate, too presumptuous)
- Logical consistency
- Title and description

**Do NOT proceed to the English version until the Chinese version is approved.**

### 3. Write the English version

Write `chorus-vX.Y.Z-release.md`. This is NOT a literal translation. Rewrite for an English-speaking audience:
- Same structure and arguments
- Natural English phrasing and rhythm
- Adapt metaphors and references that don't cross language boundaries

### 4. Self-review checklist

Before presenting each version:

- [ ] Opens from pain point, not feature announcement
- [ ] Doesn't speak for the reader ("you probably think...")
- [ ] No em dashes in Chinese version
- [ ] No translation-smell in either language
- [ ] Title has version number + hook
- [ ] Description is a hook, not a summary
- [ ] All factual claims are accurate (which version introduced what)
- [ ] No logical contradictions between sections
- [ ] No filler paragraphs — every section earns its space
- [ ] `postSlug` matches between zh and en versions
