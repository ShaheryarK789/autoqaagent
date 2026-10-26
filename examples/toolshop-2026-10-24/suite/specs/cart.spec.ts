import { test, expect } from '../fixtures';
import { PRODUCTS, lineTotal, money } from '../data';

test.describe('Cart', () => {
  const item = PRODUCTS.slipJointPliers;

  test('changing the cart quantity recalculates the cart total', async ({ productPage, cartPage }) => {
    await productPage.open(item.id);
    await productPage.addToCart();
    await cartPage.open();
    await expect(cartPage.cartTotal).toHaveText(money(item.price));

    await cartPage.changeQuantity(item.name, 3);

    await expect(cartPage.cartTotal).toHaveText(money(lineTotal(item.price, 3)));
  });

  test('each cart line shows unit price times quantity', async ({ productPage, cartPage }) => {
    await productPage.open(item.id);
    await productPage.addToCart(2);
    await cartPage.open();

    await expect(cartPage.lineTotal(item.name)).toHaveText(money(lineTotal(item.price, 2)));
  });

  test('the + button raises the quantity on the product page', async ({ productPage }) => {
    await productPage.open(item.id);
    await expect(productPage.quantity).toHaveValue('1');

    await productPage.increaseQuantity.click();

    await expect(productPage.quantity).toHaveValue('2');
  });

  test('adding to the cart does not report an error', async ({ productPage, header }) => {
    await productPage.open(item.id);
    await productPage.addToCart();

    await expect(header.cartQuantity).toHaveText('1');
    await expect(productPage.toast).toBeVisible();
    await expect(productPage.toast).not.toContainText('something went wrong');
  });

  test('an out-of-stock product cannot be added to the cart', async ({ productPage }) => {
    await productPage.open(PRODUCTS.longNosePliers.id);

    await expect(productPage.outOfStock).toHaveText('Out of stock');
    await expect(productPage.addToCartButton).toBeDisabled();
  });
});
