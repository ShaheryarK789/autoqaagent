import { test, expect, AUTH_FILE } from '../fixtures';
import { CONTACT_MESSAGE, CUSTOMER, uniqueEmail } from '../data';

test.describe('Contact', () => {
  test('an empty contact form shows required-field errors', async ({ contactPage, page }) => {
    await contactPage.open();
    await contactPage.send.click();

    await expect(page.getByText('Subject is required')).toBeVisible();
    await expect(page.getByText('Message is required')).toBeVisible();
  });

  test('a valid contact message is sent', async ({ contactPage, page }) => {
    await contactPage.open();
    await contactPage.fill({
      firstName: CUSTOMER.firstName,
      lastName: CUSTOMER.lastName,
      email: uniqueEmail('contact'),
      subject: 'Customer service',
      message: CONTACT_MESSAGE,
    });

    const sent = page.waitForResponse((r) => r.url().includes('/messages') && r.request().method() === 'POST', { timeout: 10_000 });
    await contactPage.send.click();

    expect((await sent).ok()).toBe(true);
  });
});

test.describe('Contact as a signed-in customer', () => {
  test.use({ storageState: AUTH_FILE });

  test('a signed-in customer can send a contact message', async ({ contactPage, page }) => {
    await contactPage.open();
    await expect(page.getByText(/please fill out this form/)).toBeVisible();
    await contactPage.fillAsCustomer('Customer service', CONTACT_MESSAGE);

    const sent = page.waitForResponse((r) => r.url().includes('/messages') && r.request().method() === 'POST', { timeout: 10_000 });
    await contactPage.send.click();

    expect((await sent).ok()).toBe(true);
  });
});
