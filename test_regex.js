var Glob = require('glob');

var pattern = "**/*"
console.log(pattern)

var mg = Glob.sync(pattern, {
    cwd:'demo/DD1POC/force-app/main/default/profiles', 
    ignore:['CSR*','End User*','Cloning*','Executive Spon*','End User*','Read Only*','Virtual*'],
    silent:false,
    absolute:true,
});
console.log(mg);