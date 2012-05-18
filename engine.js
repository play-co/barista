var fs = require('fs');
var templates = require('./templates').templates;

var _load = function(engineName, templateName) {
	var templatePath = __dirname + '/engines/' + engineName + '/' + templateName + '.bar';
	var template = fs.readFileSync(templatePath).toString();
	return template;
};
exports.load = function(engineName) {
	var engine = {};
	console.log(templates);
	templates.forEach(function(template) {
		engine[template] = _load(engineName, template);
	});

	return engine;
};


exports.create = function(name) {
	enginePath = __dirname + '/engines/' + name;
	fs.mkdirSync(enginePath);
	
	templates.forEach(function(template) {
		fs.writeFileSync(enginePath + '/' + template + '.bar', '');	
	});
};

if (require.main === module) {
	var command = process.argv[2];
	if (command === 'create') {
		var name = process.argv[3];
		if (name) {
			exports.create(name);
		}
	}

}
