import type { Locator, Page } from '@playwright/test';

export class CartPage {
  readonly cartTotal: Locator;
  readonly proceedButton: Locator;

  constructor(readonly page: Page) {
    this.cartTotal = page.getByTestId('cart-total');
    this.proceedButton = page.getByTestId('proceed-1');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/checkout');
    await this.proceedButton.waitFor();
  }

  row(productName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: productName });
  }

  lineTotal(productName: string): Locator {
    return this.row(productName).getByTestId('line-price');
  }

  async changeQuantity(productName: string, quantity: number): Promise<void> {
    const input = this.row(productName).getByRole('spinbutton');
    await input.fill(String(quantity));
    await input.press('Tab');
  }

  async proceed(): Promise<void> {
    await this.proceedButton.click();
  }
}

export class CheckoutPage {
  readonly signedInMessage: Locator;
  readonly signedInProceed: Locator;
  readonly postcode: Locator;
  readonly addressProceed: Locator;
  readonly paymentMethod: Locator;
  readonly accountName: Locator;
  readonly accountNumber: Locator;
  readonly confirmButton: Locator;
  readonly paymentSuccess: Locator;
  readonly orderConfirmation: Locator;

  constructor(readonly page: Page) {
    this.signedInMessage = page.getByText(/you are already logged in/);
    // The step buttons repeat the same name or have none; their test ids tell the steps apart.
    this.signedInProceed = page.getByTestId('proceed-2');
    this.postcode = page.getByRole('textbox', { name: 'Your Postcode *' });
    this.addressProceed = page.getByTestId('proceed-3');
    this.paymentMethod = page.getByTestId('payment-method');
    this.accountName = page.getByRole('textbox', { name: 'Your Account name *' });
    this.accountNumber = page.getByRole('textbox', { name: 'Your Account number *' });
    this.confirmButton = page.getByRole('button', { name: 'Confirm' });
    this.paymentSuccess = page.getByText('Payment was successful');
    this.orderConfirmation = page.getByText(/Thanks for your order! Your invoice number is INV-\d+/);
  }

  async continueAsSignedIn(): Promise<void> {
    await this.signedInMessage.waitFor();
    await this.signedInProceed.click();
  }

  async continueWithAddress(postcode: string): Promise<void> {
    await this.postcode.fill(postcode);
    await this.addressProceed.click();
  }

  async payByBankTransfer(accountName: string, accountNumber: string): Promise<void> {
    await this.paymentMethod.selectOption('Bank Transfer');
    await this.accountName.fill(accountName);
    await this.accountNumber.fill(accountNumber);
    await this.confirmButton.click();
    await this.paymentSuccess.waitFor();
    await this.confirmButton.click();
    await this.orderConfirmation.waitFor();
  }

  async invoiceNumber(): Promise<string> {
    const text = await this.orderConfirmation.innerText();
    const match = text.match(/INV-\d+/);
    if (!match) throw new Error(`No invoice number in "${text}"`);
    return match[0];
  }
}
