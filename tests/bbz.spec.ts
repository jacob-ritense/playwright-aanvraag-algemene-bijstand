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

