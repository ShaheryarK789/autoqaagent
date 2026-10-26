import { test, expect } from '../fixtures';
import { PRODUCTS, lineTotal, money } from '../data';

test.describe('Mobile', () => {
  test('@mobile the hamburger menu opens and navigates to the contact page', async ({ catalogPage, header, contactPage, page }) => {
    await catalogPage.open();
    await expect(header.contactLink).toBeHidden();

    await header.menuToggle.click();
    await header.contactLink.click();

    await expect(page).toHaveURL(/#\/contact/);
    await expect(contactPage.heading).toBeVisible();
  });

  test('@mobile the cart total is correct on a phone', async ({ productPage, cartPage }) => {
    const item = PRODUCTS.slipJointPliers;
    await productPage.open(item.id);
    await productPage.addToCart(2);
    await cartPage.open();

    await expect(cartPage.cartTotal).toHaveText(money(lineTotal(item.price, 2)));
  });
});
