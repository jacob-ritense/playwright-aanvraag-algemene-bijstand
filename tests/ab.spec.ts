import {Page, test, expect} from '@playwright/test';
import {faker} from '@faker-js/faker';
import * as OTPAuth from "otpauth"
import {createVerzoek} from "./ApiClient";

const infra: string = (process.env.INFRA === undefined) ? 'local' : process.env.INFRA;

const usernameLocal = process.env.USERNAME_LOCAL ?? '';
const passwordLocal = process.env.PASSWORD_LOCAL ?? '';
const apiTestRequestFile = process.env.API_TEST_REQUEST_FILE ?? '';
const apiRequestConfigFile = process.env.API_REQUEST_CONFIG_FILE ?? '';

test.describe('Algemene bijstand (DCM) Flow', () => {
  test('complete algemene-bijstand-aanvraag process', async ({page}) => {
    test.setTimeout(300000); // 5 minutes timeout for complete flow

    // Generate test data
    const testData = {
      lastName: faker.person.lastName(),
      requestId: null as string | null,
    };
    
    console.log('Test data:', testData);

    // 1. Create Request
    await test.step('Create verzoek via API', async () => {
      try {
        console.log('Using configuration:', {
          apiTestRequestFile,
          apiRequestConfigFile,
          infra
        });
        
        const response = await createVerzoek(testData.lastName, apiTestRequestFile, apiRequestConfigFile, infra);
        console.log('Create verzoek response:', JSON.stringify(response, null, 2));
        
        expect(response, 'API response should not be null').toBeTruthy();
        expect(response.id, 'Verzoek should have an ID').toBeTruthy();
        
        testData.requestId = response.id;
        console.log('Created verzoek with ID:', testData.requestId);
      } catch (error) {
        console.error('Failed to create verzoek:', error);
        throw error;
      }
    });

    // 2. Login and Navigation
    await test.step('Login and navigate to Algemene bijstand (DCM)', async () => {
      try {
        if (infra === "alo-dev" || infra === "local") {
          await loginLocal(page);
          console.log('Successfully logged in');
        }

        await initializeApplication(page);
        await navigateToAlgemeneBijstandAanvraag(page);
        console.log('Successfully navigated to Algemene bijstand (DCM)');
      } catch (error) {
        console.error('Failed during login/navigation:', error);
        throw error;
      }
    });

    // 3. Open Created Case
    await test.step('Open created case', async () => {
      try {
        if (!testData.lastName) {
          throw new Error('Cannot open case: No lastName available');
        }
        await openCreatedCase(page, testData.lastName);
        console.log('Successfully opened case');
      } catch (error) {
        console.error('Failed to open case:', error);
        throw error;
      }
    });

    // 4. Initial Task Processing
    await test.step('Process "Opvoeren dienst in Socrates" task', async () => {
      try {
        await waitForTask(page, 2000); // General wait, navigates to task tabs
        // await firstTask(page); // Assigns the case -- Temporarily commented out
        
        const taskName = "Opvoeren dienst in Socrates";
        const taskFound = await waitForSpecificTask(page, taskName);
        if (!taskFound) {
          throw new Error(`Task "${taskName}" did not appear after multiple refresh attempts`);
        }
        
        await completeSpecificTask(page, taskName);
        console.log(`Successfully completed task "${taskName}"`);
      } catch (error) {
        console.error('Failed during "Opvoeren dienst in Socrates" task processing:', error);
        throw error;
      }
    });

    // 5. Wait for next task to appear
    await test.step('Wait for next task and refresh', async () => {
      console.log('Waiting 20 seconds for new tasks to appear...');
      await page.waitForTimeout(20000);
      console.log('Refreshing page to load new tasks...');
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
      console.log('Page refreshed.');
    });

    // 6. Process "Overwegen uitzetten informatieverzoek" task
    await test.step('Process "Overwegen uitzetten informatieverzoek" task', async () => {
      try {
        const taskName = "Overwegen uitzetten informatieverzoek";
        console.log(`Looking for task: "${taskName}"`);

        // Wait for the task to appear in the panel
        const taskElement = page.getByText(taskName, { exact: true });
        await taskElement.waitFor({ state: 'visible', timeout: 30000 }); // Wait up to 30s for the task to be visible
        console.log(`Task "${taskName}" is visible.`);

        // Click the task to open/activate it
        console.log(`Clicking task: "${taskName}"`);
        await taskElement.click();

        // Wait for any navigation or modal to settle after clicking the task
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(2000); // Additional small delay for UI updates

        console.log(`Successfully clicked and opened task "${taskName}".`);
        
        // Interact with the form that appears after clicking the task
        console.log('Clicking "Nee" radio button...');
        await page.getByRole('radio', { name: 'Nee' }).check();

        console.log('Clicking "Indienen" button...');
        await page.getByRole('button', { name: 'Indienen' }).click();

        // Wait for page to settle after submission
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log('"Nee" selected and form submitted.');

      } catch (error) {
        console.error('Failed during "Overwegen uitzetten informatieverzoek" task processing:', error);
        // Take a screenshot for debugging
        try {
          await page.screenshot({ path: 'overwegen-uitzetten-infoverzoek-error.png', fullPage: true });
          console.log('Screenshot saved as overwegen-uitzetten-infoverzoek-error.png');
        } catch (screenshotError) {
          console.error('Failed to save error screenshot:', screenshotError);
        }
        throw error;
      }
    });

    // 7. Process "Overwegen inzet handhaving" task
    await test.step('Process "Overwegen inzet handhaving" task', async () => {
      try {
        const taskName = "Overwegen inzet handhaving";
        console.log(`Looking for task: "${taskName}"`);

        // Wait for the task to appear in the panel and click it
        const taskElement = page.getByText(taskName, { exact: true });
        await taskElement.waitFor({ state: 'visible', timeout: 30000 });
        console.log(`Task "${taskName}" is visible.`);
        await taskElement.click();
        console.log(`Clicked task: "${taskName}".`);

        // Wait for UI to update after clicking task
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(2000);

        // Interact with the form
        console.log('Clicking "Nee" radio button...');
        await page.getByRole('radio', { name: 'Nee' }).check();

        const toelichtingText = faker.lorem.words(3);
        console.log(`Filling "Toelichting" with: "${toelichtingText}"`);
        await page.getByRole('textbox', { name: 'Toelichting' }).fill(toelichtingText);

        console.log('Clicking "Indienen" button...');
        await page.getByRole('button', { name: 'Indienen' }).click();

        // Wait for page to settle after submission
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log('"Nee" selected, toelichting filled, and form submitted.');

      } catch (error) {
        console.error('Failed during "Overwegen inzet handhaving" task processing:', error);
        try {
          await page.screenshot({ path: 'overwegen-inzet-handhaving-error.png', fullPage: true });
          console.log('Screenshot saved as overwegen-inzet-handhaving-error.png');
        } catch (screenshotError) {
          console.error('Failed to save error screenshot:', screenshotError);
        }
        throw error;
      }
    });

    // 8. Process "Vaststellen identiteit aanvrager" task
    await test.step('Process "Vaststellen identiteit aanvrager" task', async () => {
      const taskName = "Vaststellen identiteit aanvrager";
      try {
        console.log(`Looking for task: "${taskName}"`);

        // Wait for the task to appear in the panel and click it
        const taskElement = page.getByText(taskName, { exact: true });
        await taskElement.waitFor({ state: 'visible', timeout: 30000 });
        console.log(`Task "${taskName}" is visible.`);
        await taskElement.click();
        console.log(`Clicked task: "${taskName}".`);

        // Wait for UI to update after clicking task (e.g., modal or new view to load)
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(3000); // Increased wait for form/buttons to be ready

        // Interact with the form/task view
        console.log('Clicking "Afronden" button...');
        await page.getByRole('button', { name: 'Afronden' }).click();

        // Wait for page to settle after action
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log(`Task "${taskName}" processed and "Afronden" button clicked.`);

      } catch (error) {
        console.error(`Failed during "${taskName}" task processing:`, error);
        try {
          await page.screenshot({ path: 'vaststellen-identiteit-aanvrager-error.png', fullPage: true });
          console.log('Screenshot saved as vaststellen-identiteit-aanvrager-error.png');
        } catch (screenshotError) {
          console.error('Failed to save error screenshot:', screenshotError);
        }
        throw error;
      }
    });

    // 9. Process "Vaststellen identiteit partner" task (if applicable)
    await test.step('Process "Vaststellen identiteit partner" task (if applicable)', async () => {
      const taskName = "Vaststellen identiteit partner";
      try {
        console.log(`Attempting to find task: "${taskName}"`);
        const taskElement = page.getByText(taskName, { exact: true });

        // Try to find the task, but with a shorter timeout as it's optional
        await taskElement.waitFor({ state: 'visible', timeout: 10000 }); 
        console.log(`Task "${taskName}" is visible.`);
        await taskElement.click();
        console.log(`Clicked task: "${taskName}".`);

        // Wait for UI to update
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(3000);

        console.log('Clicking "Afronden" button...');
        await page.getByRole('button', { name: 'Afronden' }).click();

        await page.waitForLoadState('networkidle', { timeout: 15000 });
        console.log(`Task "${taskName}" processed and "Afronden" button clicked.`);

      } catch (error) {
        // If the error is because the task was not found (e.g., TimeoutError), skip this task.
        if (error.name === 'TimeoutError' || error.message.includes('Timeout') || error.message.includes('waiting for selector')) {
          console.log(`Task "${taskName}" not found or not visible within timeout, skipping as it might be optional (no partner).`);
        } else {
          // For other errors, log them and re-throw
          console.error(`Failed during "${taskName}" task processing:`, error);
          try {
            await page.screenshot({ path: 'vaststellen-identiteit-partner-error.png', fullPage: true });
            console.log('Screenshot saved as vaststellen-identiteit-partner-error.png');
          } catch (screenshotError) {
            console.error('Failed to save error screenshot:', screenshotError);
          }
          throw error;
        }
      }
    });
  });
});

