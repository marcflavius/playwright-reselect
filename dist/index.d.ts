import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared context passed into build/custom functions.
 */
type Ctx = {
    page: Page;
    locator: Locator;
    descriptor: TreeDescription;
};
/**
 * A custom method on a node:
 * - first arg MUST be ctx: Ctx
 * - rest args are what the user will actually pass when calling from the node.
 */
type CustomFn = (ctx: Ctx, ...args: any[]) => Locator;
type DescriptorType = {
    [key: string]: NodeDescription;
};
/**
 * Describes a node configuration for building and managing child nodes.
 * @property {Function} build - Function that constructs the node within a given context.
 * @property {DescriptorType} [children] - Optional child node descriptors.
 * @property {Record<string, CustomFn>} [custom] - Optional mapping of custom function names to their implementations.
 * @property {string} [alias] - Optional alias name for this node, allowing direct access from root.
 */
type NodeDescription = {
    build: (ctx: Ctx) => void;
    children?: DescriptorType;
    custom?: Record<string, CustomFn>;
    alias?: string;
};
/**
 * Utility: get the "user-visible" arguments of a CustomFn
 * (everything after the initial ctx).
 */
type CustomFnArgs<T> = T extends (ctx: Ctx, ...args: infer A) => any ? A : never;
/**
 * Helper to define a branch/node with proper type inference for aliases
 */
declare const defineBranch: <const T extends NodeDescription>(branch: T) => T;
/**
 * Helper to define the tree with proper type inference for aliases
 */
declare const defineTree: <const T extends TreeDescription>(tree: T) => T;
/**
 * Description of the locator tree:
 * - build: how to update ctx.locator at this node
 * - children: nested nodes
 * - custom: extra methods on this node (e.g. getTitle)
 */
type TreeDescription = {
    [key: string]: NodeDescription;
};
/**
 * Collect direct aliases (nodes with alias property) from a TreeDescription
 */
type DirectAliases<T extends TreeDescription> = {
    [K in keyof T as T[K] extends {
        alias: infer A extends string;
    } ? A : never]: T[K];
};
/**
 * Recursively collect all descendant aliases from nested children
 */
type NestedAliases<T extends TreeDescription> = UnionToIntersection<{
    [K in keyof T]: T[K] extends {
        children: infer C extends TreeDescription;
    } ? DirectAliases<C> & NestedAliases<C> : {};
}[keyof T]>;
/**
 * Helper type to convert union to intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
/**
 * Extract all descendant aliases from a descriptor, merging all found aliases
 */
type ExtractDescendantAliases<D> = D extends {
    children: infer C extends TreeDescription;
} ? DirectAliases<C> & NestedAliases<C> : {};
/**
 * Type for the object returned by skipToAlias().
 * Maps alias names to methods that jump directly to aliased descendant nodes.
 *
 * **TypeScript Navigation Limitation:**
 * Ctrl+Click on alias method calls (e.g., `.headerLogo()`) shows the type definition,
 * not the actual node source. This is a TypeScript limitation with mapped types.
 *
 * **Workaround:** Use destructuring for better IDE navigation:
 * ```ts
 * const { headerLogo, search } = select(page).app().skipToAlias();
 * await headerLogo().click(); // Ctrl+Click on "headerLogo" works here
 * ```
 */
type AliasesObject<D> = {
    [K in keyof ExtractDescendantAliases<D>]: () => NodeFromDesc<ExtractDescendantAliases<D>[K] & NodeDescription>;
};
type Get = Locator & {
    debug: () => Promise<void>;
    expectChain: () => ChainType;
};
/**
 * One node in the chain, derived from a description:
 * - always has get(): Locator
 * - has child methods if children are defined
 * - has custom methods if custom is defined
 */
type NodeFromDesc<D extends {
    children?: TreeDescription;
    custom?: Record<string, CustomFn>;
}> = {
    get: () => Get;
    inspect: () => NodeFromDesc<D>;
    debug: () => Promise<void>;
    expectChain: () => ChainType;
    skipToAlias: () => AliasesObject<D>;
} & (D['children'] extends TreeDescription ? {
    [K in keyof D['children']]: () => NodeFromDesc<D['children'][K]>;
} : {}) & (D['custom'] extends Record<string, CustomFn> ? {
    [K in keyof D['custom']]: (...a: CustomFnArgs<D['custom'][K]>) => Get;
} : {});
declare const chain: any;
type ChainType = {
    [K in keyof ReturnType<typeof expect<Locator>>]: ReturnType<typeof expect<Locator>>[K] extends (...a: infer A) => any ? (...a: A) => Promise<any> & typeof chain : never;
};
type ExpectChain = ReturnType<typeof expect<Locator>>;

/**
 * Root of the "in()" tree.
 */
type InReturnFromDesc<T extends TreeDescription> = {
    [K in keyof T]: () => NodeFromDesc<T[K]>;
};
declare const reselectTree: <T extends TreeDescription>(treeDescription: T) => (page: Page) => InReturnFromDesc<T>;

export { type Ctx, type ExpectChain, defineBranch, defineTree, reselectTree };
