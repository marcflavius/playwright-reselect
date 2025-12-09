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
 */
type NodeDescription = {
    build: (ctx: Ctx) => void;
    children?: DescriptorType;
    custom?: Record<string, CustomFn>;
};
/**
 * Utility: get the "user-visible" arguments of a CustomFn
 * (everything after the initial ctx).
 */
type CustomFnArgs<T> = T extends (ctx: Ctx, ...args: infer A) => any ? A : never;
/**
 * Description of a single branch/page in the locator tree.
 * Alias for NodeDescription to make usage more clear when defining individual pages.
 */
type BranchDescription = NodeDescription;
/**
 * Description of the locator tree:
 * - build: how to update ctx.locator at this node
 * - children: nested nodes
 * - custom: extra methods on this node (e.g. getTitle)
 */
type TreeDescription = {
    [key: string]: NodeDescription;
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
} & (D['children'] extends TreeDescription ? {
    [K in keyof D['children']]: () => NodeFromDesc<D['children'][K]>;
} : {}) & (D['custom'] extends Record<string, CustomFn> ? {
    [K in keyof D['custom']]: (...a: CustomFnArgs<D['custom'][K]>) => Get;
} : {});
declare const chain: any;
type ChainType = {
    [K in keyof ReturnType<typeof expect<Locator>>]: ReturnType<typeof expect<Locator>>[K] extends (...a: infer A) => any ? (...a: A) => Promise<any> & typeof chain : never;
};
type LocatorExpect = ReturnType<typeof expect<Locator>>;

/**
 * Root of the "in()" tree.
 */
type InReturnFromDesc<T extends TreeDescription> = {
    [K in keyof T]: () => NodeFromDesc<T[K]>;
};
declare const reselectTree: <T extends TreeDescription>(treeDescription: T) => (page: Page) => InReturnFromDesc<T>;

export { type BranchDescription, type Ctx, type LocatorExpect, type TreeDescription, reselectTree };
