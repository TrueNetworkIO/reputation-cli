
import { Char, F32, F64, Hash, I16, I32, I64, I8, Schema, U16, U32, U64, U8, Text } from '@truenetworkio/sdk/dist/schemas/index.js'
import { Account, Issuer } from '@truenetworkio/sdk/dist/utils/cli-config.js'
import path from 'path'
import fs from 'fs'
export const TRUE_DIRECTORY_NAME = 'true-network'
export const CONFIG_FILE_NAME = 'true.config.ts'
export const ACM_DIRECTORY_NAME = 'algorithm/assembly'
export const ACM_HELPER_FILE_NAME = 'attestations.ts'
export const ENV_VARIABLE_NAME = 'TRUE_NETWORK_SECRET_KEY'

export const configPath = ()=> path.join(process.cwd(), TRUE_DIRECTORY_NAME, CONFIG_FILE_NAME);

export const idToType: Record<string, string> = {
  '0': 'string',
  '1': 'u8',
  '2': 'i8',
  '3': 'u16',
  '4': 'i16',
  '5': 'u32',
  '6': 'i32',
  '7': 'u64',
  '8': 'i64',
  '9': 'f32',
  '10': 'f64',
  '11': 'string'
}

export const idToSize: Record<string, number> = {
  '0': 1,
  '1': 1,
  '2': 1,
  '3': 2,
  '4': 2,
  '5': 4,
  '6': 4,
  '7': 8,
  '8': 8,
  '9': 4,
  '10': 8,
  '11': 32
}

export const constructConfigFileData = (account: Account, issuer: Issuer) => {
  return `
import { TrueApi, testnet } from '@truenetworkio/sdk'
import { TrueConfig } from '@truenetworkio/sdk/dist/utils/cli-config'

// If you are not in a NodeJS environment, please comment the code following code:
import dotenv from 'dotenv'
dotenv.config()

export const getTrueNetworkInstance = async (): Promise<TrueApi> => {
  const trueApi = await TrueApi.create(config.account.secret)

  await trueApi.setIssuer(config.issuer.hash)

  return trueApi;
}

export const config: TrueConfig = {
  network: testnet,
  account: {
    address: '${account.address}',
    secret: process.env.${ENV_VARIABLE_NAME} ?? ''
  },
  issuer: {
    name: '${issuer.name}',
    hash: '${issuer.hash}'
  },
  algorithm: {
    id: undefined,
    path: undefined,
    schemas: []
  },
}
  `
}
interface SchemaInfo {
  name: string;
  schema: any;
}

function extractSchemaDetails(schemaData: SchemaInfo, hash: boolean): any[][] {
  
  const code = `
  ${schemaData.schema}

  return ${schemaData.name}.${hash ? 'getSchemaHash()' : 'getSchemaObject()'};
  `
  const f = new Function("Schema", "Char", "U8", "I8", "U16", "I16", "U32", "I32", "U64", "I64", "F32", "F64", "Hash", "Text", code)
  const response = f(Schema, Char, U8, I8, U16, I16, U32, I32, U64, I64, F32, F64, Hash, Text)

  return response;
}



// Final attempt...
export async function getSchemaObjects(hash: boolean): Promise<SchemaInfo[]> {
  let schemas: SchemaInfo[] = []

  // Step 1: Read the config file
  return new Promise<SchemaInfo[]>(
    (resolve, reject) => {

      fs.readFile(configPath(), 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading config file:', err);
          reject();
          return;
        }
    
        // Step 2: Extract the schema names from the schemas array
        const schemasRegex = /schemas:\s*\[(.*?)\]/s; // Corrected regex to capture everything inside the brackets
        const schemasMatch = schemasRegex.exec(data);
    
        if (!schemasMatch) {
          console.error('No schemas array found in the config file.');
          reject();
          return;
        }
    
        // Get the schema names from the match
        const schemaNames = schemasMatch[1].split(',').map(name => name.trim()).filter(Boolean);
    
        schemas = schemaNames.map((n) => ({ name: n, schema: null }))
    
        // Step 3: Extract the import statements to find the corresponding file
        const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g;
        const importPaths: { [key: string]: string } = {};
        let match;
    
        while ((match = importRegex.exec(data)) !== null) {
          const importedSchemas = match[1].split(',').map(name => name.trim());
          const importPath = match[2];
    
          // Map each schema name to its import path
          importedSchemas.forEach(schemaName => {
            importPaths[schemaName] = importPath;
          });
        }
    
        // Step 4: Read the specific schema file that contains the definitions
        const uniqueFilePaths = Array.from(new Set(schemas.map(sch => importPaths[sch.name])));
    
        uniqueFilePaths.forEach(schemaFile => {
          const schemaFilePath = path.resolve(path.dirname(configPath()), schemaFile + '.ts');
    
          fs.readFile(schemaFilePath, 'utf8', (err, schemaData) => {
            if (err) {
              console.error(`Error reading schema file ${schemaFilePath}:`, err);
              reject();
              return;
            }
    
            // Step 5: Extract the schema declarations from the schema file
            schemas.forEach((sch, index) => {
              const schemaRegex = /export const \w+ = Schema\.create\({[^}]+}\)/g;
              const schemaMatch = [...schemaData.matchAll(schemaRegex)];
    
              const schema = schemaMatch.find((v) => v.toString().includes(sch.name))
              if (schema) {
                // Store the extracted declaration as a string
                schemas[index].schema = schema.toString().replace('export', '');
    
                schemas[index].schema = extractSchemaDetails(schemas[index], hash)
              } else {
                console.warn(`Schema ${sch.name} not found in ${schemaFilePath}`);
                reject();
              }
            });

            resolve(schemas)
          });
        });
      });
    }
  )



}

export const BASE_ACM_FILE = `
// The Algorithm.
// This is the space to design your reputation algorithm taking in account 
// multiple schemas across true network to calculate a reputation score for
// your users & the community. 

// This is the starting point, calc function.
// Algorithm Compute Module (ACM) uses this as starting point to execute
// your reputation algorithm and expects an i64 as result.
export function calc(): i64 {
  return 0;
}
`

export const constructAlgorithmHelper = (schemas: SchemaInfo[]) => {
  let indexCount = 0;
  let str = `
// Auto Generated File.
// Created using Reputation CLI from True Network.
// To update the classes, use the "reputation-cli acm-prepare" at the root directory that contains "true-network".

@inline
function readMemory<T>(index: usize): T {
  return load<T>(index);
}

${schemas.map((schema) => {
  const schemaObject = schema.schema;
  return `
class ${schema.name.toUpperCase()} {
${schemaObject.map((m: any) => `  ${m[0]}: ${idToType[m[1].toString()]};`).join('\n')}

  constructor() {
${schemaObject.map((m: any) => {
  const value = indexCount;
  indexCount += idToSize[m[1]];
  return `    this.${m[0]} = readMemory<${idToType[m[1].toString()]}>(${value});`;
}).join('\n')}
  }
}
`;
}).join('\n')}

export class Attestations {
${schemas.map(v => `  static ${v.name}: ${v.name.toUpperCase()} = new ${v.name.toUpperCase()}();`).join('\n')}
}
`;

  return str;
}