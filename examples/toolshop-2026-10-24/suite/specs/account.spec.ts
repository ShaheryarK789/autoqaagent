import { test, expect, AUTH_FILE } from '../fixtures';
import { CUSTOMER, PRODUCTS } from '../data';

test.describe('Account', () => {
  test.use({ storageState: AUTH_FILE });

  test('the header user menu shows the customer name', async ({ accountPage, header }) => {
    await accountPage.open();
    await expect(accountPage.heading).toBeVisible();

    await expect(header.userMenu).toHaveText(`${CUSTOMER.firstName} ${CUSTOMER.lastName}`);
  });

  test('the profile shows the customer own name and city', async ({ profilePage }) => {
    await profilePage.open();

    await expect(profilePage.postcode).toHaveValue(CUSTOMER.postcode);
    await expect(profilePage.firstName).toHaveValue(CUSTOMER.firstName);
    await expect(profilePage.lastName).toHaveValue(CUSTOMER.lastName);
    await expect(profilePage.city).toHaveValue(CUSTOMER.city);
  });

  test('the profile data sent to the browser does not include the password hash', async ({ profilePage }) => {
    const me = await (await profilePage.open()).json();

    expect(me.email).toContain('@example.test');
    expect(me).not.toHaveProperty('password');
  });

  test('My invoices only returns the signed-in customer own invoices', async ({ profilePage, accountPage }) => {
    const me = await (await profilePage.open()).json();
    const invoices = await (await accountPage.openInvoices()).json();

    const owners = [...new Set(invoices.data.map((invoice: { user_id: number }) => invoice.user_id))];
    expect(owners.filter((owner) => owner !== me.id)).toEqual([]);
  });

  test('an added favourite appears in My favorites', async ({ productPage, accountPage }) => {
    await productPage.open(PRODUCTS.pliers.id);
    await productPage.addToFavourites();

    await accountPage.openFavourites();
    await expect(accountPage.favourite(PRODUCTS.pliers.name)).toBeVisible();
  });
});
