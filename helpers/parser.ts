import { stringToBlakeTwo256Hash } from "@truenetworkio/sdk";
import { readObjectFromFile } from "./file.js";
import { generateWallet } from "./wallet.js";
import { CONFIG_FILE_NAME, TRUE_DIRECTORY_NAME } from "./constants.js";
import stripJsonComments from "strip-json-comments";

// Function to parse JSON with comments
export function parseJsonWithComments(jsonString: string): any {
  jsonString = stripJsonComments(jsonString)
  // Parse the cleaned JSON string
  return JSON.parse(jsonString);
}

export const parseConfig = async () => {
  const config = readObjectFromFile(`${process.cwd()}/${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME}`);

  if (!config) throw Error(`Unable to load true-network config, make sure ${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME} exists. If not, please use init command.`)

  if (config?.issuer.hash !== `0x${stringToBlakeTwo256Hash(config.issuer.name)}`) throw Error("Mismatch found in config for issuer name & hash, make sure the properties are not altered.")

  const account = await generateWallet(config.account.secret)

  if (config.account.address !== account.address) throw Error("Invalid account secret provided in the config, please make sure the project is initiated correctly.")

  return config;
}