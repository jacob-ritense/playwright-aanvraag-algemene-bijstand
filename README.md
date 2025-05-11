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
