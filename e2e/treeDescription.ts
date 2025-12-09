import type { Ctx, TreeDescription, BranchDescription } from 'playwright-reselect';

const playwrightDocsPage = {
    build: (ctx: Ctx) => {
        ctx.locator = ctx.locator.locator('body');
    },
    children: {
        navigation: {
            build: (ctx: Ctx) => {
                ctx.locator = ctx.locator.getByRole('navigation', { name: 'Main' });
            },
        },
    },
} satisfies BranchDescription;

const playwrightHomePage = {
    build: (ctx: Ctx) => {
        ctx.locator = ctx.locator.locator('body');
    },
    children: {
        heading: {
            build: (ctx: Ctx) => {
                ctx.locator = ctx.locator.locator('header');
            },
            children: {
                // further nesting if needed
                title: {
                    build: (ctx: Ctx) => {
                        ctx.locator = ctx.locator.locator('h1');
                    },
                },
                startedButton: {
                    build: (ctx: Ctx) => {
                        ctx.locator = ctx.locator.locator('text=Get Started');
                    },
                },
                gitHubLinks: {
                    build: (ctx: Ctx) => {
                        ctx.locator = ctx.locator.locator('.github-btn.github-stargazers');
                    },
                    custom: {
                        getSome: (ctx: Ctx, num: number) => {
                            return ctx.locator.locator(`a.gh-btn >> nth=${num}`);
                        },
                        getButtonByType: (ctx: Ctx, type: 'star' | 'fork') => {
                            const className = type === 'star' ? '.gh-btn' : '.gh-count';
                            return ctx.locator.locator(`a${className}`)
                        }
                    },
                },
            },
        },
    },
} satisfies BranchDescription;

export const treeDescription = {
    playwrightDocsPage,
    playwrightHomePage,
} satisfies TreeDescription;