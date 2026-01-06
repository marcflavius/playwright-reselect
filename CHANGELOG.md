## 0.4.0 (Jan 6, 2026)

### Breaking Changes

* **BREAKING:** Removed `TreeDescription` and `BranchDescription` type exports. Use `defineBranch()` and `defineTree()` helper functions instead to ensure proper type inference for aliases and autocomplete support.

  **Migration:**

  ```ts
  // Before
  import { TreeDescription, BranchDescription } from 'playwright-reselect';
  const myPage = { ... } satisfies BranchDescription;
  const tree = { myPage } satisfies TreeDescription;

  // After
  import { defineBranch, defineTree } from 'playwright-reselect';
  const myPage = defineBranch({ ... });
  const tree = defineTree({ myPage });
  ```

* **BREAKING:** Renamed `LocatorExpect` type to `ExpectChain` for better clarity and consistency.

  **Migration:**

  ```ts
  // Before
  import { LocatorExpect } from 'playwright-reselect';
  .then((c: LocatorExpect) => c.toHaveText(/text/));

  // After
  import { ExpectChain } from 'playwright-reselect';
  .then((c: ExpectChain) => c.toHaveText(/text/));
  ```

### Features

* Added alias system for quick navigation to deeply nested nodes using `.skipToAlias().aliasName()` syntax
* Full TypeScript autocomplete support for alias names and methods
* Improved type inference for better IDE support

## 0.3.0 (Jan 4, 2026)

* Initial public release
