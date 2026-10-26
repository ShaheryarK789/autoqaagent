import { test, expect, AUTH_FILE } from '../fixtures';
import { BANK_TRANSFER, CUSTOMER, PRODUCTS, lineTotal, money } from '../data';

test.describe('Checkout', () => {
  test.use({ storageState: AUTH_FILE });

  const item = PRODUCTS.combinationPliers;
  const quantity = 2;

  test('signed-in customer buys two items by bank transfer and gets an invoice number', async ({ productPage, cartPage, checkoutPage, header }) => {
    await productPage.open(item.id);
    await productPage.addToCart(quantity);
    await expect(header.cartQuantity).toHaveText(String(quantity));

    await cartPage.open();
    await expect(cartPage.cartTotal).toHaveText(money(lineTotal(item.price, quantity)));
    await cartPage.proceed();
    await checkoutPage.continueAsSignedIn();
    await checkoutPage.continueWithAddress(CUSTOMER.postcode);
    await checkoutPage.payByBankTransfer(BANK_TRANSFER.accountName, BANK_TRANSFER.accountNumber);

    await expect(checkoutPage.orderConfirmation).toBeVisible();
    await expect(header.cartQuantity).toBeHidden();
  });

  test('address step prefills the postcode saved on the customer profile', async ({ productPage, cartPage, checkoutPage }) => {
    await productPage.open(item.id);
    await productPage.addToCart();
    await cartPage.open();
    await cartPage.proceed();
    await checkoutPage.continueAsSignedIn();

    await expect(checkoutPage.postcode).toHaveValue(CUSTOMER.postcode);
  });

  test('a newly placed order appears in My invoices', async ({ productPage, cartPage, checkoutPage, accountPage, page }) => {
    await productPage.open(item.id);
    await productPage.addToCart();
    await cartPage.open();
    await cartPage.proceed();
    await checkoutPage.continueAsSignedIn();
    await checkoutPage.continueWithAddress(CUSTOMER.postcode);
    await checkoutPage.payByBankTransfer(BANK_TRANSFER.accountName, BANK_TRANSFER.accountNumber);
    const invoiceNumber = await checkoutPage.invoiceNumber();

    await accountPage.openInvoices();
    await expect(page.getByRole('cell', { name: invoiceNumber })).toBeVisible();
  });
});
