
import fs from 'fs'
import path from 'path'
import ts from 'typescript'
import { Account, Issuer, Algorithm } from '@truenetworkio/sdk/dist/utils/cli-config.js'
import { ACM_DIRECTORY_NAME, ACM_HELPER_FILE_NAME, CONFIG_FILE_NAME, TRUE_DIRECTORY_NAME, configPath, constructConfigFileData } from './constants.js'

export const checkIfFileExists = (fileName: string) => {
  const filePath = path.join(process.cwd(), fileName);

  // Check if .env file exists, if not create it
  return fs.existsSync(filePath)
}

export const writeToFile = (fileName: string, data: string) => {
  const filePath = path.join(process.cwd(), fileName);


  // Check if .env file exists, if not create it
  fs.writeFileSync(filePath, data);

}

export const createAlgorithmHelperFile = (data: string, directory: string) => {

  const directoryPath = path.join(process.cwd(), directory, "assembly");

  if (!fs.existsSync(directoryPath))
    fs.mkdirSync(ACM_DIRECTORY_NAME)

  const filePath = path.join(directoryPath, ACM_HELPER_FILE_NAME);

  try {
    fs.writeFileSync(filePath, data)
    return true;
  } catch (e) {
    return false;
  }
}

export const createConfigFile = (account: Account, issuer: Issuer) => {

  const directoryPath = path.join(process.cwd(), TRUE_DIRECTORY_NAME);

  if (!fs.existsSync(directoryPath))
    fs.mkdirSync(TRUE_DIRECTORY_NAME)

  const filePath = path.join(directoryPath, CONFIG_FILE_NAME);

  try {
    fs.writeFileSync(filePath, constructConfigFileData(account, issuer))
    return true;
  } catch (e) {
    return false;
  }
}

// Function to create or append to .env file
export function writeToEnvFile(data: string) {
  const envFilePath = path.join(process.cwd(), '.env');

  // Check if .env file exists, if not create it
  if (!fs.existsSync(envFilePath)) {
    fs.writeFileSync(envFilePath, data);
    console.log('\n.env file created successfully.');
  } else {
    // Append data to existing .env file
    fs.appendFileSync(envFilePath, '\n' + data);
    console.log('\nSecret added to .env file successfully.');
  }
}


// Function to create or append to .env file
export function writeToGitIgnore(data: string) {
  const envFilePath = path.join(process.cwd(), '.gitignore');

  // Check if .env file exists, if not create it
  if (!fs.existsSync(envFilePath)) {
    fs.writeFileSync(envFilePath, data);
  } else {
    // Append data to existing .env file
    fs.appendFileSync(envFilePath, '\n' + data);
  }
}


function replaceEnvVariables(str: string): string {
  return str.replace(/process.env.*\b/g, (_, key) => {
    return `"${process.env[_.split('.')[2]]}"` || ''
  });
}

type ParsedConfigObject = {
  account: Account,
  issuer: Issuer,
  algorithm?: Algorithm
}

// Function to read object from TypeScript file
export function readObjectFromFile(filePath: string): ParsedConfigObject | null {
  try {
    // Load environment variables from a file
    const envFile = process.cwd() + '/.env'; // Update with the path to your environment file
    const envData = fs.readFileSync(envFile, 'utf8');
    const envLines = envData.split('\n');
    envLines.forEach(line => {
      const [key, value] = line.split('=');
      process.env[key] = value;
    });

    // Read the TypeScript file
    let tsCode = fs.readFileSync(filePath, 'utf8',);

    tsCode = replaceEnvVariables(tsCode)
    // Transpile TypeScript to JavaScript
    const jsCode = ts.transpileModule(tsCode, {
      compilerOptions: {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
      }
    }).outputText;

    const objectRegex = /exports\.config\s*=\s*({[\s\S]*?});/;

    // Match the object using regular expression
    const match = jsCode.match(objectRegex);
    // Check if a match is found
    if (match) {

      let objString = match[1].replace('sdk_1.testnet', '"testnet"')
      objString = objString.replace('sdk_1.localnet', '"localnet"')
      objString = objString.replaceAll(/schemas:\s*\[[\s\S]*?\]/g, '')
      objString = objString.replaceAll(/schemas:\s*\[[\s\S]*?\],/g, '')
      const config = Function(`"use strict"; return (${objString});`)();

      return config as ParsedConfigObject
    } else {
      console.log('No object found in the JavaScript code string.');
      return null;
    }
  } catch (e) {
    console.log('error:', e)
    return null;
  }
}

