var fs = require('fs');
var engine = require('./engine');
var mustache = require('mustache');


var getMethods = function(templates, desc) {
	var template = templates.method;
	return	mustache.to_html(template, desc);	
};
exports.run = function(engineName, fileName) {
	var e = engine.load(engineName);

	var contents = fs.readFileSync(fileName);

	var desc = JSON.parse(contents);

	var template = e[desc.type];

	if (template) {
		desc.methods = getMethods(e, desc);
		console.log(desc.methods);
		var output = mustache.to_html(template, desc);
		console.log(output);
	}

};

if (require.main === module) {
	exports.run('spidermonkey', './sound.json');
}
