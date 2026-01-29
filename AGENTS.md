# AGENTS

This repository uses Codex with the following house rules:

## Maintainability: Magic Numbers & Magic Strings

- Do not introduce magic numbers or magic strings with semantic meaning.
- Extract any value with business/domain meaning into a named constant.
- Extract any repeated string literal into a shared constant (single source of truth).
- Centralize shared constants in a dedicated module (e.g., `src/constants/*`), grouped by domain (roles, routes, permissions, time, etc.).
- Use clear, descriptive constant names that include units where relevant (e.g., `*_IN_MS`, `*_IN_SECONDS`).
- When comparing against domain strings (e.g., roles, statuses, permissions), always compare against constants, never string literals.
- If a literal must remain inline (rare), it must be:
  - obviously non-semantic (e.g., `0`, `1` in loop indices), and
  - used only once, and
  - not part of business logic or cross-module contracts.

## Common Error Sources (TypeScript/JavaScript)

### 1) Explicit null/undefined checks
- Never use truthy/falsy checks (`if (a)` / `if (!a)`) for non-boolean values.
- For `undefined` checks, use `a === undefined` or `typeof a === "undefined"`.
- For `null` checks, use `a === null`.
- When you want to treat both `null` and `undefined` as "missing", use `a == null` (only for this purpose) or explicit `a === null || a === undefined`.
- Exception: truthy/falsy checks are allowed only for `boolean` values.

### 2) Default values: prefer `??` over `||`
- Do not use `||` to set default values.
- Use `??` for defaults when `0`, `""`, or `false` are valid values.
- Only use `||` when you explicitly want *all* falsy values to fall back (must be intentional and rare).

### 3) Status strings: no loose strings; prefer literal types
- Do not compare status/state values against hardcoded string literals.
- Define status/state as TypeScript literal union types (or shared constants) and use them everywhere.
- Avoid `enum` unless required by an external API; prefer literal unions + constants.

### 4) Copy semantics: spread is shallow
- Do not assume `{ ...obj }` or `[...arr]` performs a deep copy.
- When nested objects/arrays must be copied independently, use an explicit deep-copy approach appropriate to the data:
  - `structuredClone` when supported and data is cloneable,
  - or a dedicated deep-copy utility already used in the project.
- Document the chosen copy strategy when copying nested structures.

### 5) Loops: no `.forEach`
- Do not use `.forEach`.
- Use `for`, `for...of`, or `for...in` as appropriate.
- For async iteration, use `for...of` with `await` (or `Promise.all` when safe and intended).
- Ensure early-exit (`break`/`return`) behavior is possible when needed.

### 6) Null safety: avoid non-null assertion `!`
- Do not use the non-null assertion operator (`!`) to force non-null, except when proven safe by construction and documented.
- Prefer explicit type guards (`if (x != null)`) or safe access patterns.
- Prefer direct `if` guards over optional chaining when subsequent logic depends on existence.
- Optional chaining (`?.`) is allowed for safe, non-critical access where missing values are expected.

### 7) Declarations: never use `var`
- Never use `var`.
- Use `const` by default.
- Use `let` only when reassignment is required.


## Functions: prefer Function Declarations

- Prefer **function declarations** for named functions at module scope.
- Use **arrow functions** primarily for:
  - callbacks (inline functions passed to other functions),
  - short function expressions where hoisting is not needed,
  - cases where lexical `this` is explicitly required.

- For object/class methods that use `this`, use **method syntax** or `function`, not arrow functions.
- Do not rely on hoisting behavior for arrow functions or function expressions.
- Use `function*` for generators (generators must use the `function` keyword).
- Avoid accidental overrides of function declarations:
  - Do not declare two functions with the same name in the same scope.
  - Prefer a single declaration and keep function names unique within a module.

## TypeScript: Types & Typing Rules

### 1) Type location & exports
- Non-exported types may be defined in the same file where they are used.
- Exported types must live in a dedicated `types/` directory.
- The `types/` directory must contain **types only**:
  - no runtime code,
  - no side effects,
  - no imports that load dependencies at runtime (keep it type-only).

### 2) No `any`
- Do not use `any`.
- Use `unknown` when the type is not known and narrow it via type guards.
- If an `any` is unavoidable, it must be:
  - minimized in scope,
  - documented with a short comment explaining why,
  - converted to a safe type as early as possible.

### 3) Avoid `as` type assertions
- Avoid `as` assertions whenever possible.
- Prefer type guards, schema validation, parsing functions, or discriminated unions.
- If `as` is unavoidable, validate/narrow the value before use and keep the assertion as close as possible to the boundary (e.g., immediately after parsing).

### 4) Explicit return types for exported functions
- All exported functions must declare an explicit return type.
- Internal (non-exported) functions may rely on inference unless the return type is non-obvious or part of a public contract.

## Performance: avoid functional overkill on large collections

- Avoid long chains of array transforms (`filter`/`map`/`reduce`) when it causes multiple full passes or creates multiple intermediate arrays.
- For performance-critical paths or large datasets, prefer a single-pass loop (`for` / `for...of`) that:
  - combines conditions,
  - performs the computation inline,
  - accumulates results without creating temporary arrays.
- Prefer early-exit loops (`break`/`return`) when the result can be determined before scanning all elements.
- Use functional chains only when:
  - the collection is small/non-critical, and
  - readability is clearly improved, and
  - intermediate allocations are acceptable.
