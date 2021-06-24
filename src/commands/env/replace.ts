
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
const YAML = require('yaml')

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('env-replace', 'replace');
const fs = require('fs');
const path = require('path');
export default class Replace extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    ``
  ];

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    basedir: flags.string({ char: 'd', description: messages.getMessage('basedirFlagDescription') }),
    testmode: flags.boolean({ char: 't', description: messages.getMessage('testmodeFlagDescription') }),
    // flag with a value (-n, --name=VALUE)
    replaceconfig: flags.string({ char: 'c', description: messages.getMessage('replaceconfigFlagDescription') })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;

  public async run(): Promise<AnyJson> {

    // The type we are querying for
    interface ReplaceConfig {
      regex_lib: Record<string, string>[],
      rules: Record<string, ReplaceConfigRules>
    }

    // The type we are querying for
    interface ReplaceConfigRules {
      extensions: string[],
      files: string[],
      regex_name: string,
      replace_values: string[]
      replace_with: string
    }
    //let replaceConfigs: any[] = JSON.parse(fs.readFileSync(this.flags.replaceconfig, { encoding: 'utf8', flag: 'r' }));
    let replaceConfigs: ReplaceConfig = YAML.parse(fs.readFileSync(this.flags.replaceconfig, { encoding: 'utf8', flag: 'r' }));

    //for (let i = 0; i < replaceConfigs.rules.keys.length(); i++) {
    for (let key in replaceConfigs.rules) {
      let ruleRegex: string = replaceConfigs.rules[key].regex_name;
      let regExpr = replaceConfigs.regex_lib[ruleRegex];
      this.replaceValuesForRule(key, replaceConfigs.rules[key], regExpr);

    }

    // Return an object to be displayed with --json
    return { 'status': 'ok' };
  }

  private async replaceValuesForRule(ruleName: string, replaceConfig: Record<string, any>, regExpr: string) {

    for (let sourceFile of replaceConfig.files) {
      let sourceFileAbsPath: string = `${this.flags.basedir}${path.sep}${sourceFile}`;
      if (this.flags.testmode) {
        //backup the file if the backup file doesn't exist.
        let backupFile: string = `${sourceFileAbsPath}${this.flags.testmode ? '.bkup' : ''}`;
        if (!fs.existsSync(backupFile)) {
          fs.copyFileSync(sourceFileAbsPath, backupFile);
          this.ux.log(`Rule [${ruleName}] - Created backup file at ${backupFile}`);
        }
      }

      let fileData: string = fs.readFileSync(sourceFileAbsPath, { encoding: 'utf8', flag: 'r' });
      this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Unformatted XML at ${sourceFileAbsPath}`);
      if (replaceConfig.replace_values) {
        for (let replaceVal of replaceConfig.replace_values) {
          let finalRegex: string = regExpr.replace('__REPLACE_VALUE__', replaceVal);
          let regExprObj: RegExp = new RegExp(finalRegex, 'ms');
          this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Using Regular Expression : ${finalRegex}`);
          this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Absolute file path ${sourceFileAbsPath}`);
          this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Replacing ${replaceVal} with ''`);
          var regexResult = regExprObj.exec(fileData);
          if (regexResult) {
            var afterStr = regexResult.index + regexResult[0].length;
            fileData = fileData.substr(0, regexResult.index) + fileData.substr(afterStr);
          } else {
            this.ux.warn(`Rule [${ruleName}] - Regex didn't find any matches in ${sourceFileAbsPath}`);
          }
        }
      } else {
        this.ux.log(`Rule [${ruleName}] - ${sourceFile} - No replacement values found !!! `);
        let finalRegex: string = regExpr;
        this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Using Regular Expression : ${finalRegex}`);
        let regExprObj: RegExp = new RegExp(finalRegex, 'ms');
        let replaceWith: string = replaceConfig.replace_with || '';

        this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Absolute file path ${sourceFileAbsPath}`);
        this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Replacing with '${replaceWith}'`);
        var regexResult = regExprObj.exec(fileData);
        if (regexResult) {
          var afterStr = regexResult.index + regexResult[0].length;
          if (replaceWith) {
            fileData = fileData.substr(0, regexResult.index) + replaceWith + fileData.substr(afterStr);
          } else {
            fileData = fileData.substr(0, regexResult.index) + fileData.substr(afterStr);
          }
        } else {
          this.ux.warn(`Rule [${ruleName}] - Regex didn't find any matches in ${sourceFileAbsPath}`);
        }


      }
      this.ux.log(`${sourceFile}: Formatted to XML `);
      fs.writeFileSync(`${sourceFileAbsPath}`, fileData, { encoding: 'utf8' });
      this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Written file to ${sourceFileAbsPath}`);
    }



  }

}