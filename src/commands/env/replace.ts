
import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
const YAML = require('yaml')
const Glob = require('glob');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('env-replace', 'replace');
const fs = require('fs');
const path = require('path');
// The type we are querying for
interface ReplaceConfig {
  regex_lib: Record<string, string>[],
  rules: Record<string, ReplaceConfigRules>
}

// The type we are querying for
interface ReplaceConfigRules {
  directories: string[],
  excludes: string[],
  files: string[],
  regex_name: string,
  replace_values: string[]
  replace_with: string
}
export default class Replace extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    ``
  ];

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    basedir: flags.string({ char: 'd', description: messages.getMessage('basedirFlagDescription') }),
    testmode: flags.boolean({ char: 't', description: messages.getMessage('testmodeFlagDescription') }),
    debug: flags.boolean({ char: 'v', description: messages.getMessage('verboseFlagDescription') }),
    // flag with a value (-n, --name=VALUE)
    replaceconfig: flags.string({ char: 'c', description: messages.getMessage('replaceconfigFlagDescription') }),
    rulename: flags.string({ char: 'n', description: messages.getMessage('rulenameFlagDescription') }),
    environment: flags.string({ char: 'e', description: messages.getMessage('environmentFlagDescription') })
  };

  // Comment this out if your command does not require an org username
  protected static requiresUsername = false;

  // Comment this out if your command does not support a hub org username
  protected static supportsDevhubUsername = false;

  // Set this to true if your command requires a project workspace; 'requiresProject' is false by default
  protected static requiresProject = false;


  public async run(): Promise<AnyJson> {


    //let replaceConfigs: any[] = JSON.parse(fs.readFileSync(this.flags.replaceconfig, { encoding: 'utf8', flag: 'r' }));
    if (!fs.existsSync(this.flags.replaceconfig)) {
      this.ux.error(`${this.flags.replaceconfig} does not exist.`)
      // Return an object to be displayed with --json
      return { 'status': 'failed' };
    }
    else {
      let replaceConfigs: ReplaceConfig = YAML.parse(fs.readFileSync(this.flags.replaceconfig, { encoding: 'utf8', flag: 'r' }));

      //for (let i = 0; i < replaceConfigs.rules.keys.length(); i++) {
      for (let key in replaceConfigs.rules) {
        let ruleRegex: string = replaceConfigs.rules[key].regex_name;
        let regExpr = replaceConfigs.regex_lib[ruleRegex];
        if((this.flags.rulename && this.flags.rulename == key) || !this.flags.rulename){
          this.replaceValuesForRule(key, replaceConfigs.rules[key], regExpr);
        }
        

      }

      // Return an object to be displayed with --json
      return { 'status': 'ok' };
    }

  }

  private isRuleValid(ruleName: string, replaceConfig: ReplaceConfigRules): boolean {
    if (!replaceConfig.directories && !replaceConfig.files) {
      this.ux.warn(`Rule [${ruleName}] - No directories or files found in replace rule. Skipping rule execution.`);
      return false;
    }

    if (replaceConfig.directories && replaceConfig.files && replaceConfig.directories.length > 0 && replaceConfig.files.length > 0) {
      this.ux.warn(`Rule [${ruleName}] - Both directories and files specified in replace rule. Skipping rule execution.`);
      return false;
    }

    return true;
  }
  private async replaceValuesForRule(ruleName: string, replaceConfig: ReplaceConfigRules, regExpr: string) {

    if (this.isRuleValid(ruleName, replaceConfig)) {

      if (replaceConfig.files) {
        this.executeReplaceConfigForFiles(ruleName, replaceConfig, regExpr);
      }
      if (replaceConfig.directories) {
        this.executeReplaceConfigForDirectories(ruleName, replaceConfig, regExpr);
      }

    } else {
      return;
    }

  }

  private async executeReplaceConfigForDirectories(ruleName: string, replaceConfig: ReplaceConfigRules, regExpr: string) {
    let excludes: string[] = replaceConfig.excludes;
    for (let sourceDir of replaceConfig.directories) {
      let includedFiles: string[] = Glob.sync('**/*', {
        cwd: `${this.flags.basedir}${path.sep}${sourceDir}`,
        ignore: excludes,
        silent: false,
        absolute: true,
      });
      for (let sourceFileAbsPath of includedFiles) {
        this.executeReplaceRuleForFile(ruleName,replaceConfig,regExpr,sourceFileAbsPath);
      }


    }
  }

  private async executeReplaceRuleForFile(ruleName:string,replaceConfig:ReplaceConfigRules,regExpr:string,sourceFileAbsPath:string){
    if (!fs.existsSync(sourceFileAbsPath)) {
      this.ux.warn(`Rule [${ruleName}] - ${sourceFileAbsPath} does not exist. Skipping.`);
    } else {
      if (this.flags.testmode) {
        //backup the file if the backup file doesn't exist.
        let backupFile: string = `${sourceFileAbsPath}.bkup`;
        if (!fs.existsSync(backupFile)) {
          fs.copyFileSync(sourceFileAbsPath, backupFile);
          if (this.flags.debug) {
            this.ux.log(`Rule [${ruleName}] - Created backup file at ${backupFile}`);
          }
        }
      }

      let fileData: string = fs.readFileSync(sourceFileAbsPath, { encoding: 'utf8', flag: 'r' });
      if (this.flags.debug) {
        this.ux.log(`Rule [${ruleName}] - Read file at ${sourceFileAbsPath} `);
      }
      if (replaceConfig.replace_values) {
        for (let replaceVal of replaceConfig.replace_values) {
          let finalRegex: string = regExpr.replace('__REPLACE_VALUE__', replaceVal);
          let regExprObj: RegExp = new RegExp(finalRegex, 'ms');
          if (this.flags.debug) {
            this.ux.log(`Rule [${ruleName}] - Using Regular Expression : ${finalRegex}`);
            this.ux.log(`Rule [${ruleName}] - Absolute file path ${sourceFileAbsPath}`);
            this.ux.log(`Rule [${ruleName}] - Removing ${replaceVal} references`);
          }
          var regexResult = regExprObj.exec(fileData);
          if (regexResult) {
            var afterStr = regexResult.index + regexResult[0].length;
            fileData = fileData.substr(0, regexResult.index) + fileData.substr(afterStr);
          } else {
            this.ux.warn(`Rule [${ruleName}] - Regex didn't find any matches in ${sourceFileAbsPath}`);
          }
        }
      } else {
        this.ux.log(`Rule [${ruleName}] - No replacement values found !!! `);
        let finalRegex: string = regExpr;
        if (this.flags.debug) {
          this.ux.log(`Rule [${ruleName}] - Using Regular Expression : ${finalRegex}`);
        }
        let regExprObj: RegExp = new RegExp(finalRegex, 'ms');

        let replaceWith: any = replaceConfig.replace_with ;
        let replaceWithStr=replaceWith;
        if(this.flags.environment){
          this.ux.log(`Rule [${ruleName}] - Using ${this.flags.environment} to determine replacement value`);
          replaceWithStr=replaceWith[this.flags.environment]?replaceWith[this.flags.environment]:replaceWith;
        }

        if (this.flags.debug) {
          this.ux.log(`Rule [${ruleName}] - Replacing with '${replaceWithStr}'`);
        }
        var regexResult = regExprObj.exec(fileData);
        if (regexResult) {
          var afterStr = regexResult.index + regexResult[0].length;
          if (replaceWithStr) {
            fileData = fileData.substr(0, regexResult.index) + replaceWithStr + fileData.substr(afterStr);
          } else {
            fileData = fileData.substr(0, regexResult.index) + fileData.substr(afterStr);
          }
        } else {
          this.ux.warn(`Rule [${ruleName}] - Regex didn't find any matches in ${sourceFileAbsPath}`);
        }


      }
      fs.writeFileSync(`${sourceFileAbsPath}`, fileData, { encoding: 'utf8' });
      if (this.flags.debug) {
        this.ux.log(`Rule [${ruleName}] - Saved file to ${sourceFileAbsPath}`);
      }
      this.ux.log(`Rule [${ruleName}] - Completed processing`);

    }
  }
  private async executeReplaceConfigForFiles(ruleName: string, replaceConfig: ReplaceConfigRules, regExpr: string) {
    for (let sourceFile of replaceConfig.files) {
      let sourceFileAbsPath: string = `${this.flags.basedir}${path.sep}${sourceFile}`;
      if (!fs.existsSync(sourceFileAbsPath)) {
        this.ux.warn(`Rule [${ruleName}] - ${sourceFileAbsPath} does not exist. Skipping.`);
      } else {
        if (this.flags.testmode) {
          //backup the file if the backup file doesn't exist.
          let backupFile: string = `${sourceFileAbsPath}${this.flags.testmode ? '.bkup' : ''}`;
          if (!fs.existsSync(backupFile)) {
            fs.copyFileSync(sourceFileAbsPath, backupFile);
            if (this.flags.debug) {
              this.ux.log(`Rule [${ruleName}] - Created backup file at ${backupFile}`);
            }
          }
        }

        let fileData: string = fs.readFileSync(sourceFileAbsPath, { encoding: 'utf8', flag: 'r' });
        if (this.flags.debug) {
          this.ux.log(`Rule [${ruleName}] - Read file at ${sourceFile} `);
        }
        if (replaceConfig.replace_values) {
          for (let replaceVal of replaceConfig.replace_values) {
            let finalRegex: string = regExpr.replace('__REPLACE_VALUE__', replaceVal);
            let regExprObj: RegExp = new RegExp(finalRegex, 'ms');
            if (this.flags.debug) {
              this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Using Regular Expression : ${finalRegex}`);
              this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Absolute file path ${sourceFileAbsPath}`);
              this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Replacing ${replaceVal} with ''`);
            }
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
          if (this.flags.debug) {
            this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Using Regular Expression : ${finalRegex}`);
          }
          let regExprObj: RegExp = new RegExp(finalRegex, 'ms');
          let replaceWith: any = replaceConfig.replace_with ;
          let replaceWithStr=replaceWith;
          if(this.flags.environment){
            this.ux.log(`Rule [${ruleName}] - Using ${this.flags.environment} to determine replacement value`);
            replaceWithStr=replaceWith[this.flags.environment]?replaceWith[this.flags.environment]:replaceWith;
          }

          if (this.flags.debug) {
            this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Absolute file path ${sourceFileAbsPath}`);
            this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Replacing with '${replaceWith}'`);
          }
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
        fs.writeFileSync(`${sourceFileAbsPath}`, fileData, { encoding: 'utf8' });
        if (this.flags.debug) {
          this.ux.log(`Rule [${ruleName}] - ${sourceFile} - Written file to ${sourceFileAbsPath}`);
        }
        this.ux.log(`Rule [${ruleName}] - Completed processing`);

      }

    }
  }

}