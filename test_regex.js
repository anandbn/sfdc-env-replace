const fs = require('fs');

var fileData = fs.readFileSync('demo/Admin.profile-meta.xml', { encoding: 'utf8', flag: 'r' });


var regExpr = '(.[^\n]+<recordTypeVisibilities>(?:(?!<recordTypeVisibilities>).)*?<recordType>Knowledge__kav.FAQ<\/recordType>(?:(?!<recordTypeVisibilities>).)*?<\/recordTypeVisibilities>)';
//var regExpr = '/(.[^\n]+<recordTypeVisibilities>*)/ms';
var regExpObj = new RegExp(regExpr,'ms');
var myRegexOut = regExpObj.exec(fileData);
var afterStr = myRegexOut.index+myRegexOut[0].length;
var fileData2 = fileData.substr(0,myRegexOut.index)+fileData.substr(afterStr);
console.log(myRegexOut);
console.log(fileData2);