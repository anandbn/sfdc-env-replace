env-replace
===========

A simple `sfdx` plugin for replacing values that are environment specific or might need to be removed due to the destination sandbox/org not having the right licenses/permissions enabled. 

### How to install

Run:
```
sfdx plugin:install https://github.com/anandbn/sfdc-env-replace

```

Once the install is complete, run 
```
sfdx plugins:link
```

To confirm that the plugin was installed, run `sfdx plugins` and the output should be something like below:

```
...
env-replace 0.0.0 (link) https://github.com/anandbn/sfdc-env-replace
...

```

### Executing the plugin

To run the plugin execute as below

```
sfdx env:replace -c <absolute_path_to_config_YAML> -d <base_directory_for_your_org> [-t -v]
```

or 
```
sfdx env:replace --replaceconfig <absolute_path_to_config_YAML> -basedir <base_directory_for_your_org> [--testmode --debug]
```

Two required parameters:

- `-c` or `--replaceconfig` : This is teh YAML file that has the replace configuration rules 
- `-d` or `--basedir` : This is the base directory for your org confiuguration. This is the parent directory to `force-app`

3 optional parameters:

- `-t` or `--testmode` : This will store the original XML files in a `.bkup` before processing the rules. It's good to use this when you are testing your configurations.
- `-v` or `--debug` : To log additional details when executing.
- `-n` or `--rulename` : If you want to execute just of the rules in your YAML file vs. all. If this parameter isn't included all rules are executed.
- `-e` or `--environment` : The environment value to be used when replacing values. The value here should match what is in the YAML file.

### Replace Configuration YAML Specification

Tha YAML file that is used for replacement has the following structure

- `regex_lib` : this is a key value pair of all regular expressions that will be used in the individual rules. The idea is to be able to reuse the expressions.
- `rules` : these are the individual rules to execute.

`rules` has the following flavors:

1. Replace 1 value with another

```
    <rule_name>:
        files:
          - <path to a metadata XML file with respect to the basedir parameter>
        regex_name: '<reference to the regular expression name in regex_lib'
        replace_with: 'XML string to replace in place of the regular expression'
```

2. Remove a XML tag that matches 1 or more values completely

```
    <rule_name>:
        regex_name: '<reference to the regular expression name in regex_lib'
        files:
            - <path to a metadata XML file with respect to the basedir parameter>
        replace_values:
            - <Replace_Value_1>
            - <Replace_Value_2>
            - <Replace_Value_3>

```

#### Examples

1. Remove a list of `userPermissions` from `Profile.xml`

```
    regex_lib:
        user-permission: '(.[^\n]+<userPermissions>(?:(?!<userPermissions>).)*?<name>__REPLACE_VALUE__<\/name>(?:(?!<userPermissions>).)*?<\/userPermissions>)'
    invalid_user_permissions: 
        extensions:
            - profile
            - permissionset
        files:
            - force-app/main/default/profiles/Admin.profile-meta.xml
        regex_name: 'user-permission' 
        replace_values:
            - ArchiveArticles
            - EditTranslation
            - PublishArticles
            - PublishTranslation
            - SubmitForTranslation
            - ViewArchivedArticles
            - ViewDraftArticles
            - ManageSandboxes
```

This would essentially remove the following XML snippets from Admin.profile-meta.xml

```
    <userPermissions>
        <enabled>true</enabled>
        <name>ArchiveArticles</name>
    </userPermissions>
    <userPermissions>
        <enabled>true</enabled>
        <name>EditTranslation</name>
    </userPermissions>
```

2. Replace a `botUser` on a Einstein Bot configuration with another username

```
regex_lib:
    bot_user: '(<botUser>(?:(?!<botUser>).)*?virtual\.assistant@salesforce\.com\.test\.dev(?:(?!<botUser>).)*?<\/botUser>)'
rules:
    replace_chatbot_user:
        files:
          - force-app/main/default/bots/Test_Virtual_Assistant/Test_Virtual_Assistant.bot-meta.xml
        regex_name: 'bot_user'
        replace_with: '<botUser>virtual.assistant@salesforce.com.test.team</botUser>'
```

3. Replace a `botUser` on a Einstein Bot configuration with another username for the UAT environment

```
regex_lib:
    bot_user: '(<botUser>(?:(?!<botUser>).)*?virtual\.assistant@salesforce\.com\.test\.dev(?:(?!<botUser>).)*?<\/botUser>)'
rules:
    replace_chatbot_user:
        files:
          - force-app/main/default/bots/Test_Virtual_Assistant/Test_Virtual_Assistant.bot-meta.xml
        regex_name: 'bot_user'
        replace_with: 
            UAT: '<botUser>virtual.assistant@salesforce.com.uat</botUser>'
```

and the corresponding command would be :

```
sfdx env:replace -c <absolute_path_to_config_YAML> -d <base_directory_for_your_org> -e UAT
```

If a environment specific value is not found it'll use the value a at the top level.

### Writing your regular expression for salesforce Metadata

The format you should use for regular expression is below:

```
(.[^\n]+<outerXmlTag>(?:(?!<outerXmlTag>).)*?<innerXMLTag>__REPLACE_VALUE__<\/innerXMLTag>(?:(?!<outerXmlTag>).)*?<\/outerXmlTag>)

```

- ____REPLACE_VALUE____ : This value will get replaced at runtime to look for the specific string you want to replace.


#### Examples

1. `recordTypeVisiblilites` in a `Profile.xml`

```
(.[^\n]+<recordTypeVisibilities>(?:(?!<recordTypeVisibilities>).)*?<recordType>__REPLACE_VALUE__<\/recordType>(?:(?!<recordTypeVisibilities>).)*?<\/recordTypeVisibilities>)
```

2. `routingType` in a live chat button

```
(.[^\n]+<routingType xsi:nil="true"\/>)
```