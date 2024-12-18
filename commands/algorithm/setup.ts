// Write typescript code to generate a class to read attestations from on-chain.

import path from "path";
import fs from 'fs'
import { BASE_ACM_FILE, CONFIG_FILE_NAME, constructAlgorithmHelper, getSchemaObjects, TRUE_DIRECTORY_NAME } from "../../helpers/constants.js";
import { createAlgorithmHelperFile, readAlgorithmPath, updateACMConfig, updateTrueConfig } from "../../helpers/file.js";
import { exec } from 'child_process';
import { promisify } from "util";
import { parseJsonWithComments } from "../../helpers/parser.js";

const asyncExec = promisify(exec)

export const setup = async () => {
  const path = readAlgorithmPath();
  if (!path) {
    throw Error("Unable to load the path of algorithm directory from true network config.");
  }
  const schemaInfos = await getSchemaObjects(false);

  // Create helper class for attestations inside the algorithm directory. 
  const fileData = constructAlgorithmHelper(schemaInfos);
  const response = createAlgorithmHelperFile(fileData, path)

  return response
}

export const setupAcm = async (projectPath: string) => {
  try {
    // Create the AssemblyScript project directory
    const fullPath = path.resolve(projectPath);
    fs.mkdirSync(fullPath, { recursive: true });

    // Change to the new directory
    process.chdir(fullPath);

    // Initialize AssemblyScript project
    await asyncExec('npx --package assemblyscript asinit . -y');
    
    await asyncExec('npm i');

    await updateACMConfig(path.join(process.cwd(), 'asconfig.json'))

    fs.writeFileSync(path.join(process.cwd(), 'assembly/index.ts'), BASE_ACM_FILE)

    // Modify tsconfig.json to exclude AssemblyScript files
    const tsconfigPath = path.join(process.cwd(), '..', 'tsconfig.json');

    if (fs.existsSync(tsconfigPath)) {

      const tsconfig = parseJsonWithComments(fs.readFileSync(tsconfigPath, 'utf-8'));
      if (!tsconfig.exclude) {
        tsconfig.exclude = [];
      }
      tsconfig.exclude.push(path.relative(path.dirname(tsconfigPath), fullPath));
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }

    // Change to the new directory
    process.chdir('..');

    // Modify package.json to add build scripts
    const packageJsonPath = path.join(process.cwd(), 'package.json');

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.scripts = {
      ...packageJson.scripts,
      "asbuild:debug": `asc ${projectPath}/assembly/index.ts --target debug`,
      "asbuild:release": `asc ${projectPath}/assembly/index.ts --target release`,
      "asbuild": "npm run asbuild:debug && npm run asbuild:release"
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    updateTrueConfig(`${process.cwd()}/${TRUE_DIRECTORY_NAME}/${CONFIG_FILE_NAME}`, projectPath)

    console.log(`AssemblyScript project for Algorith setup completed in ${fullPath}`);
  } catch (error) {
    console.error('Error setting up AssemblyScript project:', error);
    throw Error("Error setting up AssemblyScript project for Algorithm Compute Module.")
  }
}