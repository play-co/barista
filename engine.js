var fs = require('fs');

var templates = ['objectTemplate', 'method'];


var _load = function(engineName, templateName) {
	var templatePath = __dirname + '/engines/' + engineName + '/' + templateName + '.bar';
	var template = fs.readFileSync(templatePath).toString();
	return template;
};
exports.load = function(engineName) {
	var engine = {};
	templates.forEach(function(template) {
		engine[template] = _load(engineName, template);
	});

	return engine;
};

if (require.main === module) {
	var engine = exports.load('spidermonkey');
	console.log(engine);

}
