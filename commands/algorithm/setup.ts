// Write typescript code to generate a class to read attestations from on-chain.

import { constructAlgorithmHelper, getSchemaObjects } from "../../helpers/constants.js";
import { createAlgorithmHelperFile } from "../../helpers/file.js";

export const setup = async () => {
  const schemaInfos = await getSchemaObjects();

  // Create helper class for attestations inside the algorithm directory. 
  const fileData = constructAlgorithmHelper(schemaInfos);
  const response = createAlgorithmHelperFile(fileData)

  return response
}