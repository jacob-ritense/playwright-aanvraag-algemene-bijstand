# Algemene Bijstand Aanvraag Test Scenario

## Overview
This test scenario verifies the basic flow of creating and processing a algemene bijstand application in the GZAC Sociaal Domein system.

## Prerequisites
1. Environment Setup:
   - GZAC Sociaal Domein running on localhost:4200
   - Valid local credentials in .env.properties
   - API configuration properly set up

2. Test Data:
   - Automatically generated using faker.js
   - Last name will be randomly generated for unique identification

## Test Steps

### 1. Create Request
```typescript
// Example code for reference
await createVerzoek(lastName, apiTestRequestFile, apiRequestConfigFile, infra);
```
- System creates a new request via API
- Verify request creation success

### 2. Login and Navigation
```typescript
// Example steps
await loginLocal(page);
await navigateToCases(page);
```
- Login with local credentials
- Navigate to "Algemene Bijstand aanvraag" cases section
- Verify successful navigation

### 3. Case Processing
```typescript
// Example steps
await searchForCases(page, lastName);
await openCase(page, lastName);
```
- Navigate to "Alle dossiers"
- Verify case is there and accessible
- Open the case

### 4. 
- Wait for "Opvoeren dienst in Socrates" task
- Click on and complete the "Opvoeren dienst in Socrates" task

### 5. 
- Complete all subsequent tasks that appear in the case. 

## Expected Results
1. Request Creation:
   - New request should be created in the system
   - Request should have unique identifier

2. Navigation:
   - All navigation steps should complete without errors
   - Correct pages should load with expected elements

3. Case Processing:
   - Case should be searchable and accessible
   - All case details should be correct

4. Task Flow:
   - Tasks should appear in correct order
   - Task assignment should work as expected

## Error Scenarios
1. Request Creation Fails:
   - Check API connection
   - Verify configuration files
   - Check error messages

2. Navigation Issues:
   - Verify page URLs
   - Check element visibility
   - Validate page state

3. Task Processing:
   - Handle missing tasks
   - Manage timeout scenarios
   - Document error messages 