import { test, expect } from '@playwright/test';
import { LocatorExpect, reselectTree } from 'playwright-reselect';
import { treeDescription } from './treeDescription';

const select = reselectTree(treeDescription);

test.beforeEach(async ({ page }) => {
	await page.goto('https://playwright.dev/');
});
test('example - playwright style - test heading', async ({ page }) => {
	const heading = page.locator('h1');
	await expect(heading).toHaveText(/Playwright/);
	await expect(heading).toBeVisible();
	expect(await heading.evaluate((el) => el.outerHTML)).toContain('Playwright');
});

test('example - playwright-reselect style - test heading', async ({ page }) => {
	await select(page)
		.playwrightHomePage()
		.heading()
		.title()
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Playwright/));
});

test('example - navigate to a new domain', async ({ page }) => {
	const homePage = select(page);
	const homePageHeading = homePage.playwrightHomePage().heading();
	await homePageHeading
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Playwright/));

	await homePageHeading.startedButton().get().click();
	await page.waitForURL('https://playwright.dev/docs/intro');
	expect(page.url()).toContain('docs/intro');

	const docPage = select(page);
	const documentationNavigation = docPage.playwrightDocsPage().navigation();

	await documentationNavigation
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Playwright/))
		.then((c: LocatorExpect) => c.toHaveText(/Docs/))
		.then((c: LocatorExpect) => c.toHaveText(/API/))
		.then((c: LocatorExpect) => c.toHaveText(/Node.js/))
		.then((c: LocatorExpect) => c.toHaveText(/Community/));
});
test('feature - can call custom getter method', async ({ page }) => {
	const homePage = select(page);
	const homePageHeading = homePage.playwrightHomePage().heading();
	await homePageHeading
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Playwright/));

	await homePageHeading.gitHubLinks().getButtonByType('star')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Star/));

	await homePageHeading.gitHubLinks().getButtonByType('fork')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toContainText('k+'));
});
test('feature - can call multiple get from one node at different nested levels', async ({ page }) => {
	const homePage = select(page);
	const homePageHeading = homePage.playwrightHomePage().heading();
	await homePageHeading
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Playwright/));

	await homePageHeading.gitHubLinks()
		.getButtonByType('fork')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toContainText('k+'));

	await homePageHeading
		.title()
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toContainText('Playwright enables reliable end-to-end testing for modern web apps.'));
});

test('feature - Testing dynamic layout', async ({ page }) => {
	const homePage = select(page);
	const homePageHeading = homePage.playwrightHomePage().heading();

	await homePageHeading.gitHubLinks().get().waitFor({ state: 'visible', timeout: 5000 });

	await homePageHeading.gitHubLinks().getButtonByType('star')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Star/));

	await homePageHeading.gitHubLinks().getButtonByType('fork')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toContainText('k+'));

	// use debug when unsure what the locator matches
	await homePageHeading
		.get()
});
test('feature - debug can be returned', async ({ page }) => {
	const homePageHeading = select(page).playwrightHomePage().heading();
	await homePageHeading.gitHubLinks().getButtonByType('star')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Star/));

	const res = await homePageHeading.gitHubLinks().getButtonByType('star')
		.debug();

	expect(res).toBe(`
[DEBUG] locator(':root').locator('.github-btn.github-stargazers').locator('a.gh-btn')
<a class="gh-btn" href="https://github.com/microsoft/playwright" rel="noopener noreferrer" target="_blank" aria-label="Star microsoft/playwright on GitHub">
  <span class="gh-ico" aria-hidden="true">
  </span>
  <span class="gh-text">Star</span>
</a>
`);

});
test('feature - debug can be chained with then', async ({ page }) => {
	const homePage = select(page);
	const homePageHeading = homePage.playwrightHomePage().heading();

	await homePageHeading.gitHubLinks().get().waitFor({ state: 'visible', timeout: 5000 });

	await homePageHeading.gitHubLinks().getButtonByType('star')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Star/));

	const res1 = await homePageHeading.gitHubLinks().getButtonByType('star')
		.debug()

	await homePageHeading.gitHubLinks().getButtonByType('star')
		.debug()
		.then((res) => expect(res).toBe(res1));

});
test('feature - get cannot be chained to get nor custom getter', async ({ page }) => {
	const homePage = select(page);
	const homePageHeading = homePage.playwrightHomePage().heading();

	await homePageHeading.gitHubLinks().get().waitFor({ state: 'visible', timeout: 5000 });
	await homePageHeading.gitHubLinks().getButtonByType('star')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Star/));

	expect(() => {
		homePageHeading.gitHubLinks()
			.get()
			// @ts-ignore
			.get()
	}).toThrowError('homePageHeading.gitHubLinks(...).get(...).get is not a function');
	expect(() => {
		homePageHeading.gitHubLinks()
			.get()
			// @ts-ignore
			.getButtonByType('star')
	}).toThrowError('homePageHeading.gitHubLinks(...).get(...).getButtonByType is not a function');
});
test('feature - debug return same output as get().debug()', async ({ page }) => {
	const homePage = select(page);
	const homePageHeading = homePage.playwrightHomePage().heading();

	await homePageHeading.gitHubLinks().get().waitFor({ state: 'visible', timeout: 5000 });
	await homePageHeading.gitHubLinks().getButtonByType('star')
		.expectChain()
		.toBeVisible()
		.then((c: LocatorExpect) => c.toHaveText(/Star/));

	const res1 = await homePageHeading
		.gitHubLinks()
		.get()
		.debug()
	const res2 = await homePageHeading.gitHubLinks()
		.debug()
	expect(res1).toBe(res2);

});
test('feature - inspect', async ({ page }) => {
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
		.then((c: LocatorExpect) => c.toHaveText(/Star/));

});
