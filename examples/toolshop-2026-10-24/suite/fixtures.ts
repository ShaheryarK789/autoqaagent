import { test as base, expect } from '@playwright/test';
import { Header } from './pages/header.page';
import { CatalogPage } from './pages/catalog.page';
import { ProductPage } from './pages/product.page';
import { CartPage, CheckoutPage } from './pages/checkout.page';
import { LoginPage, RegisterPage } from './pages/auth.page';
import { AccountPage, ProfilePage } from './pages/account.page';
import { ContactPage } from './pages/contact.page';

export const AUTH_FILE = '.auth/user.json';

// The app keeps its session token in sessionStorage, which storageState does not save.
// auth.setup.ts copies it into localStorage before saving; this restores it for the app.
export const SESSION_KEY = 'auth-token';
function restoreSession(key: string) {
  const token = window.localStorage.getItem(key);
  if (token && !window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, token);
}

type Pages = {
  header: Header;
  catalogPage: CatalogPage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  accountPage: AccountPage;
  profilePage: ProfilePage;
  contactPage: ContactPage;
};

export const test = base.extend<Pages>({
  // The app exposes stable data-test attributes; getByTestId uses them.
  testIdAttribute: ['data-test', { option: true }],
  context: async ({ context }, use) => {
    await context.addInitScript(restoreSession, SESSION_KEY);
    await use(context);
  },
  header: async ({ page }, use) => use(new Header(page)),
  catalogPage: async ({ page }, use) => use(new CatalogPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  contactPage: async ({ page }, use) => use(new ContactPage(page)),
});

export { expect };
