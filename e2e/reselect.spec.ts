import { test, expect } from '@playwright/test';
import { reselectTree, type ExpectChain, defineTree, defineBranch, type Ctx } from 'playwright-reselect';

test.describe('playwright-reselect', () => {
	test.describe('basic functionality', () => {
		test('should create a simple tree with one node', async ({ page }) => {
			await page.setContent('<body><div>Test content</div></body>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('body');
					},
				},
			});

			const select = reselectTree(tree);
			const node = select(page).root();

			expect(node).toBeDefined();
			expect(node.get).toBeDefined();
			expect(node.debug).toBeDefined();
			expect(node.expectChain).toBeDefined();
			expect(node.inspect).toBeDefined();
			expect(node.skipToAlias).toBeDefined();
		});

		test('should navigate through children', async ({ page }) => {
			await page.setContent('<body><div>Child content</div></body>');

			const tree = defineTree({
				parent: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('body');
					},
					children: {
						child: {
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('div');
							},
						},
					},
				},
			});

			const select = reselectTree(tree);
			const childNode = select(page).parent().child();

			expect(childNode).toBeDefined();
			expect(childNode.get).toBeDefined();
		});

		test('should call custom methods', async ({ page }) => {
			await page.setContent('<div><button id="btn1">Button 1</button><button id="btn2">Button 2</button></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					custom: {
						getButtonById: (ctx: Ctx, id: string) => {
							return ctx.locator.locator(`#${id}`);
						},
					},
				},
			});

			const select = reselectTree(tree);
			const button = select(page).root().getButtonById('btn1');

			await expect(button).toHaveText('Button 1');
		});
	});

	test.describe('skipToAlias functionality', () => {
		test('should navigate to aliased node', async ({ page }) => {
			await page.setContent('<div><header><h1>Title</h1></header></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					children: {
						header: {
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('header');
							},
							children: {
								title: {
									alias: 'pageTitle',
									build: (ctx: Ctx) => {
										ctx.locator = ctx.locator.locator('h1');
									},
								},
							},
						},
					},
				},
			});

			const select = reselectTree(tree);
			const titleViaAlias = select(page).root().skipToAlias().pageTitle();
			const titleViaChain = select(page).root().header().title();

			// Both should work and point to the same element
			await expect(titleViaAlias.get()).toHaveText('Title');
			await expect(titleViaChain.get()).toHaveText('Title');
		});

		test('should only show descendant aliases', async ({ page }) => {
			await page.setContent('<div><header><h1>Title</h1></header><footer><p>Footer</p></footer></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					children: {
						header: {
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('header');
							},
							children: {
								title: {
									alias: 'headerTitle',
									build: (ctx: Ctx) => {
										ctx.locator = ctx.locator.locator('h1');
									},
								},
							},
						},
						footer: {
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('footer');
							},
							children: {
								text: {
									alias: 'footerText',
									build: (ctx: Ctx) => {
										ctx.locator = ctx.locator.locator('p');
									},
								},
							},
						},
					},
				},
			});

			const select = reselectTree(tree);

			// From header, should only see headerTitle, not footerText
			const headerAliases = select(page).root().header().skipToAlias();
			expect(headerAliases.headerTitle).toBeDefined();
			expect((headerAliases as any).footerText).toBeUndefined();

			// From footer, should only see footerText, not headerTitle
			const footerAliases = select(page).root().footer().skipToAlias();
			expect(footerAliases.footerText).toBeDefined();
			expect((footerAliases as any).headerTitle).toBeUndefined();

			// From root, should see both
			const rootAliases = select(page).root().skipToAlias();
			const headerTitle = rootAliases.headerTitle;
			console.info('@@headerTitle', headerTitle)
			expect(headerTitle).toBeDefined();
			expect(rootAliases.footerText).toBeDefined();
		});

		test('should return full subtree from alias', async ({ page }) => {
			await page.setContent('<div><section><h1>Title</h1><button>Click</button></section></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					children: {
						section: {
							alias: 'mySection',
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('section');
							},
							children: {
								title: {
									build: (ctx: Ctx) => {
										ctx.locator = ctx.locator.locator('h1');
									},
								},
								button: {
									build: (ctx: Ctx) => {
										ctx.locator = ctx.locator.locator('button');
									},
								},
							},
						},
					},
				},
			});

			const select = reselectTree(tree);

			// Navigate via alias and access children
			const aliasedSection = select(page).root().skipToAlias().mySection();

			// Should have access to all children
			expect(aliasedSection.title).toBeDefined();
			expect(aliasedSection.button).toBeDefined();

			await expect(aliasedSection.title().get()).toHaveText('Title');
			await expect(aliasedSection.button().get()).toHaveText('Click');
		});

		test('should work with custom methods on aliased nodes', async ({ page }) => {
			await page.setContent('<div><ul><li id="a">A</li><li id="b">B</li></ul></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					children: {
						list: {
							alias: 'itemList',
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('ul');
							},
							custom: {
								getItemById: (ctx: Ctx, id: string) => {
									return ctx.locator.locator(`#${id}`);
								},
							},
						},
					},
				},
			});

			const select = reselectTree(tree);

			// Access custom method via alias
			const item = select(page).root().skipToAlias().itemList().getItemById('a');

			await expect(item).toHaveText('A');
		});
	});

	test.describe('get, debug, inspect methods', () => {
		test('should return locator with get()', async ({ page }) => {
			await page.setContent('<div id="test">Content</div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('#test');
					},
				},
			});

			const select = reselectTree(tree);
			const locator = select(page).root().get();

			await expect(locator).toHaveText('Content');
			expect(locator.debug).toBeDefined();
			expect(locator.expectChain).toBeDefined();
		});

		test('should support inspect()', async ({ page }) => {
			const consoleSpy: string[] = [];
			const originalLog = console.log;
			console.log = (...args: any[]) => {
				consoleSpy.push(args.join(' '));
			};

			await page.setContent('<div id="test">Content</div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('#test');
					},
				},
			});

			const select = reselectTree(tree);
			const node = select(page).root().inspect();

			expect(node).toBeDefined();
			expect(consoleSpy.some(log => log.includes('[INSPECT]'))).toBe(true);

			console.log = originalLog;
		});

		test('should support debug()', async ({ page }) => {
			await page.setContent('<div id="test">Content</div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('#test');
					},
				},
			});

			const select = reselectTree(tree);
			const output = await select(page).root().debug();

			expect(output).toContain('[DEBUG]');
			expect(output).toContain('Content');
		});

		test('should support expectChain()', async ({ page }) => {
			await page.setContent('<div id="test">Content</div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('#test');
					},
				},
			});

			const select = reselectTree(tree);

			await select(page)
				.root()
				.expectChain()
				.toBeVisible()
				.then((chain: ExpectChain) => chain.toHaveText('Content'));
		});
	});

	test.describe('error handling', () => {
		test('should throw error when page is missing', () => {
			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('body');
					},
				},
			});

			const select = reselectTree(tree);

			expect(() => {
				select(null as any);
			}).toThrow('page is required');
		});
	});

	test.describe('complex scenarios', () => {
		test('should handle deeply nested navigation', async ({ page }) => {
			await page.setContent('<div><section><article><p>Deep content</p></article></section></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					children: {
						section: {
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('section');
							},
							children: {
								article: {
									build: (ctx: Ctx) => {
										ctx.locator = ctx.locator.locator('article');
									},
									children: {
										paragraph: {
											build: (ctx: Ctx) => {
												ctx.locator = ctx.locator.locator('p');
											},
										},
									},
								},
							},
						},
					},
				},
			});

			const select = reselectTree(tree);
			const paragraph = select(page).root().section().article().paragraph();

			await expect(paragraph.get()).toHaveText('Deep content');
		});

		test('should handle multiple custom methods', async ({ page }) => {
			await page.setContent('<div><button class="primary">Primary</button><button class="secondary">Secondary</button></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					custom: {
						getPrimary: (ctx: Ctx) => {
							return ctx.locator.locator('.primary');
						},
						getSecondary: (ctx: Ctx) => {
							return ctx.locator.locator('.secondary');
						},
					},
				},
			});

			const select = reselectTree(tree);
			const node = select(page).root();

			await expect(node.getPrimary()).toHaveText('Primary');
			await expect(node.getSecondary()).toHaveText('Secondary');
		});

		test('should handle mix of children and custom methods', async ({ page }) => {
			await page.setContent('<div><header><h1>Title</h1></header><button id="btn">Click</button></div>');

			const tree = defineTree({
				root: {
					build: (ctx: Ctx) => {
						ctx.locator = ctx.page.locator('div');
					},
					children: {
						header: {
							build: (ctx: Ctx) => {
								ctx.locator = ctx.locator.locator('header');
							},
							children: {
								title: {
									build: (ctx: Ctx) => {
										ctx.locator = ctx.locator.locator('h1');
									},
								},
							},
						},
					},
					custom: {
						getButton: (ctx: Ctx) => {
							return ctx.locator.locator('#btn');
						},
					},
				},
			});

			const select = reselectTree(tree);
			const node = select(page).root();

			await expect(node.header().title().get()).toHaveText('Title');
			await expect(node.getButton()).toHaveText('Click');
		});
	});

	test.describe('integration tests with stubbed content', () => {
		const createTree = () => {
			const playwrightDocsPage = defineBranch({
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
			});

			const playwrightHomePage = defineBranch({
				build: (ctx: Ctx) => {
					ctx.locator = ctx.locator.locator('body');
				},
				children: {
					heading: {
						alias: 'pageHeading',
						build: (ctx: Ctx) => {
							ctx.locator = ctx.locator.locator('header');
						},
						children: {
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
								alias: 'gitHubLinks',
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
			});

			return defineTree({
				playwrightDocsPage,
				playwrightHomePage,
			});
		};

		test.beforeEach(async ({ page }) => {
			await page.setContent(`
				<body>
					<header>
						<h1>Playwright enables reliable end-to-end testing for modern web apps.</h1>
						<button>Get Started</button>
						<div class="github-btn github-stargazers">
							<a class="gh-btn" href="https://github.com/microsoft/playwright">Star</a>
							<a class="gh-count">12.5k+</a>
						</div>
					</header>
				</body>
			`);
		});

		test('should test heading with chained expectations', async ({ page }) => {
			const select = reselectTree(createTree());
			
			await select(page)
				.playwrightHomePage()
				.heading()
				.title()
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Playwright/));
		});

		test('should navigate between pages', async ({ page }) => {
			const select = reselectTree(createTree());
			const homePage = select(page);
			const homePageHeading = homePage.playwrightHomePage().heading();
			
			await homePageHeading
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Playwright/));

			// Simulate navigation by changing content
			await homePageHeading.startedButton().get().click();
			
			// Stub the docs page content
			await page.setContent(`
				<body>
					<nav role="navigation" aria-label="Main">
						<a href="/">Playwright</a>
						<a href="/docs/intro">Docs</a>
						<a href="/api/intro">API</a>
						<a href="/nodejs">Node.js</a>
						<a href="/community">Community</a>
					</nav>
				</body>
			`);

			const docPage = select(page);
			const documentationNavigation = docPage.playwrightDocsPage().navigation();

			await documentationNavigation
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Playwright/))
				.then((c: ExpectChain) => c.toHaveText(/Docs/))
				.then((c: ExpectChain) => c.toHaveText(/API/))
				.then((c: ExpectChain) => c.toHaveText(/Node.js/))
				.then((c: ExpectChain) => c.toHaveText(/Community/));
		});

		test('should work with custom getter methods', async ({ page }) => {
			const select = reselectTree(createTree());
			const homePageHeading = select(page).playwrightHomePage().heading();
			
			await homePageHeading
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Playwright/));

			await homePageHeading.gitHubLinks().getButtonByType('star')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Star/));

			await homePageHeading.gitHubLinks().getButtonByType('fork')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toContainText('k+'));
		});

		test('should support debug method', async ({ page }) => {
			const select = reselectTree(createTree());
			const homePageHeading = select(page).playwrightHomePage().heading();
			
			await homePageHeading.gitHubLinks().getButtonByType('star')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Star/));

			const res = await homePageHeading.gitHubLinks().getButtonByType('star')
				.debug();

			expect(res).toContain('[DEBUG]');
			expect(res).toContain('Star');
			expect(res).toContain('gh-btn');
		});

		test('should support debug chaining with then', async ({ page }) => {
			const select = reselectTree(createTree());
			const homePageHeading = select(page).playwrightHomePage().heading();

			await homePageHeading.gitHubLinks().get().waitFor({ state: 'visible', timeout: 5000 });

			await homePageHeading.gitHubLinks().getButtonByType('star')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Star/));

			const res1 = await homePageHeading.gitHubLinks().getButtonByType('star')
				.debug()

			await homePageHeading.gitHubLinks().getButtonByType('star')
				.debug()
				.then((res) => expect(res).toBe(res1));
		});

		test('should have same output for debug() and get().debug()', async ({ page }) => {
			const select = reselectTree(createTree());
			const homePageHeading = select(page).playwrightHomePage().heading();

			await homePageHeading.gitHubLinks().get().waitFor({ state: 'visible', timeout: 5000 });
			await homePageHeading.gitHubLinks().getButtonByType('star')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Star/));

			const res1 = await homePageHeading
				.gitHubLinks()
				.get()
				.debug()
			const res2 = await homePageHeading.gitHubLinks()
				.debug()
			expect(res1).toBe(res2);
		});

		test('should support inspect method', async ({ page }) => {
			const select = reselectTree(createTree());
			const root = select(page);
			const homePageHeading = root
				.playwrightHomePage()
				.inspect()
				.heading();

			await homePageHeading
				.inspect()
				.gitHubLinks()
				.inspect()
				.getButtonByType('star')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Star/));
		});

		test('should wait for dynamic content', async ({ page }) => {
			const select = reselectTree(createTree());
			const homePageHeading = select(page).playwrightHomePage().heading();

			await homePageHeading.gitHubLinks().get().waitFor({ state: 'visible', timeout: 5000 });

			await homePageHeading.gitHubLinks().getButtonByType('star')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toHaveText(/Star/));

			await homePageHeading.gitHubLinks().getButtonByType('fork')
				.expectChain()
				.toBeVisible()
				.then((c: ExpectChain) => c.toContainText('k+'));
		});
	});
});
