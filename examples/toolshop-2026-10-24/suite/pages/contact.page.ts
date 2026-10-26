import type { Locator, Page } from '@playwright/test';
import { chooseByTyping } from './select';

export class ContactPage {
  readonly heading: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly subject: Locator;
  readonly message: Locator;
  readonly send: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Contact' });
    this.firstName = page.getByLabel('First name', { exact: true });
    this.lastName = page.getByLabel('Last name', { exact: true });
    this.email = page.getByLabel('Email address', { exact: true });
    this.subject = page.getByLabel('Subject', { exact: true });
    this.message = page.getByLabel('Message', { exact: true });
    this.send = page.getByRole('button', { name: 'Send' });
  }

  async open(): Promise<void> {
    await this.page.goto('/#/contact');
    await this.send.waitFor();
  }

  // Signed-in customers only see the subject, message and attachment fields.
  async fillAsCustomer(subject: string, message: string): Promise<void> {
    await chooseByTyping(this.subject, subject);
    await this.message.fill(message);
  }

  async fill(details: { firstName: string; lastName: string; email: string; subject: string; message: string }): Promise<void> {
    await this.firstName.fill(details.firstName);
    await this.lastName.fill(details.lastName);
    await this.email.fill(details.email);
    await chooseByTyping(this.subject, details.subject);
    await this.message.fill(details.message);
  }
}
