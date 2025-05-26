# Getting started
## Testing local dev
### Prerequisites
GZAC Sociaal Domein is running on http://localhost:4200


### Configuration
- Rename:  
`.env.properties.example`  
 to  
`.env.properties`
- In the directory `api-requests`, rename:  
`http-client.private.env.json.example`  
to    
`http-client.private.env.json`  
and put in your own properties

## Install
`npm install`

## Running
`npx playwright test --ui`

# Test Cases Documentation

This directory contains test cases and instructions for the GZAC Sociaal Domein test automation project.

## Directory Structure
- `cases.txt` - High-level overview of test cases
- `scenarios/` - Detailed test scenarios and instructions
- `data/` - Test data templates and examples

## Adding New Test Cases

1. First, add a high-level overview in `cases.txt`
2. Create detailed instructions in the `scenarios/` directory
3. Add any required test data templates in the `data/` directory

## Test Case Guidelines

### Writing Test Instructions
- Be specific and clear
- Include prerequisites
- List expected results
- Document any required test data
- Include error scenarios and handling

### Test Data
- Use faker.js for generating random data
- Document any specific data requirements
- Include example data formats

### Maintenance
- Keep test cases up to date
- Document any changes to the application that affect tests
- Regular review and cleanup of obsolete test cases 