import { test as setup, expect, AUTH_FILE, SESSION_KEY } from './fixtures';
import { LoginPage, RegisterPage } from './pages/auth.page';
import { AccountPage } from './pages/account.page';
import { CUSTOMER, generatePassword, uniqueEmail } from './data';

// No shared test account exists for this app, so every run registers its own
// throwaway @example.test customer. The password lives only in memory.
setup('register and sign in a throwaway customer', async ({ page }) => {
  const email = uniqueEmail('session');
  const password = generatePassword();

  const registerPage = new RegisterPage(page);
  await registerPage.open();
  await registerPage.register(CUSTOMER, email, password);

  const loginPage = new LoginPage(page);
  await loginPage.signIn(email, password);
  await page.waitForURL(/#\/account$/);
  // The account view does not always render straight after login (bug B8); a reload
  // shows it. The sign-in test in auth.spec.ts asserts the unreloaded behaviour.
  await page.reload();
  await expect(new AccountPage(page).heading).toBeVisible();

  await page.evaluate((key) => {
    const token = window.sessionStorage.getItem(key);
    if (!token) throw new Error('No session token after sign-in');
    window.localStorage.setItem(key, token);
  }, SESSION_KEY);
  await page.context().storageState({ path: AUTH_FILE });
});
