import type { Locator } from '@playwright/test';

// Some Angular selects in this app ignore programmatic selectOption; choosing by
// type-ahead on the focused control is what a keyboard user does and registers.
export async function chooseByTyping(select: Locator, optionText: string): Promise<void> {
  await select.focus();
  await select.page().keyboard.type(optionText);
  await select.page().keyboard.press('Tab');
}