function extractSchemaValues(inputString: string) {
  // Regex to match the schemas array
  const schemasRegex = /schemas:\s*\[([\s\S]*?)\]/;

  // Extract the content inside the brackets
  const match = inputString.match(schemasRegex);

  if (!match) {
    return []; // Return an empty array if no match is found
  }

  // Get the content inside the brackets
  const schemaContent = match[1];

  // Split the content by commas, trim whitespace, and remove empty entries
  const schemaArray = schemaContent
    .split(',')
    .map(item => item.trim())
    .filter(item => item !== '');

  return schemaArray;
}

function executeJSInContext(jsCode: string, commandToExecute: string) {
  // Create a new function that wraps the jsCode and the command to execute
  const wrappedCode = `
    ${jsCode}
    
    // Return the result of the command
    (function() {
      return ${commandToExecute};
    })();
  `;

  // Use Function constructor instead of eval for better scoping
  const executionFunction = new Function(wrappedCode);

  try {
    // Execute the function and return the result
    return executionFunction();
  } catch (error) {
    console.error('Error executing command:', error);
    return null;
  }
}

// Function to read object from TypeScript file
export function readConfigForAlgos(filePath: string) {
  try {
    // Load environment variables from a file
    const envFile = process.cwd() + '/.env'; // Update with the path to your environment file
    const envData = fs.readFileSync(envFile, 'utf8');
    const envLines = envData.split('\n');
    envLines.forEach(line => {
      const [key, value] = line.split('=');
      process.env[key] = value;
    });

    // Read the TypeScript file
    let tsCode = fs.readFileSync(filePath, 'utf8',);

    tsCode = replaceEnvVariables(tsCode)
    // Transpile TypeScript to JavaScript
    const jsCode = ts.transpileModule(tsCode, {
      compilerOptions: {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
      }
    }).outputText;

    console.log(jsCode)
    const schemas = extractSchemaValues(jsCode)

    console.log('schemas', schemas)
    if (schemas.length == 0) {
      throw Error("No schemas found in the configuration file.")
    }

    const result = executeJSInContext(jsCode, `${schemas[0]}.getSchemaObject()`)

    console.log(result)

    // const objectRegex = /schemas:\s*\[[\s\S]*?\]/g;

    // // Match the object using regular expression
    // const match = jsCode.match(objectRegex);
    // // Check if a match is found
    // if (match) {

    //   // Fetch list of variable names as strings, and 

    //   // const config = Function(`"use strict"; return (${objString});`)();

    //   // return config as ParsedConfigObject
    // } else {
    //   console.log('No object found in the JavaScript code string.');
    //   return null;
    // }
  } catch (e) {
    console.log('error:', e)
    return null;
  }
}


