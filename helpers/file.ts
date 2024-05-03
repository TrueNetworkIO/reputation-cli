
import fs from 'fs'
import path from 'path'
import ts from 'typescript'
import { Account, Issuer } from '@truenetworkio/sdk/dist/utils/cli-config.js'
import { CONFIG_FILE_NAME, ENV_VARIABLE_NAME, TRUE_DIRECTORY_NAME, constructConfigFileData } from './constants.js'


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
  issuer: Issuer
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

      let objString = match[1].replace('network_1.default.testnet', '"testnet"')

      const config = Function(`"use strict"; return (${objString});`)();

      return config as ParsedConfigObject
    } else {
      console.log('No object found in the JavaScript code string.');
      return null;
    }
  } catch (e) {
    console.log('e', e)
    return null;
  }
}
