import inquirer from 'inquirer'
import loading from 'loading-cli'
import { checkIfSchemaExist, CREDENTIALS_PALLET_NAME } from '@truenetworkio/sdk/dist/pallets/credentials/state.js'
import { Hash, TrueApi } from "@truenetworkio/sdk";
import { generateWallet } from '../helpers/wallet.js';
import { writeToFile } from '../helpers/file.js';

type SchemaInput = {
  name: string;
  hash: string;
}

const askSchemaHashes = async (trueApi: TrueApi) => {

  const schemaHashes: SchemaInput[] = []

  let addMore = true;

  while (addMore) {
    const { schemaHash } = await inquirer.prompt(
      {
        name: "schemaHash",
        type: "input",
        message: "Enter schema hash to create a type:",
        validate: async (i) => {
          if (!Hash.isValid(i)) return 'Not a valid schema hash.';

          // Checking if name is already registered by someone else.
          const schema = await checkIfSchemaExist(trueApi.network, i)

          if (!schema) return "Schema does not exist.";

          return true;
        }
      },
    );

    const { name } = await inquirer.prompt(
      {
        name: "name",
        type: "input",
        message: "Pick a schema name (camelcase):",
        validate: async (i) => {
          const camelCaseRegex = /^[a-z]+(?:[A-Z][a-z]*)*$/;
          const isCamelCase = camelCaseRegex.test(i);

          if (!isCamelCase) return "Not a valid schema name.";

          const index = schemaHashes.findIndex((j) => j.name == i)

          if (index !== -1) return "Schema with this name already exists.";

          return true;
        }
      },
    );

    schemaHashes.push({
      name,
      hash: schemaHash
    })

    const { wantToAddMore } = await inquirer.prompt({
      name: "wantToAddMore",
      type: 'confirm',
      message: "Do you want to add more schemas?"
    })

    if (!wantToAddMore) { addMore = false; }
  }

  return schemaHashes;
};

export const generateSchemaTypes = async (trueApi: TrueApi, filePath: string) => {

  const account = await generateWallet()

  trueApi = await TrueApi.create(account.secret)
  
  // 1. Ask if to create a new issuer, get Issuer Name.
  const schemaHashes = await askSchemaHashes(trueApi)


  const load = loading("Fetching schemas from the network").start();

  const uniqueTypes: string[] = []

  // Convert schemasHashes into Schema Objects.
  const data = await Promise.all(
    schemaHashes.map(async (schema) => {
      const response = await trueApi.network.query[CREDENTIALS_PALLET_NAME].schemas(schema.hash);
      let data = response.toHuman() as any
      
      data = data.map(([key, type]: any) => [
        key,
        type === 'Boolean' ? 'Bool' : type
      ]);

      data.map((i: any) => {
        if(!uniqueTypes.includes(i[1])){
          uniqueTypes.push(i[1])
        }
      })

      return `
        export const ${schema.name} = Schema.create({
          ${data.map((i: any, index: number) => {
            return `${i[0]}: ${i[1]}`
          }).join(',\n')}
        })
      `
    })
  );

  const importStatement = `import {Schema,${uniqueTypes.map((i: any) => i)}} from '@truenetworkio/sdk'`

  const fileContents = importStatement + data.join('\n')

  writeToFile(filePath, fileContents)
  load.stop();

  console.log('\n✅ File generated successfully.')
  await trueApi.close()
}