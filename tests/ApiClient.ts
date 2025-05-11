import fs = require('fs');
import {request} from "@playwright/test";

export async function createVerzoek(achternaam: string, apiTestRequestFile: string, apiRequestConfigFile: string, environment: string) {
    console.log(apiRequestConfigFile)

    let config = readHttpRequestConfig(apiRequestConfigFile);
    let apiContext = await request.newContext();
    let objectsApiUrl = config[environment]?.objects_api_url;
    let objecttypesApiUrl = config[environment]?.objecttypes_api_url;
    let token = config[environment]?.token;
    const body = readHttpFile(apiTestRequestFile);
    body.type = objecttypesApiUrl;

    if (body?.record?.data?.data?.['uw-gegevens']?.digid?.persoongegevensPrefill) {
        body.record.data.data['uw-gegevens'].digid.persoongegevensPrefill.achternaamPrefill = achternaam;
    }

    const headers = {
        'Authorization': `Token ${token}`,
        'Content-Crs': 'EPSG:4326',
        'Content-Type': 'application/json'
    };

    const response = await apiContext.post(objectsApiUrl, {
        headers,
        data: JSON.stringify(body)
    });

    // Todo: this does now work as expected. We can also get 200 OK from Web application firewall login screen.
    if (response.ok()) {
        console.log('Data setup successfully.');
    } else {
        console.error('Data setup failed.', response.status(), await response.text());
    }
}

function readHttpRequestConfig(apiRequestConfigFile: string) {
    try {
        const data = fs.readFileSync(apiRequestConfigFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading or parsing the file:", err);
        return null;
    }
}

function readHttpFile(filePath: string) {
    console.log(filePath)
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const [_, bodyPart] = fileContent.split('\n\n');
    return JSON.parse(bodyPart);
}
