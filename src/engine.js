/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.
 
 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.
 
 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

var fs = require('fs');
var async = require('async');
var templates = require('./templates').templates;

var buildPath = function(engineName, templateName) {
	return templatePath = __dirname + '/../engines/' + engineName + '/' + templateName;
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
	engine.types = require(buildPath(engineName, 'types.js')).types;
	return engine;
};


var writeTemplate = function(path) {
	return function(cb) {
		console.log('writing', path);
		fs.writeFile(path, '', cb);
	};
};
exports.create = function(name) {
	enginePath = __dirname + '/../engines/' + name;
	
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