async function waitForAngular(page: Page) {
  console.log('Waiting for Angular to initialize...');
  try {
    // First, wait for the app-root element to be present in the DOM
    console.log('Waiting for app-root selector to be present...');
    await page.waitForSelector('app-root', { state: 'attached', timeout: 30000 }); // Wait up to 30s for 'app-root'
    console.log('app-root selector is present.');

    // Then, wait for Angular to finish bootstrapping using waitForFunction
    console.log('Attempting to find Angular app-root component via page.waitForFunction...');
    await page.waitForFunction(() => {
      const angular = (window as any).ng;
      const appRootElement = document.querySelector('app-root');
      return angular && appRootElement && angular.getComponent(appRootElement);
    }, { timeout: 30000 }); // 30 seconds timeout for Angular to be ready

    console.log('Angular app-root component found and initialized.');

    // Wait for initial navigation to complete
    console.log('Waiting for network idle after Angular initialization...');
    await page.waitForLoadState('networkidle', { timeout: 60000 }); // Increased timeout for networkidle
    console.log('Angular initialization complete and network is idle.');
  } catch (error) {
    console.error('Failed waiting for Angular:', error.message);
    try {
      const currentUrl = page.url();
      console.error('Current URL during Angular wait failure:', currentUrl);
      const content = await page.content();
      console.error('Page content during Angular wait failure (first 1000 chars):', content.substring(0,1000)); // Increased substring length
      await page.screenshot({ path: 'angular-wait-failure.png', fullPage: true });
      console.error('Screenshot saved as angular-wait-failure.png');
    } catch (debugError) {
      console.error('Could not get debug info during Angular wait failure:', debugError.message);
    }
    throw new Error(`Angular initialization timeout or error: ${error.message}`);
  }
}

