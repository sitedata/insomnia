import { test } from '../playwright/test';

test('Sign in with Gitlab', async ({ app, page }) => {
  await page.locator('text=Setup Git Sync').click();
  await page.locator('button:has-text("Repository Settings")').click();
  await page.locator('li[role="tab"]:has-text("GitLab")').click();

  const fakeGitLabOAuthWebFlow = app.evaluate(electron => {
    return new Promise<{ redirectUrl: string }>(resolve => {
      const webContents = electron.BrowserWindow.getAllWindows()[0].webContents;
      // Remove all navigation listeners so that only the one we inject will run
      webContents.removeAllListeners('will-navigate');
      webContents.on('will-navigate', (event: Event, url: string) => {
        event.preventDefault();
        const parsedUrl = new URL(url);
        // We use the same state parameter that the app created to assert that we prevent CSRF
        const stateSearchParam = parsedUrl.searchParams.get('state') || '';
        const redirectUrl = `insomnia://oauth/gitlab/authenticate?code=12345&state=${stateSearchParam}`;
        resolve({ redirectUrl });
      });
    });
  });

  const [{ redirectUrl }] = await Promise.all([
    fakeGitLabOAuthWebFlow,
    page.locator('text=Authenticate with GitLab').click({
      // When playwright clicks a link it waits for navigation to finish.
      // In our case we are stubbing the navigation and we don't want to wait for it.
      noWaitAfter: true,
    }),
  ]);

  await page.locator('input[name="link"]').click();
  await page.locator('input[name="link"]').fill(redirectUrl);
  await page.locator('button[name="add-token"]').click();

  test.expect(await page.locator('text="Mark Kim"')).toBeTruthy();
  test.expect(await page.locator('button[name="sign-out"]')).toBeTruthy();
});