export function updateTrueConfigAlgoId(configPath: string, algoId: number) {
  let content = fs.readFileSync(configPath, 'utf-8');

  // Split the content into lines
  const lines = content.split('\n');

  let algorithmObjectFound = false;
  let pathUpdated = false;

  // Find the algorithm object and update or add the path
  const updatedLines = lines.map((line, index) => {
    if (line.includes('algorithm') && line.includes('{')) {
      algorithmObjectFound = true;
      return line;
    }
    if (algorithmObjectFound && !pathUpdated) {
      if (line.includes('id:')) {
        // Update existing path
        pathUpdated = true;
        return `    id: ${algoId},`;
      } else if (line.includes('}')) {
        // Add path if it doesn't exist
        pathUpdated = true;
        return `    id: ${algoId},\n${line}`;
      }
    }
    return line;
  });

  if (!pathUpdated) {
    console.warn('Could not find algorithm object in the configuration. The file structure might be different than expected.');
    return;
  }

  // Join the lines back together
  const updatedContent = updatedLines.join('\n');

  // Write the updated content back to the file
  fs.writeFileSync(configPath, updatedContent);
}

export function updateTrueConfig(configPath: string, newAlgorithmPath: string) {
  let content = fs.readFileSync(configPath, 'utf-8');

  // Split the content into lines
  const lines = content.split('\n');

  let algorithmObjectFound = false;
  let pathUpdated = false;

  // Find the algorithm object and update or add the path
  const updatedLines = lines.map((line, index) => {
    if (line.includes('algorithm') && line.includes('{')) {
      algorithmObjectFound = true;
      return line;
    }
    if (algorithmObjectFound && !pathUpdated) {
      if (line.includes('path:')) {
        // Update existing path
        pathUpdated = true;
        return `    path: '${newAlgorithmPath}',`;
      } else if (line.includes('}')) {
        // Add path if it doesn't exist
        pathUpdated = true;
        return `    path: '${newAlgorithmPath}',\n${line}`;
      }
    }
    return line;
  });

  if (!pathUpdated) {
    console.warn('Could not find algorithm object in the configuration. The file structure might be different than expected.');
    return;
  }

  // Join the lines back together
  const updatedContent = updatedLines.join('\n');

  // Write the updated content back to the file
  fs.writeFileSync(configPath, updatedContent);
}

export function readAlgorithmPath(): string | undefined {
  const content = fs.readFileSync(configPath(), 'utf-8');
  const algorithmObject = content.match(/algorithm:\s*{[\s\S]*?}/);

  if (algorithmObject) {
    const pathMatch = algorithmObject[0].match(/path:\s*['"](.*)['"],?/);
    return pathMatch ? pathMatch[1] : undefined;
  }

  return undefined;
}


export function readAlgorithmId(): string | undefined {
  const content = fs.readFileSync(configPath(), 'utf-8');
  const algorithmObject = content.match(/algorithm:\s*{[\s\S]*?}/);

  if (algorithmObject) {
    const pathMatch = algorithmObject[0].match(/id\s*:\s*(undefined|\d+)?/);
    return pathMatch ? pathMatch[1] : undefined;
  }

  return undefined;
}

export function readWasmAsBytes(filePath: string): number[] {
  // Read the file as a buffer
  const buffer = fs.readFileSync(filePath);

  // Convert the buffer to a Uint8Array
  const uint8Array = new Uint8Array(buffer);

  // Convert the Uint8Array to a regular array of numbers
  return Array.from(uint8Array);
}


interface AsBuildConfig {
  targets?: {
    [key: string]: any;
  };
  options?: {
    bindings?: string;
    noExportMemory?: boolean;
    importMemory?: boolean;
    exportTable?: boolean;
    importTable?: boolean;
    exportStart?: boolean;
    noAssert?: boolean;
    [key: string]: any;
  };
}

export async function updateACMConfig(filePath: string): Promise<void> {
  try {
    // Read the existing config file
    const configContent = fs.readFileSync(filePath, 'utf-8');
    const config: AsBuildConfig = JSON.parse(configContent);

    // Update the specified values
    if (!config.options) {
      config.options = {};
    }

    config.options.bindings = "raw";
    config.options.noExportMemory = true;
    config.options.importMemory = true;
    config.options.exportTable = false;
    config.options.importTable = false;
    config.options.exportStart = false;
    config.options.noAssert = true;

    // Write the updated config back to the file
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(`Error updating config: ${error}`);
  }
}
