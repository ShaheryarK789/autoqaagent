import { test, expect } from '../fixtures';
import { CUSTOMER, generatePassword, uniqueEmail } from '../data';

test.describe('Sign in and registration', () => {
  test('rejects a wrong password with a clear message', async ({ loginPage, page }) => {
    await loginPage.open();
    await loginPage.signIn(uniqueEmail('nobody'), generatePassword());

    await expect(loginPage.error).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/#\/auth\/login/);
  });

  test('a new customer registers, signs in and lands on My account', async ({ registerPage, loginPage, accountPage, page }) => {
    const email = uniqueEmail('register');
    const password = generatePassword();

    await registerPage.open();
    await registerPage.register(CUSTOMER, email, password);
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/#\/account$/);
    await expect(accountPage.heading).toBeVisible();
    await expect(loginPage.submit).toBeHidden();
  });

  test('signing in after a mistyped password lands on My account', async ({ registerPage, loginPage, accountPage, page }) => {
    const email = uniqueEmail('retry');
    const password = generatePassword();

    await registerPage.open();
    await registerPage.register(CUSTOMER, email, password);
    await loginPage.signIn(email, generatePassword());
    await expect(loginPage.error).toHaveText('Invalid email or password');
    await loginPage.signIn(email, password);

    await expect(page).toHaveURL(/#\/account$/);
    await expect(accountPage.heading).toBeVisible();
    await expect(loginPage.submit).toBeHidden();
  });

  test('an empty registration form shows required-field errors', async ({ registerPage, page }) => {
    await registerPage.open();
    await registerPage.submit.click();

    await expect(page.getByText('First name is required.')).toBeVisible();
    await expect(page.getByText('E-mail is required.')).toBeVisible();
    await expect(page.getByText('Password is required.')).toBeVisible();
    await expect(page).toHaveURL(/#\/auth\/register/);
  });

  test('the Country and State labels point at the right fields', async ({ registerPage, page }) => {
    await registerPage.open();

    await expect(page.getByRole('combobox', { name: 'Country' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'State' })).toBeVisible();
  });
});
