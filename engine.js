var fs = require('fs');
var async = require('async');
var templates = require('./templates').templates;

var buildPath = function(engineName, templateName) {
	return templatePath = __dirname + '/engines/' + engineName + '/' + templateName;
};
var _load = function(engineName, templateName) {
	var templatePath = buildPath(engineName, templateName);
	var template = fs.readFileSync(templatePath).toString();
	return template;
};
exports.load = function(engineName, cb) {
	var engine = {};
	templates.forEach(function(template) {
		engine[template] = _load(engineName, template + '.bar');
	});
	['customSetters', 'customGetters'].forEach(function(type) {
		var templates = fs.readdirSync(buildPath(engineName, type)).filter(function(fileName) {
			return /\.bar/.test(fileName);	
		});
		engine[type] = {};
		templates.forEach(function(template) {
			engine[type][template.slice(0, -4)] = _load(engineName, type + '/' + template);
		});
	});
	return engine;
};


var writeTemplate = function(path) {
	return function(cb) {
		console.log('writing', path);
		fs.writeFile(path, '', cb);
	};
};
exports.create = function(name) {
	enginePath = __dirname + '/engines/' + name;
	
	async.parallel(
		[
			fs.mkdir.bind(fs, enginePath),
			fs.mkdir.bind(fs, enginePath + '/customSetters'),
			fs.mkdir.bind(fs, enginePath + '/customGetters')
		].concat(
		templates.map(function(template) {
			return writeTemplate(enginePath + '/' + template + '.bar');
		})),
		function(err, result) {
			if (err) {
				console.log('Error building templates for engine', name);
			} else {
				console.log('Templates for engine', name, 'built!');
			}
		}
	);

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
