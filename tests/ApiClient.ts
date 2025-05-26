import * as fs from 'fs';
import {request, expect} from "@playwright/test";

export async function createVerzoek(achternaam: string, apiTestRequestFile: string, apiRequestConfigFile: string, environment: string) {
    console.log('Creating verzoek with config file:', apiRequestConfigFile);

    let config = readHttpRequestConfig(apiRequestConfigFile);
    if (!config) {
        throw new Error(`Failed to read config from ${apiRequestConfigFile}`);
    }

    if (!config[environment]) {
        throw new Error(`Environment "${environment}" not found in config. Available environments: ${Object.keys(config).join(', ')}`);
    }

    let apiContext = await request.newContext();
    let objectsApiUrl = config[environment].objects_api_url;
    let objecttypesApiUrl = config[environment].objecttypes_api_url;
    let token = config[environment].token;
    let objecttypesVersion = config[environment].objecttypes_version;

    console.log('Using API URLs:', { objectsApiUrl, objecttypesApiUrl });
    console.log('Using Objecttypes Version:', objecttypesVersion);

    const body = readHttpFile(apiTestRequestFile);
    if (!body) {
        throw new Error(`Failed to read request body from ${apiTestRequestFile}`);
    }

    body.type = objecttypesApiUrl;

    // Ensure record and typeVersion exist before assigning
    if (body && body.record) {
        body.record.typeVersion = objecttypesVersion;
        console.log('Set body.record.typeVersion to:', body.record.typeVersion);
    } else {
        console.error('Request body or body.record is missing. Cannot set typeVersion.');
        throw new Error('Request body structure is invalid for setting typeVersion.');
    }

    // Update all relevant name fields in the request
    if (body?.record?.data?.data) {
        const data = body.record.data.data;
        
        // Update main applicant's last name
        if (data['uw-gegevens']?.naw?.grPersoongegevens) {
            data['uw-gegevens'].naw.grPersoongegevens.achternaam = achternaam;
            console.log('Updated main applicant last name to:', achternaam);
        } else {
            console.warn('Could not find grPersoongegevens structure to update last name. Path checked: data[\'uw-gegevens\']?.naw?.grPersoongegevens');
        }

        // Update company name if it exists
        if (data['foo-uw-ondernemingen']?.ingeschrevenOnderneming?.[0]) {
            const onderneming = data['foo-uw-ondernemingen'].ingeschrevenOnderneming[0];
            onderneming.ondernemingNaam = `${achternaam} Onderneming`;
            onderneming.korteOmschrijving = `Test aanvraag ${achternaam}`;
            console.log('Updated company details with last name');
        }

        // Update payment details if they exist
        if (data['foo-uitbetaling']) {
            data['foo-uitbetaling'].naamRekeninghouderBetaling = achternaam;
            console.log('Updated payment details with last name');
        }
    } else {
        throw new Error('Could not find data structure in request body');
    }

    const headers = {
        'Authorization': `Token ${token}`,
        'Content-Crs': 'EPSG:4326',
        'Content-Type': 'application/json'
    };

    console.log('Sending request to create verzoek...');
    const response = await apiContext.post(objectsApiUrl, {
        headers,
        data: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status());
    console.log('Response headers:', response.headers());
    
    let responseData;
    try {
        responseData = JSON.parse(responseText);
        console.log('Response data:', JSON.stringify(responseData, null, 2));
    } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        throw new Error(`Invalid JSON response: ${responseText}`);
    }

    // Verify response
    if (response.ok()) {
        if (responseText.includes('login') || responseText.includes('WAF')) {
            throw new Error('Received login page or WAF response instead of API response');
        }

        // Check if response has the expected structure
        if (!responseData || typeof responseData !== 'object') {
            throw new Error(`Invalid response structure. Expected object, got: ${typeof responseData}`);
        }

        // Look for ID in common response patterns
        const id = responseData.id || responseData.uuid || responseData.verzoekId || 
                  responseData.data?.id || responseData.record?.id;

        if (!id) {
            console.error('Full response:', JSON.stringify(responseData, null, 2));
            throw new Error('Response missing required ID field. Check console for full response.');
        }

        console.log('Verzoek created successfully with ID:', id);
        return {
            ...responseData,
            id: id // Ensure ID is at the top level
        };
    } else {
        let errorMessage = `Failed to create verzoek: ${response.status()}`;
        if (responseData && typeof responseData === 'object') {
            const errorDetail = responseData.detail || responseData.message || responseData.error || JSON.stringify(responseData);
            errorMessage += ` - ${errorDetail}`;
        } else {
            errorMessage += ` - ${responseText}`;
        }
        throw new Error(errorMessage);
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
    try {
        console.log('Reading request file:', filePath);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const [_, bodyPart] = fileContent.split('\n\n');
        return JSON.parse(bodyPart);
    } catch (err) {
        console.error("Error reading or parsing the request file:", err);
        return null;
    }
}
