import {Page, test, expect} from '@playwright/test';
import {faker} from '@faker-js/faker';
import * as OTPAuth from "otpauth"
import {createVerzoek} from "./ApiClient";

const infra: string = (process.env.INFRA === undefined) ? 'local' : process.env.INFRA;

const usernameLocal = process.env.USERNAME_LOCAL;
const passwordLocal = process.env.PASSWORD_LOCAL;
const apiTestRequestFile = process.env.API_TEST_REQUEST_FILE;
const apiRequestConfigFile = process.env.API_REQUEST_CONFIG_FILE;

test('bbz-aanvraag', async ({page}) => {
  test.setTimeout(200000)

  let lastName = faker.person.lastName();

  await createVerzoek(lastName, apiTestRequestFile, apiRequestConfigFile, infra);

  if (infra === "dev") {
    await loginLocal(page);
  }
  await page.waitForTimeout(2000)
  await navigateToCases(page);
  await searchForCases(page, lastName);
  await openCase(page, lastName);
  await waitForTask(page, 2000);
  await firstTask(page);
  const taskFound = await waitForBackend(page);
  if (!taskFound) {
    throw new Error('Task "Registeren aanvrager en dienst" did not appear after multiple refresh attempts');
  }
  await registrerenAanvragerEnDienst(page);

});

async function loginLocal(page: Page) {
  await page.goto('http://localhost:4200/');
  await page.getByLabel('Username or email').fill(usernameLocal);
  await page.getByLabel('Password').fill(passwordLocal);
  await page.getByRole('button', {name: 'Sign In'}).click();
}

async function navigateToCases(page: Page) {
  await page.getByRole('button', {name: 'Dossiers'}).click();
  await page.getByRole('link', {name: 'BBZ aanvraag'}).click();
  await page.getByRole('tab', {name: 'Alle dossiers'}).click();
}

async function searchForCases(page: Page, achternaam: string) {
  // First, click the accordion "Zoeken" button to expand the search panel
  await page.locator('button.cds--accordion__heading:has(.cds--accordion__title:text("Zoeken"))').click();

  // Fill in the last name field
  await page.locator('v-input').filter({hasText: 'Achternaam aanvrager'}).getByRole('textbox').click();
  await page.locator('v-input').filter({hasText: 'Achternaam aanvrager'}).getByRole('textbox').fill(achternaam);

  // Click the search button using the test ID
  await page.getByTestId('search-fields-search-button').click();
}

async function openCase(page: Page, achternaam: string) {
  await page.getByRole('cell', {name: achternaam}).first().click();
}

async function waitForTask(page: Page, timeout: number = 2000) {
  await test.step('wait for task', async () => {
    await page.waitForTimeout(timeout);
    await page.getByText('Voortgang').click();
    await page.waitForTimeout(2000);
    await page.getByText('Algemeen').click();
    await page.waitForTimeout(timeout);
  }, {box: true});
}

async function firstTask(page: Page) {
  await page.getByText('Toewijzen zaak aan').click();
  await page.getByRole('button', {name: 'Doorgaan'}).click();
}

async function waitForBackend(page: Page, taskText: string = 'Registeren aanvrager en dienst', maxAttempts: number = 10, waitTimeBetweenAttempts: number = 2000): Promise<boolean> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Check if the task is already visible
    const taskExists = await page.getByText(taskText).isVisible().catch(() => false);

    if (taskExists) {
      console.log(`Task "${taskText}" found after ${attempts + 1} attempts`);
      return true;
    }

    console.log(`Task "${taskText}" not found, refreshing page (attempt ${attempts + 1}/${maxAttempts})`);

    // Refresh the page
    await page.reload();

    // Wait for page to load after refresh
    await page.waitForLoadState('networkidle');

    // Additional wait time between attempts
    await page.waitForTimeout(waitTimeBetweenAttempts);

    attempts++;
  }

}

async function registrerenAanvragerEnDienst(page: Page) {
  await page.getByText('Algemeen').click();
  await page.getByText('Registeren aanvrager en dienst').click();
  await page.getByRole('button', {name: 'Doorgaan'}).click();
}

