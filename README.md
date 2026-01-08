<div align="center">
  <h1>Playwright Reselect</h1>
  <p><em>A tiny helper to write tests once and reuse the logic anywhere.</em></p>
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/playwright-reselect"><img src="https://img.shields.io/npm/v/playwright-reselect.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/playwright-reselect"><img src="https://img.shields.io/npm/dm/playwright-reselect.svg" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue.svg" alt="TypeScript"></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-1.57+-45ba4b.svg" alt="Playwright"></a>
  <a href="https://bundlephobia.com/package/playwright-reselect"><img src="https://img.shields.io/bundlephobia/minzip/playwright-reselect" alt="Bundle size"></a>
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

- Describe the UI once, reuse with ease
- Multiple UI descriptions
- Debug the DOM easily
- Inspect any link in the chain by printing the selector of the inspected node
- Assert quickly
- Test dynamic DOM updates
- On UI changes, fix multiple tests at once by updating the UI description

## Table of contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API](#api)
  - [Core concepts](#core-concepts)
  - [Node methods](#node-methods)
  - [Quick Tour](#quick-tour)
  - [Building the Tree — Tips](#building-the-tree--tips)
  - [UI Tips](#ui-tips)
  - [Examples](#examples)
    - [Get a node](#get-a-node)
    - [Debug current node](#debug-current-node)
    - [Chained expectations](#chained-expectations)
    - [Custom getter](#custom-getter)
    - [Reusable list with custom getter](#reusable-list-with-custom-getter)
    - [Store a node in a variable](#store-a-node-in-a-variable-and-get-multiple-subparts-from-the-stored-variable)
    - [Skip to Alias — Quick navigation ✨ NEW](#skip-to-alias--quick-navigation-to-deeply-nested-nodes--new)

- [Advanced](#advanced)
  - [Testing Layout Setup](#testing-layout-setup)
  - [Testing Dynamic Layout](#testing-dynamic-layout)
  - [Reuse Tree Branches Across UIs](#reuse-tree-branches-across-uis)
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
import { Ctx, reselectTree, defineTree } from 'playwright-reselect';

export const treeDescription = defineTree({
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
});

```

```ts
// example.spec.ts
import { test } from '@playwright/test';
import { reselectTree, type ExpectChain } from 'playwright-reselect';
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
    .then((c: ExpectChain) => c.toHaveText(/Playwright/));

});

```

## API

### Core concepts

- `defineTree()`: Helper function to define your locator tree with proper type inference for aliases and autocomplete support.
- `defineBranch()`: Helper function to define individual page/branch definitions that can be extracted as constants before being added to the tree.
- Tree structure: An object describing build rules for nodes. Each node must implement `build(ctx)` which updates `ctx.locator`. Build functions don't need an explicit return statement.
- `reselectTree(treeDescription)(page)`: Provide the tree description to `reselectTree` to get a function that accepts a Playwright `page` and returns an object with root node accessors. Calling a node runs its `build` and returns a node object.

### Node methods

- `await node.get()` — returns a wrapped `Locator` with `.debug()`, `.expectChain()` helpers.
- `await node.debug()` — print a pretty HTML snapshot of the matched element.
- `await node.expectChain()` — chainable async matchers mirroring Playwright `expect`.
- `node.inspect()` — logs the locator selector chain and returns the node for chaining.
- `node.<child>()` — move into a child node defined in `children`.
- `node.<customName>(...args)` — call a custom getter method defined on the node (must accept `ctx` first and return a `Locator`). This is useful if you need to select multiple parts of a node.
- `node.skipToAlias()` — returns an object containing all aliased descendant nodes, allowing direct navigation to deeply nested nodes without traversing the full path.

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
  .get()

// use chained expectations
await home.heading().title()
  .expectChain()
  .toBeVisible()
  .then((c: ExpectChain) => c.toHaveText(/Playwright/));

// call a custom getter defined on the node (returns a wrapped locator)
await home.heading()
  .gitHubLinks()
  .getButtonByType('star'); // custom getter
```

### Building the Tree — Tips

- Keep nodes small and focused: each node should represent a meaningful UI fragment (header, list, item).
- Prefer composition over deep nesting: group related nodes under a parent rather than creating long access chains.
- Use `custom` getters for repeated or parameterized selections instead of inline locators.
- Return early from `build` with the narrowest locator possible so children can scope from it.

### UI Tips

- Name nodes by their role or intent (e.g., `navMain`, `productCard`) rather than DOM details.
- Avoid brittle selectors: prefer data attributes like `data-testid` when available.
- When a UI fragment is reused across pages, keep it as a separate subtree and import it into page descriptions.

## Examples

### Get a node

```ts
// descriptor snapshot for this example
const treeDescription = defineTree({
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
});

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
const treeDescription = defineTree({
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
});

const root = reselectTree(treeDescription)(page);
const home = root.playwrightHomePage();

await home.heading().debug();
```

### Chained expectations

```ts
// descriptor snapshot for this example
const treeDescription = defineTree({
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
});

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
const treeDescription = defineTree({
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
});

const root = reselectTree(treeDescription)(page);
const home = root.playwrightHomePage();

await home
  .heading()
  .gitHubLinks()
  .getButtonByType('star') // custom getter with arguments
  .expectChain()
  .toBeVisible();
```

#### Reusable list with custom getter

```ts
const treeDescription = defineTree({
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
          getItemByPosition: (ctx: Ctx, i: number) => {
            return ctx.locator.locator(`.user:nth-child(${i})`);
          },
        },
      },
    },
  },
});

const root = reselectTree(treeDescription)(page);

// Access multiple list item
await root
  .app()
  .userList()
  .getItemByPosition(1) // <- item 1
  .expectChain()
  .toHaveText('First User');

await root
  .app()
  .userList()
  .getItemByPosition(2) // <- item 2
  .expectChain()
  .toHaveText('Second User');
```

### Store a node in a variable and get multiple subparts from the stored variable

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

### Skip to Alias — Quick navigation to deeply nested nodes ✨ NEW

The `skipToAlias()` feature allows you to jump directly to deeply nested nodes without traversing the entire tree, making your tests more concise and maintainable.

> **✨ NEW in v0.4.0**: Navigate to deeply nested nodes instantly using aliases with full TypeScript autocomplete support!

#### Define aliases in your tree

Tag an `alias` property to any node you want to access quickly:

```ts
...
 nodeName: {
  alias: 'aliasName',
  build: (ctx: Ctx) => { 
 ...
```

#### Use skipToAlias() to jump directly to aliased nodes

Instead of traversing the entire tree, hop over! Consider this tree structure:

```
app
├── header
│   ├── topSection
│   │   └── headerLogo (alias: 'headerLogo') ⭐
│   └── bottomSection
│       └── menuBtn (alias: 'menuBtn') ⭐
└── content
    └── navigation
        └── search (alias: 'search') ⭐
```

With the above structure, you can skip directly to aliased nodes:

```ts
// Traditional way - verbose (traversing the full path)
await root
  .app()
  .header()
  .bottomSection()
  .navigation()
  .search()

// With skipToAlias - jump directly to the aliased node
await root
  .app().skipToAlias()
  .search()

// Preferred way to be used
// extract the aliases from the top level node
// Access multiple aliased nodes quickly
const { 
  headerLogo, 
  menuBtn, 
  search 
} = select(page).app().skipToAlias();

```

#### Benefits

- **Type-safe**: Full TypeScript autocomplete for all alias names
- **Scoped access**: `skipToAlias()` only shows aliases from descendant nodes (children and nested children)
- **Maintainable**: Change the tree structure without updating test navigation paths
- **Readable**: Makes test intent clearer by using semantic alias names

#### Scoping rules

The `skipToAlias()` method provides access to aliases from descendant nodes (children and nested children) based on your current position in the tree. Here's a visual representation of the scope hierarchy:

```
app
├── header
│   ├── topSection
│   │   └── headerLogo (alias: 'headerLogo')
│   └── bottomSection
│       └── menuBtn (alias: 'menuBtn')
└── content
    └── navigation
        └── search (alias: 'search')
```

**Scoping behavior:**

```ts
// From root, see all descendant aliases
const rootAliases = root.app().skipToAlias();
// ✅ rootAliases.headerLogo()
// ✅ rootAliases.menuBtn()
// ✅ rootAliases.search()

// From header, only see header's descendant aliases
const headerAliases = root.app().header().skipToAlias();
// ✅ headerAliases.headerLogo()
// ✅ headerAliases.menuBtn()
// ❌ headerAliases.search() - not a descendant of header

// From content, only see content's descendant aliases
const contentAliases = root.app().content().skipToAlias();
// ✅ contentAliases.search()
// ❌ contentAliases.headerLogo() - not a descendant of content
```

#### TypeScript Navigation Limitation in (VS Code)

**Limitation:** Ctrl+Click on alias method calls (e.g., `.headerLogoAlias()`) shows the type definition, not the actual node definition in the tree like when using a regular chain without an alias link. This is a TypeScript limitation with dynamically generated mapped types.

**Workaround:** Extract aliases via destructuring for better IDE navigation:

```ts
// Extract commonly used aliases
const { headerLogo, menuBtn, search } = select(page).app().skipToAlias();

// Now Ctrl+Click on the destructured variables works
await headerLogo().click();
await menuBtn().hover();
await expect(search()).toBeVisible();

// Also improves test readability
const { headerLogo, search } = select(page).app().skipToAlias();
await headerLogo().click();
await search().fill('playwright');
await search().press('Enter');
```

## Advanced

This section gives practical tips for building robust locator trees, structuring tests, and handling dynamic UI updates.

### Reuse Tree Branches Across UIs

Extract shared fragments (e.g., a header) into their own subtree and embed them in multiple page trees so you only update selectors once.

```ts
// header branch - use defineBranch for individual branches
import { defineBranch } from 'playwright-reselect';

export const header = defineBranch({
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
});
```
Import header and use it to build the tree at multiple part (write one reuse anywhere)
```ts
import { header } from './headerDescription'

const treeDescription = defineTree({
  home: {
    build: (ctx: Ctx) => {
      ctx.locator = ctx.page.locator('body');
    },
    children: {
      header, // <- home page header
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
      header, // <- docs page header
      sidebar: {
        build: (ctx: Ctx) => {
          ctx.locator = ctx.locator.getByRole('navigation');
        },
      },
    },
  },
});

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
    .getItemByPosition(1)
    .expectChain()
    .toBeVisible();
});
```

### Testing Dynamic Layout

- Use `expectChain()` with timeouts for elements that appear asynchronously.
- For complex animations or lazy loading, combine `locator.waitFor()` or `page.waitForResponse()` with assertions.
- Use `.debug()` to print the matched element HTML to quickly craft robust selectors.

```ts
// waiting for an async item
const item = await root
  .app()
  .userList()
  .getItemByPosition(3);

await item.waitFor({ state: 'visible', timeout: 5000 });

await root
  .app()
  .userList()
  .getItemByPosition(3)
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

Author and Maintainer: marcflavius <u7081838225@gmail.com>

Love making things simple. Rocket science! 🚀
