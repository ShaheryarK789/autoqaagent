import type { Locator, Page } from '@playwright/test';
import { chooseByTyping } from './select';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByRole('textbox', { name: 'Your E-mail *' });
    this.password = page.getByRole('textbox', { name: 'Your password *' });
    this.submit = page.getByRole('button', { name: 'Login' });
    this.error = page.getByTestId('login-error');
  }

  async open(): Promise<void> {
    await this.page.goto('/#/auth/login');
    await this.submit.waitFor();
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}

export type Profile = {
  firstName: string;
  lastName: string;
  dob: string;
  address: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
  phone: string;
};

export class RegisterPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly dob: Locator;
  readonly address: Locator;
  readonly postcode: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly country: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(readonly page: Page) {
    this.firstName = page.getByLabel('First name', { exact: true });
    this.lastName = page.getByLabel('Last name', { exact: true });
    this.dob = page.getByLabel('Date of birth', { exact: true });
    this.address = page.getByLabel('Address', { exact: true });
    this.postcode = page.getByLabel('Postcode', { exact: true });
    this.city = page.getByLabel('City', { exact: true });
    // The State and Country labels are swapped in this build (see bug B10), so the
    // fields are located by test id here; auth.spec.ts asserts the labels.
    this.state = page.getByTestId('state');
    this.country = page.getByTestId('country');
    this.phone = page.getByLabel('Phone', { exact: true });
    this.email = page.getByLabel('E-mail address', { exact: true });
    this.password = page.getByRole('textbox', { name: 'Your password *' });
    this.submit = page.getByRole('button', { name: 'Register' });
  }

  async open(): Promise<void> {
    await this.page.goto('/#/auth/register');
    await this.submit.waitFor();
  }

  async register(profile: Profile, email: string, password: string): Promise<void> {
    await this.firstName.fill(profile.firstName);
    await this.lastName.fill(profile.lastName);
    await this.dob.fill(profile.dob);
    await this.address.fill(profile.address);
    await this.postcode.fill(profile.postcode);
    await this.city.fill(profile.city);
    await this.state.fill(profile.state);
    await chooseByTyping(this.country, profile.country);
    await this.phone.fill(profile.phone);
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
    await this.page.waitForURL(/#\/auth\/login/);
  }
}
