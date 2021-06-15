import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('env-replace', 'replace');
const fs = require('fs');
const path = require('path');
var formatXml = require('xml-formatter');
export default class Replace extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    ``
  ];

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    basedir: flags.string({ char: 'd', description: messages.getMessage('basedirFlagDescription') }),
    testmode: flags.boolean({ char: 't', description: messages.getMessage('testmodeFlagDescription')}),
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
    let replaceConfigs: any[] = JSON.parse(fs.readFileSync(this.flags.replaceconfig, { encoding: 'utf8', flag: 'r' }));

    for (let i = 0; i < replaceConfigs.length; i++) {
      let sourceFile: string = `${this.flags.basedir}${path.sep}${replaceConfigs[i].sourceFile}`;
      let destFile: string = `${sourceFile}${this.flags.testmode?'.new':''}`;

      this.ux.log(`Replacing environment variables for ${sourceFile}`);
      let fileData: string = fs.readFileSync(sourceFile, { encoding: 'utf8', flag: 'r' });
      fileData = fileData.replace(/(\n(\s+)<)/gm, "<");
      fileData = fileData.replace(/(\n<)/gm, "<");
      this.ux.log(`${sourceFile}: Unformatted XML file`);
      for (let j = 0; j < replaceConfigs[i].replacements.length; j++) {
        this.ux.log(`${sourceFile}: Replacing ${replaceConfigs[i].replacements[j].findText} with ${replaceConfigs[i].replacements[j].replaceText} `);
        fileData = fileData.replace(replaceConfigs[i].replacements[j].findText,replaceConfigs[i].replacements[j].replaceText);
      }

      fileData = formatXml(fileData, {
        collapseContent: true,
        lineSeparator: '\n'
      });
      this.ux.log(`${sourceFile}: Formatted to XML `);
      fs.writeFileSync(`${destFile}`, fileData, { encoding: 'utf8' });
      this.ux.log(`${sourceFile}: Written  file to ${destFile}`);
    }

    // Return an object to be displayed with --json
    return { 'status': 'ok' };
  }
}
