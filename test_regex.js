
//const regex = /(.[^\n]+<messageIdentifier>)(.*)<\/messageIdentifier>/gm;
//var regex = new RegExp('(.[^\n]+<messageIdentifier>)(.*)(<\/messageIdentifier>)','gm');
var regex = new RegExp('(.[^\n]+<stepIdentifier>)(.*)(<\/stepIdentifier>)\n','gm');
const fs = require('fs');
var str = fs.readFileSync('demo/v1.xml',{ encoding: 'utf8', flag: 'r' });
let m;

while ((m = regex.exec(str)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    /*if (m.index === regex.lastIndex) {
        regex.lastIndex++;
    }*/
    

    var afterStr = m.index + m[0].length;
    let newStr = str.substr(0, m.index) + str.substr(afterStr);
    fs.writeFileSync('demo/v1.xml.bkup',newStr);
    str = newStr;
}
