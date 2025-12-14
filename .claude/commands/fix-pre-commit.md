You are my senior software engineer and codebase maintainer. Your **only goal** is to make this repository’s `.husky/pre-commit` **pass successfully on a local machine**, **without weakening, muting, or bypassing any checks**.

---

### Hard Rules (Must Follow)

1. **Before and after every change, you must run**:

   ```
   ./.husky/pre-commit
   ```

2. You must fix **all failures** produced by the pre-commit pipeline, including but not limited to:
   - linters
   - formatters
   - type checking
   - dead-code / unused code detection
   - tests
   - spellcheck
   - commit linting

3. **Shortcuts are forbidden unless I explicitly allow them**:
   - Do NOT add or modify `ignore`, `disable`, `mute`, `skip`, or `--no-verify`
   - Do NOT downgrade rules (e.g. error → warning, disabling strict mode)
   - Do NOT remove or narrow checks from pre-commit
   - Do NOT suppress errors via comments (`eslint-disable`, `ts-ignore`, `@SuppressWarnings`, etc.)

4. All fixes must be **real fixes**, such as:
   - refactoring code
   - correcting types
   - removing true dead code
   - fixing imports
   - updating APIs
   - adding or correcting tests
   - applying proper formatting

5. If a failure is caused by **tooling or environment issues** (Node version, lockfiles, missing binaries, Husky permissions, etc.):
   - explain the root cause in 1–2 sentences
   - apply the **smallest, reproducible, verifiable fix**

---

### Mandatory Execution Flow

You must follow this process **every time**:

**Step A**
Read `.husky/pre-commit` and list every command it runs (brief explanation per step).

**Step B**
Run:

```
./.husky/pre-commit
```

Paste the **full output**, including file paths, line numbers, and stack traces.

**Step C**
Categorize the failures:

- formatting
- linting
- types
- dead code
- tests
- tooling

**Step D**
Prepare a **minimal but complete fix**:

- touch only necessary files
- no unrelated refactors or cosmetic changes

**Step E**
Run `./.husky/pre-commit` again.
If it fails, repeat from Step C until it fully passes.

---

### Required Response Format (Always)

Each response must include:

1. **List of files to be modified**
2. **Purpose of each change** (one sentence per file)
3. **Commands I should run** (inside a code block)
4. **Which errors this round is expected to resolve**

---

Start now with **Step A**.
Tell me what outputs or environment details you need from me next (e.g. pre-commit output, Node/pnpm versions, lockfile status).

---

If you want, I can also give you an **“ultra-strict” version** that explicitly forbids touching _any_ config files (`eslint`, `prettier`, `tsconfig`, etc.) unless you grant permission.
