<div align="center">
  <h1>Playwright Reselect</h1>
  <p><em>A tiny helper to wright test once and reuse the logic anywhere.</em></p>
</div>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style" alt="License"></a>
</p>

<p align="center">
 <img
  src="https://raw.githubusercontent.com/marcflavius/playwright-reselect/main/dist/img/playwrightreselect.jpg"
  alt="playwright-reselect logo"
  width="800"
 />
</p>

Playwright Reselect is a small utility to define tree-shaped locator descriptors for Playwright tests, with built-in debugging helpers and chainable expectation helpers. It is designed to make end-to-end test code more readable, DRY, and easier to maintain.

## Highlights

- Declarative locator trees for scoping and reuse
- Wrapped locators with `.debug()`, `.inspect()`, and `.expectChain()` helpers
- Type safe (auto completion of the call chain, navigate quickly to a node by "go to definition" in VS Code)
- Small, focused, and compatible with Playwright v1.57+

## Advantages

- Describe the UI once reuse with ease
- Multi UI description
- Debug the dom easily
- Inspect any link in the chain by printing the selector of the inspected node
- Assert quickly
- Test dynamic DOM update
- On UI changes, Fix multiple tests once by updating the UI description

## Table of contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
  - [Core concepts](#core-concepts)
  - [Node methods](#node-methods)
  - [Quick Tour](#quick-tour)
  - [Examples](#examples)

- [Advance](#advance)
  - [Building the tree — Tips](#building-the-tree--tips)
  - [Testing layout Setup](#testing-layout-setup)
  - [UI Tips](#ui-tips)
  - [Testing Dynamic Layout](#testing-dynamic-layout)
  - [Reuse TreeDescription Branches Across UIs](#reuse-treedescription-branches-across-uis)
- [Security](#security)
- [License](#license)

## Installation

Install from npm:

```bash
npm install --save-dev playwright-reselect
# or
pnpm add -D playwright-reselect
```

You will also need Playwright (the package or playwright-core) installed in your project. If you use Playwright's test runner, this integrates directly.

## Quick Start

Define a locator tree and use `reselectTree` in your tests:

```ts
// definitions.ts
import { test } from '@playwright/test';
import { Ctx, TreeDescription, reselectTree } from 'playwright-reselect';

export const treeDescription = {
  playwrightHomePage: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('body');
    },
    children: {
      heading: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.locator('h1');
        },
      },
    },
  },
} satisfies TreeDescription; ⚠️ ⚠️ ‼️ // add this type to the tree to be type safe 
// when building the tree and spot quick tree structure mismatches

```

```ts
// example.spec.ts
import { test } from '@playwright/test';
import { reselectTree, type LocatorExpect } from 'playwright-reselect';
import { treeDescription } from './definitions.ts';

// create a root accessor function from the description
const select = reselectTree(treeDescription);

test('heading is visible', async ({ page }) => {
  await page.goto('https://playwright.dev');

  // pass `page`
  const root = select(page);

  await root
    .playwrightHomePage()
    .heading()
    .expectChain()
    .toBeVisible()
    .then((c: LocatorExpect) => c.toHaveText(/Playwright/));

});

```

## API

### Core concepts

- `TreeDescription`: An object describing build rules for nodes. Each node must implement `build(ctx)` which updates `ctx.locator`. Build functions don't need an explicit return statement.
- `BranchDescription`: Type for individual page/branch definitions that can be extracted as constants before being added to the tree.
- `reselectTree(treeDescription)(page)`: Provide the tree description to `reselectTree` to get a function that accepts a Playwright `page` and returns an object with root node accessors. Calling a node runs its `build` and returns a node object.

### Node methods

- `await node.get()` — returns a wrapped `Locator` with `.debug()`, `.expectChain()` helpers.
- `node.inspect()` — logs the locator selector chain and returns the node for chaining.
- `await node.debug()` — print a pretty HTML snapshot of the matched element.
- `await node.expectChain()` — chainable async matchers mirroring Playwright `expect`.
- `node.<child>()` — move into a child node defined in `children`.
- `node.<customName>(...args)` — call a custom getter method defined on the node (must accept `ctx` first and return a `Locator`). This is useful if you need to select multiple part of a node.

### Quick Tour

```ts
// assume `root` was created via `reselectTree(treeDescription)(page)`
const home = root.playwrightHomePage();

// get a wrapped locator and use Playwright API
await home.heading().title().get().click();

// debug the current node's locator (print innerHTML to inspect and grab selectors)
await home.heading().debug();

// inspect the current node's locator (print the selector)
await home
  .heading()
  .inspect() // print [INSPECT] :root >> body >> heading
  .title()
  .inspect() // print [INSPECT] :root >>  body >> heading >> h1
  ,get()

// use chained expectations
await home.heading().title()
  .expectChain()
  .toBeVisible()
  .then((c: LocatorExpect) => c.toHaveText(/Playwright/));

// call a custom getter defined on the node (returns a wrapped locator)
await home.heading()
  .gitHubLinks()
  .getButtonByType('star'); // custom getter
```

## Examples

### Get a node

```ts
// descriptor snapshot for this example
const treeDescription = {
  playwrightHomePage: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('body');
    },
    children: {
      heading: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.locator('header');
        },
        children: {
          title: {
            build: (ctx: Ctx) => {
              ctx.locator = ctx.locator.locator('h1');
            }
          }
        }
      }
    }
  }
} satisfies TreeDescription;

const root = reselectTree(treeDescription)(page);
const home = root.playwrightHomePage();

await home
  .heading()
  .title()
  .get() // get the title
  .click();
```

### Debug current node

```ts
// descriptor snapshot for this example
const treeDescription = {
  playwrightHomePage: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('body');
    },
    children: {
      heading: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.locator('header');
        }
      }
    }
  }
} satisfies TreeDescription;

const root = reselectTree(treeDescription)(page);
const home = root.playwrightHomePage();

await home.heading().debug();
```

### Chained expectations

```ts
// descriptor snapshot for this example
const treeDescription = {
  playwrightHomePage: {
    build: (ctx: Ctx) => { 
      ctx.locator = ctx.page.locator('body'); 
    },
    children: {
      heading: {
        build: (ctx: Ctx) => { 
          ctx.locator = ctx.locator.locator('header'); 
        },
        children: { 
          title: { 
            build: (ctx: Ctx) => { 
              ctx.locator = ctx.locator.locator('h1');
            } 
          } 
        }
      }
    }
  }
} satisfies TreeDescription;

const root = reselectTree(treeDescription)(page);
const home = root.playwrightHomePage();

await home
  .heading()
  .title()
  .expectChain()
  .toBeVisible() // expect 1
  .then((c) => c.toHaveText(/Playwright/)); // expect 2
```

### Custom getter

```ts
// descriptor snapshot with a custom getter
const treeDescription = {
  playwrightHomePage: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('body');
    },
    children: {
      heading: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.locator('header');
        },
        children: {
          gitHubLinks: {
            build: (ctx: Ctx) => {
              ctx.locator = ctx.locator.locator('.github-btn.github-stargazers');
            },
            custom: { // define custom getters here
              getButtonByType: (ctx: Ctx, type: 'star' | 'fork') => {
                return ctx.locator.locator(type === 'star' ? 'a.gh-btn' : 'a.gh-count');
              }
            }
          }
        }
      }
    }
  }
} satisfies TreeDescription;

const root = reselectTree(treeDescription)(page);
const home = root.playwrightHomePage();

await home
  .heading()
  .gitHubLinks()
  .getButtonByType('star') // custom getter with arguments
  .expectChain()
  .toBeVisible();
```

### store a node in a variable and get multiple subparts from the store variable

Use a variable to cache a subtree when you need multiple operations on it.

```ts
const home = root.playwrightHomePage();
const heading = home
  .heading()

const title = await heading
  .title()
  .get();

const gitHubLinks = await heading
  .gitHubLinks()
  .get();
```

## Advance

This section gives practical tips for building robust locator trees, structuring tests, and handling dynamic UI updates.

### Building the tree — Tips

- Keep nodes small and focused: each node should represent a meaningful UI fragment (header, list, item).
- Prefer composition over deep nesting: group related nodes under a parent rather than creating long access chains.
- Use `custom` getters for repeated or parameterized selections instead of inline locators.
- Return early from `build` with the narrowest locator possible so children can scope from it.

Example: reusable list node with a custom getter

```ts
const treeDescription = {
  app: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('#app');
    },
    children: {
      userList: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.locator('.users');
        },
        custom: {
          getItemByIndex: (ctx: Ctx, i: number) => {
            return ctx.locator.locator(`.user:nth-child(${i})`);
          },
        },
      },
    },
  },
} satisfies TreeDescription;
```

### Reuse TreeDescription Branches Across UIs

Extract shared fragments (e.g., a header) into their own subtree and embed them in multiple page trees so you only update selectors once.

```ts
// header branch - use BranchDescription for individual branches
import type { BranchDescription } from 'playwright-reselect';

export const header = {
  build: (ctx: Ctx) => {
    ctx.locator = ctx.locator.locator('header');
  },
  children: {
    logo: {
      build: (ctx: Ctx) => {
        ctx.locator = ctx.locator.getByRole('link', { name: 'Playwright' });
      }
    },
    navDocs: {
      build: (ctx: Ctx) => {
        ctx.locator = ctx.locator.getByRole('link', { name: 'Docs' });
      }
    },
  },
} satisfies BranchDescription;
```

```ts
import { header } from './headerDescription'

const treeDescription = {
  home: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('body');
    },
    children: {
      header,
      hero: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.locator('main');
        },
      },
    },
  },
  docs: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('body');
    },
    children: {
      header,
      sidebar: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.getByRole('navigation');
        },
      },
    },
  },
} satisfies TreeDescription;

const select = reselectTree(treeDescription);

// Usage
const home = select(page).home();
await home
  .header()
  .logo()
  .expectChain()
  .toBeVisible();

const docs = select(page).docs();
await docs
  .header()
  .navDocs()
  .expectChain()
  .toBeVisible();
```

### Testing Layout Setup

- Use a `beforeEach` to navigate and create the root selector: keeps tests focused on assertions.
- If your app needs authenticated state, perform login once in a hook and reuse that session.

```ts
import { test } from '@playwright/test';
import { reselectTree } from 'playwright-reselect';
import { treeDescription } from './definitions';

const select = reselectTree(treeDescription);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('example', async ({ page }) => {
  const root = select(page);
  await root
    .app()
    .userList()
    .itemByIndex(1)
    .expectChain()
    .toBeVisible();
});
```

### UI Tips

- Name nodes by their role or intent (e.g., `navMain`, `productCard`) rather than DOM details.
- Avoid brittle selectors: prefer data attributes like `data-testid` when available.
- When a UI fragment is reused across pages, keep it as a separate subtree and import it into page descriptions.

### Testing Dynamic Layout

- Use `expectChain()` with timeouts for elements that appear asynchronously.
- For complex animations or lazy loading, combine `locator.waitFor()` or `page.waitForResponse()` with assertions.
- Use `.debug()` to print the matched element HTML to quickly craft robust selectors.

```ts
// waiting for an async item
const item = await root
  .app()
  .userList()
  .getItemByIndex(3);

await item.waitFor({ state: 'visible', timeout: 5000 });

await root
  .app()
  .userList()
  .getItemByIndex(3);
  .expectChain()
  .toBeVisible();

// use debug when unsure what the locator matches
await root
  .app()
  .userList()
  .debug();
```

## Security

If you discover a security vulnerability, please do not open a public issue. Instead, report it privately following `SECURITY.md`.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

Author and Maintainers: marcflavius <u7081838225@gmail.com>

LOvE mAKING tHINGS sIMPLE ROCKET sCIENCE 🚀