async function loginLocal(page: Page) {
  console.log('Attempting local login...');
  const loginPageUrl = 'http://localhost:4200/';
  try {
    await page.goto(loginPageUrl);
    console.log(`Navigated to ${loginPageUrl}`);

    // Validate credentials
    if (!usernameLocal || !passwordLocal) {
      throw new Error('Missing local login credentials');
    }

    // Wait for login form to be ready
    console.log('Waiting for login form elements...');
    await page.waitForSelector('input[type="text"]', { state: 'visible', timeout: 10000 });
    await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 10000 });
    console.log('Login form elements are visible.');

    await page.getByLabel('Username or email').fill(usernameLocal);
    await page.getByLabel('Password').fill(passwordLocal);
    console.log('Filled username and password.');

    await page.getByRole('button', {name: 'Sign In'}).click();
    console.log('Clicked Sign In button.');

    // Wait for login to complete - check for URL change or a specific post-login element
    console.log('Waiting for navigation to occur after login...');
    try {
      // Wait for the URL to be different from the login page URL
      await page.waitForURL((url) => url.toString() !== loginPageUrl, { timeout: 15000 });
      console.log('URL changed after login to:', page.url());
    } catch (e) {
      console.error('URL did not change after login attempt within timeout.');
      await page.screenshot({ path: 'login-url-unchanged-error.png', fullPage: true });
      console.log('Screenshot saved as login-url-unchanged-error.png');
      throw new Error('Login failed: URL did not change after sign-in attempt.');
    }

    // Wait for network to be idle after potential navigation
    await page.waitForLoadState('networkidle', {timeout: 20000});
    console.log('Network is idle after login processing.');

    // Verify successful login by checking for absence of common error messages
    // This check is secondary if URL has already changed.
    const loginErrorVisible = await page.getByText(/invalid credentials|login failed/i).isVisible({timeout: 2000}); // Short timeout, should be quick if error is present
    if (loginErrorVisible) {
      await page.screenshot({ path: 'login-credentials-error.png', fullPage: true });
      console.log('Screenshot saved as login-credentials-error.png');
      throw new Error('Login failed - explicit error message displayed (e.g., invalid credentials).');
    }
    console.log('Local login appears successful.');

  } catch (error) {
    console.error('Login failed:', error.message);
    // Ensure a screenshot is taken if not already captured by more specific errors above
    if (!error.message.includes('URL did not change') && !error.message.includes('explicit error message')) {
        try {
            await page.screenshot({ path: 'login-generic-error.png', fullPage: true });
            console.log('Screenshot saved as login-generic-error.png');
        } catch (screenshotError) {
            console.error('Failed to save generic login error screenshot:', screenshotError.message);
        }
    }
    throw new Error(`Login failed: ${error.message}`);
  }
}

async function navigateToAlgemeneBijstandAanvraag(page: Page) {
  console.log('Navigating to Algemene bijstand (DCM) section...');
  try {
    // Wait for initial page load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Ensure Angular is ready
    await waitForAngular(page);
    
    console.log('Waiting for Dossiers menu...');
    // Wait for the menu to be ready
    const dossierButton = page.getByRole('button', {name: 'Dossiers'});
    await dossierButton.waitFor({ 
      state: 'visible',
      timeout: 30000 
    });
    
    // Try to ensure menu is clickable
    await page.waitForTimeout(1000);
    await dossierButton.click();
    
    console.log('Clicked Dossiers menu, waiting for Algemene bijstand (DCM) link...');
    // Wait for menu expansion and Algemene bijstand (DCM) link with retry
    let maxAttempts = 3;
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const abLink = page.getByRole('link', {name: 'Algemene bijstand (DCM)'});
        await abLink.waitFor({ state: 'visible', timeout: 10000 });
        await abLink.click();
        break;
      } catch (error) {
        attempts++;
        console.log(`Attempt ${attempts} to find Algemene bijstand (DCM) link failed, retrying...`);
        if (attempts < maxAttempts) {
          // Try clicking the menu again
          await dossierButton.click();
          await page.waitForTimeout(1000);
        } else {
          throw error;
        }
      }
    }
    
    console.log('Clicked Algemene bijstand (DCM), waiting for Alle dossiers tab...');
    // Wait for the page to settle after navigation
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Wait for tab to be visible and clickable with retry
    attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const alleDossiersTab = page.getByRole('tab', {name: 'Alle dossiers'});
        await alleDossiersTab.waitFor({ 
          state: 'visible',
          timeout: 15000 
        });
        
        // Ensure the tab is interactive
        await page.waitForTimeout(1000);
        await alleDossiersTab.click();
        
        // Wait for the table to load
        await page.waitForSelector('table', { 
          state: 'visible',
          timeout: 15000 
        });
        
        console.log('Successfully navigated to Alle dossiers tab');
        return;
      } catch (error) {
        attempts++;
        console.log(`Attempt ${attempts} to access Alle dossiers tab failed, retrying...`);
        if (attempts < maxAttempts) {
          // Try refreshing the page
          await page.reload();
          await waitForAngular(page);
          await page.waitForTimeout(2000);
        } else {
          throw new Error(`Failed to access Alle dossiers tab after ${maxAttempts} attempts: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('Navigation failed:', error);
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: 'navigation-error.png', fullPage: true });
      console.log('Screenshot saved as navigation-error.png');
    } catch (screenshotError) {
      console.error('Failed to save error screenshot:', screenshotError);
    }
    throw new Error(`Navigation failed: ${error.message}`);
  }
}

async function openCreatedCase(page: Page, lastName: string) {
  console.log(`Opening case for lastName: ${lastName}`);
  try {
    // Wait for the table to be visible
    await page.waitForSelector('table', { 
      state: 'visible',
      timeout: 15000 
    });

    // Look for the case by last name in the table
    const maxAttempts = 5;
    let attempts = 0;
    let caseFound = false;

    while (!caseFound && attempts < maxAttempts) {
      try {
        // Try to find the last name in any cell
        const caseCell = page.getByRole('cell', { name: lastName });
        
        if (await caseCell.isVisible()) {
          // Get the parent row
          const row = caseCell.locator('xpath=ancestor::tr');
          
          // Check if row is not disabled
          const isDisabled = await row.getAttribute('aria-disabled') === 'true';
          if (isDisabled) {
            throw new Error(`Case for ${lastName} is not accessible (locked/disabled)`);
          }

          // Click the row to open the case
          await row.click();
          
          // Wait for navigation and loading
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          await page.waitForLoadState('domcontentloaded');
          
          // Additional wait to ensure Angular has time to initialize
          await page.waitForTimeout(5000);
          
          caseFound = true;
          console.log('Found and clicked case row');
        } else {
          // If not found, try scrolling and waiting
          attempts++;
          console.log(`Case not found in current view, attempt ${attempts}/${maxAttempts}`);
          
          // Try to scroll the table
          await page.evaluate(() => {
            const table = document.querySelector('table');
            if (table) {
              table.scrollTop = table.scrollTop + 300;
            }
          });
          
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        attempts++;
        console.log(`Error finding case on attempt ${attempts}: ${error.message}`);
        if (attempts >= maxAttempts) {
          throw error;
        }
        await page.waitForTimeout(1000);
      }
    }

    if (!caseFound) {
      throw new Error(`Case for ${lastName} not found in table after ${maxAttempts} attempts`);
    }

    // Verify case details loaded correctly
    await verifyCaseDetails(page);
    
    console.log('Case opened successfully');
  } catch (error) {
    console.error('Failed to open case:', error);
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: 'case-open-error.png', fullPage: true });
      console.log('Screenshot saved as case-open-error.png');
      
      // Log the current URL and page content for debugging
      console.log('Current URL:', page.url());
      const content = await page.content();
      console.log('Page content:', content.substring(0, 500) + '...');
    } catch (screenshotError) {
      console.error('Failed to save error screenshot:', screenshotError);
    }
    throw new Error(`Failed to open case: ${error.message}`);
  }
}

async function verifyCaseDetails(page: Page) {
  console.log('Verifying case details...');
  try {
    // Log current URL and page title for debugging
    console.log('Current URL:', page.url());
    const title = await page.title();
    console.log('Page title:', title);

    // Wait for any loading indicators to disappear
    const loadingIndicator = page.getByRole('progressbar');
    if (await loadingIndicator.isVisible()) {
      console.log('Waiting for loading indicator to disappear...');
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    }

    // Check for common case detail elements with more flexible selectors
    type ElementCheck = {
      type: 'text' | 'class' | 'attr';
      content: string;
    };

    const possibleElements: ElementCheck[] = [
      // Text content
      { type: 'text', content: 'Voortgang' },
      { type: 'text', content: 'Algemeen' },
      { type: 'text', content: 'Details' },
      { type: 'text', content: 'Taken' },
      // Common class names
      { type: 'class', content: 'case-details' },
      { type: 'class', content: 'zaak-details' },
      { type: 'class', content: 'detail-view' },
      // Common attributes
      { type: 'attr', content: '[data-testid*="case"]' },
      { type: 'attr', content: '[data-testid*="zaak"]' }
    ];

    console.log('Checking for case detail elements...');
    let foundElements: string[] = [];
    for (const element of possibleElements) {
      let isVisible = false;
      if (element.type === 'text') {
        if (element.content === 'Taken') {
          // Use a more specific selector for the "Taken" heading
          isVisible = await page.getByRole('heading', { name: 'Taken', exact: true }).isVisible();
        } else {
          // Use the original generic selector for other text elements
          isVisible = await page.getByText(element.content, { exact: false }).isVisible();
        }
      } else if (element.type === 'class') {
        isVisible = await page.locator(`[class*="${element.content}"]`).isVisible();
      } else if (element.type === 'attr') {
        isVisible = await page.locator(element.content).isVisible();
      }
      
      if (isVisible) {
        foundElements.push(element.content);
      }
    }

    console.log('Found elements:', foundElements);

    if (foundElements.length === 0) {
      // Log the page content for debugging
      const content = await page.content();
      console.log('Page content:', content.substring(0, 500) + '...');
      throw new Error('No case detail elements found on the page');
    }

    // Try to interact with found elements
    const elementsToClick = ['Voortgang', 'Algemeen'] as const;
    for (const element of elementsToClick) {
      const elementHandle = page.getByText(element, { exact: true });
      if (await elementHandle.isVisible()) {
        try {
          await elementHandle.click();
          console.log(`Successfully clicked ${element}`);
        } catch (error) {
          console.log(`Could not click ${element}:`, error.message);
        }
      }
    }

    console.log('Case details verified successfully');
  } catch (error) {
    console.error('Case details verification failed:', error);
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: 'case-details-error.png', fullPage: true });
      console.log('Screenshot saved as case-details-error.png');
    } catch (screenshotError) {
      console.error('Failed to save error screenshot:', screenshotError);
    }
    throw error;
  }
}

async function waitForTask(page: Page, timeout: number = 2000) {
  console.log('Waiting for task to appear...');
  try {
    await test.step('wait for task', async () => {
      // Wait for initial page load
      await page.waitForLoadState('networkidle');
      
      // Navigate to Voortgang tab
      const voortgangTab = page.getByRole('tab', { name: 'Voortgang' });
      await voortgangTab.waitFor({ state: 'visible', timeout: 10000 });
      await voortgangTab.click();
      
      // Wait for task list to update
      await page.waitForTimeout(2000);
      
      // Navigate to Algemeen tab
      const algemeenTab = page.getByRole('tab', { name: 'Algemeen' });
      await algemeenTab.waitFor({ state: 'visible', timeout: 10000 });
      await algemeenTab.click();
      
      await page.waitForTimeout(timeout);
    }, {box: true});
  } catch (error) {
    console.error('Failed while waiting for task:', error);
    throw new Error(`Task wait failed: ${error.message}`);
  }
}

async function firstTask(page: Page) {
  console.log('Skipping firstTask (case assignment) as requested.'); // Added log
}

async function waitForSpecificTask(page: Page, taskName: string, maxAttempts: number = 10, waitTimeBetweenAttempts: number = 2000): Promise<boolean> {
  console.log(`Waiting for "${taskName}" task to appear...`);
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // Ensure we're on the correct tab (Algemeen often shows tasks)
      const algemeenTab = page.getByRole('tab', { name: 'Algemeen' });
      if (await algemeenTab.isVisible()) {
        await algemeenTab.click();
        await page.waitForLoadState('networkidle', { timeout: 5000 }); // Give time for tasks to load
      } else {
        console.log('Algemeen tab not visible, cannot ensure task visibility.');
        // Optionally, try Voortgang tab or proceed if Algemeen is not standard for tasks
        const voortgangTab = page.getByRole('tab', { name: 'Voortgang' });
        if (await voortgangTab.isVisible()){
            await voortgangTab.click();
            await page.waitForLoadState('networkidle', { timeout: 5000 });
        }
      }
      
      // Check if the task is already visible
      const taskElement = page.getByText(taskName, { exact: true }); // Use exact match for task names
      const isVisible = await taskElement.isVisible();

      if (isVisible) {
        console.log(`Task "${taskName}" found after ${attempts + 1} attempts`);
        return true;
      }

      console.log(`Task "${taskName}" not found, refreshing page (attempt ${attempts + 1}/${maxAttempts})`);

      // Refresh the page
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      // Add a slight delay after reload for content to settle
      await page.waitForTimeout(waitTimeBetweenAttempts); 

      attempts++;
    } catch (error) {
      console.error(`Error during attempt ${attempts + 1} to find task "${taskName}":`, error.message);
      attempts++;
      // If error is due to navigation or page instability, a reload might help
      if (attempts < maxAttempts) {
        try {
          await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(waitTimeBetweenAttempts);
        } catch (reloadError) {
          console.error('Failed to reload page during error recovery:', reloadError.message);
        }
      }
    }
  }
  console.error(`Task "${taskName}" not found after ${maxAttempts} attempts.`);
  return false;
}

async function completeSpecificTask(page: Page, taskName: string) {
  console.log(`Starting to complete specific task: "${taskName}"...`);
  try {
    // Ensure we're on the correct tab if applicable
    const algemeenTab = page.getByRole('tab', { name: 'Algemeen' });
     if (await algemeenTab.isVisible()) {
        await algemeenTab.click();
        await page.waitForLoadState('networkidle', { timeout: 5000 });
    }

    // Find and click the specified task
    const taskElement = page.getByText(taskName, { exact: true });
    await taskElement.waitFor({ state: 'visible', timeout: 20000 }); // Increased timeout for task to appear
    console.log(`Clicking task: "${taskName}"`);
    await taskElement.click();
    
    // Wait for any modal or navigation after clicking the task
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.waitForTimeout(1000); // Small delay for UI to update

    // Attempt to fill any inputs that may have appeared
    await fillFormInputs(page); // Re-use existing generic form filler

    // Attempt to complete the task using common action buttons
    await completeTask(page); // Re-use existing generic task completer
    
    console.log(`Attempted to complete specific task "${taskName}"`);
  } catch (error) {
    console.error(`Failed during completion of specific task "${taskName}":`, error.message);
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: `complete-specific-task-${taskName.replace(/\\s+/g, '_')}-error.png`, fullPage: true });
      console.log('Screenshot saved for specific task error.');
    } catch (screenshotError) {
      console.error('Failed to save error screenshot for specific task:', screenshotError);
    }
    throw new Error(`Failed to complete specific task "${taskName}": ${error.message}`);
  }
}

async function initializeApplication(page: Page) {
  console.log('Initializing application...');
  try {
    console.log('Current URL before waitForAngular:', page.url()); // Log current URL
    await page.screenshot({ path: 'debug-before-angular-wait.png' }); // Take a screenshot
    console.log('Screenshot taken as debug-before-angular-wait.png');
    await waitForAngular(page);
    console.log('Angular application initialized');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    // The screenshot 'angular-wait-failure.png' is already taken inside waitForAngular on failure.
    // Log the URL at the point of catching the error within initializeApplication
    console.error('URL when error caught in initializeApplication:', page.url());
    throw new Error(`Application initialization failed: ${error.message}`);
  }
}

async function fillFormInputs(page: Page) {
  // Handle text inputs
  const inputs = await page.getByRole('textbox').all();
  for (const input of inputs) {
    if (!await input.inputValue()) {
      const placeholder = await input.getAttribute('placeholder') || '';
      const label = await input.getAttribute('aria-label') || placeholder;
      const value = generateInputValue(label);
      await input.fill(value);
      console.log(`Filled input "${label}" with value: ${value}`);
    }
  }

  // Handle checkboxes
  const checkboxes = await page.getByRole('checkbox').all();
  for (const checkbox of checkboxes) {
    if (!await checkbox.isChecked()) {
      await checkbox.check();
      console.log('Checked required checkbox');
    }
  }

  // Handle radio buttons
  const radioGroups = await page.getByRole('radiogroup').all();
  for (const group of radioGroups) {
    const radios = await group.getByRole('radio').all();
    if (radios.length > 0) {
      const firstRadio = radios[0];
      if (!await firstRadio.isChecked()) {
        await firstRadio.check();
        console.log('Selected first radio button option');
      }
    }
  }
}

function generateInputValue(label: string): string {
  // Generate appropriate test data based on the input label
  const lowercaseLabel = label.toLowerCase();
  if (lowercaseLabel.includes('email')) {
    return faker.internet.email();
  } else if (lowercaseLabel.includes('telefoon') || lowercaseLabel.includes('number')) {
    return faker.phone.number();
  } else if (lowercaseLabel.includes('datum')) {
    return faker.date.recent().toISOString().split('T')[0];
  } else if (lowercaseLabel.includes('bedrag') || lowercaseLabel.includes('amount')) {
    return faker.number.int({ min: 100, max: 1000 }).toString();
  } else {
    return faker.lorem.words(3);
  }
}

async function completeTask(page: Page) {
  // Look for and click any confirm/continue buttons
  const buttonTexts = ['Bevestigen', 'Doorgaan', 'Opslaan', 'Afronden', 'Volgende', 'De dienst is opgevoerd in Socrates'];
  
  for (const text of buttonTexts) {
    const button = page.getByRole('button', { name: text });
    if (await button.isVisible()) {
      await button.click();
      await page.waitForLoadState('networkidle');
      console.log(`Clicked ${text} button to complete task`);
      return;
    }
  }
  
  throw new Error('No completion button found for task');
}

