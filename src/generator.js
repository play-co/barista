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
var engine = require('./engine');
var dust = require('dustjs-linkedin');
var async = require('async');

var templates = require('./templates').templates;

dust.escapeHtml = function(s) { return s; };
dust.optimizers.format = function(ctx, node) { return node; };


//TODO
//generate file and header
//convert android project to this
//LATER
//generate the struct?
//check for dependencies?
var merge = function(a, b) {
	for (var k in b) {
		if (a[k] === undefined) {
			a[k] = b[k];
		}
	}
	return a;
};

/*
 * render the template named @name
 * with the parameters desc. 
 *
 * If a callback is passed, do the rendering immediately
 * If not, curry the render function
 */
var render = function(name, desc, cb) {
	var fn =  function(cb) {
		return dust.render(name, desc, cb);
	};
	if (cb) {
		return fn(cb);
	} else {
		return fn;
	}
};

/*
 * load a custom type (String, Boolean) for a given engine
 * These types are described in 
 * engine/engineName/customSetters/type.bar
 * engine/engineName/customGetters/type.bar
 *
 * These are used to provide custom functionality when boxing 
 * or unboxing a JavaScript type
 */
var loadCustom = function(type, engine) {
	type = 'custom' + type;
	for (var k in engine[type + 's']) {
		var name = type + '_' + k;
		var compiled = dust.compile(engine[type + 's'][k], name);
		if (compiled) {
			dust.loadSource(compiled);
		}
	}
};

/*
 * Load the templates for a given engine
 * Generally these are method, property, autoproperty
 * Though there can be more.  Each template is compiled
 * and therefore stored in the dust cache for later use. 
 */
var loadTemplates = function(engineName) {
	var e = engine.load(engineName);
	templates.forEach(function(template) {
		console.log('compiling', template);
		var compiled = dust.compile(e[template], template);	
		if (compiled) {
			dust.loadSource(compiled);
		}
	});
	loadCustom('Setter', e);
	loadCustom('Getter', e);
	return e;
};

/*
 * Curried function for writing a file asynchronously.
 */
var writeFile = function(fileName, contents) {
	return function(cb) {
		fs.writeFile(fileName, contents, cb);
	};
};

/*
 * For a given object description and implementation,
 * write the header and source file to the specified output
 * directory.
 *TODO allow the names to be configured.
 */
var writeFiles = function(objectName, sourceContents, headerContents, outputDir) {
	var outputPathBase = outputDir + '/js_' + objectName + '_template.gen';
	var sourceName = outputPathBase + '.cpp';
	var headerName = outputPathBase + '.h';

	async.parallel([
			writeFile(sourceName, sourceContents),
			writeFile(headerName, headerContents)
	],
	function(err, result) {
		if (err) {
			console.log(err);
		}
	});
};

/*
 * An object description may have one or more "properties".  Properties
 * correspond to getter/setter object properties in JavaScript.
 *
 * An object description that specifies properties is making the promise
 * that the getter and/or setter for this property is implemented elsewhere
 * in their C source.
 *
 * Properties can be specified in two ways - either a String name, which
 * means that the property is readable and writable, or an object
 * {
 *     name: "propertyName",
 *     readOnly: true|false
 * }
 *
 * This method will normalize them to all be of the second style.
 */
var normalizeProperties = function(desc) {
	var props = desc.properties;
	for (var i = 0; i < props.length; i++) {
	
		var prop = props[i];
		if (typeof prop == 'string') {
			props[i] = {
				name: prop,
				readOnly: false
			};
		}
		props[i].hasSetter = !props[i].readOnly;
	}
};

var defaultContents = {
	methods: [],
	methodArray: [],
	properties: [],
	propertyArray: [],
	autoProperties: []
};
/*
 * Given an engineName and an object description file, generate the 
 * C wrapper and write it to outputDir
 */
exports.run = function(engineName, fileName, outputDir) {
	var engine = loadTemplates(engineName);
	var contents = fs.readFileSync(fileName);
	var desc;
	try {
		desc = JSON.parse(contents);
	} catch (e) {
		console.log('failed to parse object description for: ' + fileName);
		return;
	}
	merge(desc, defaultContents);
	if (desc.type == 'objectTemplate') {
		objectTemplate(engine, desc, function(err, result) {
			if (err) {
				console.log('error', err);
			}
			var name = desc.name;
			writeFiles(name, result.objectTemplate, result.header, outputDir);
		});
	}
};

/*
 * string utility functions
 */
var isUpper = function(char) {
	return char && char.toUpperCase() == char;
};

var isAlpha = function(char) {
	return /[A-Za-z]/.test(char);
}

var split = function(name) {
	var toks = [];
	var index = 0;
	while (name.length) {
		if (index == name.length) {
			toks.push(name.slice());
			break;
		}
		var c = name[index];
		if (index !== 0 && isUpper(c) && isAlpha(c)) {
			toks.push(name.slice(0, index));
			name = name.slice(index);
			index = 0;
			while (isUpper(name[index])) {
				index++;	
			}
		} else {
			index++;
		}
	}
	return toks;
};

/*
 * given a camelCase name, return the
 * c_style_name version of it.
 *
 * There's a slight oddity here, which is that a name like
 * hasJSRender will get turned into has_jsrender.
 * TODO fix this?
 */
var getCName = function(name) {
	//split based on capital letters
	var toks = split(name).map(function(tok) {
		return tok.toLowerCase();	
	});
	return toks.join('_');
};

/*
 * autoProperties are properties specified on an object
 * description that can have their implementations automatically
 * generated.  Autoproperty specs look like:
 *
 * {
 *     "type": "double", //type is specified in engineName/types.js
 *     "name": "myProperty"
 * }
 *
 * getters and setters are then automatically generated based on
 * the autoProperty.bar template.
 */
var autoProperties = function(engine, desc) {
	if (desc.autoProperties.length) {
		desc.autoProperties.forEach(function(prop) {
			desc.properties.push(prop.name);
		});
		desc.autoProperties.forEach(function(prop) {
			prop.TYPE = prop.type.toUpperCase();
			var type = engine.types[prop.type];
			var customSetter = engine.customSetters[prop.type];
			var customGetter = engine.customGetters[prop.type];
			prop.customSetterType =  prop.type;
			prop.customGetterType =  prop.type;
			if (!customSetter) {
				prop.customSetterType =  type;
				customSetter = engine.customSetters[type];
			}
			if (!customGetter) {
				prop.customGetterType =  type;
				customGetter = engine.customGetters[type];
			}
			if (customSetter) {
				prop.customSetter = customSetter;
			}
			if (customGetter) {
				prop.customGetter = customGetter;
			}
			prop.jsType = type;
			prop.cName = getCName(prop.name);	
		});
	}
	normalizeProperties(desc);
	return function(cb) {
		var renderFuncs = [];
		desc.autoProperties.forEach(function(prop) {
			var customTemplates = [];
			if (!prop.userSetter) {
				customTemplates.push('customSetter');
			}
			if (!prop.userGetter) {
				customTemplates.push('customGetter');
			}
			customTemplates.forEach(function(type) {
				var templateName = type + '_' + prop[type + 'Type'];
				renderFuncs.push(function(cb) {
					render(templateName, prop, function(err, result) {
						if (!err) {
							prop[type] = result;
						}
						cb(null, result);
					});
				});
			});
		});
		if (desc.autoProperties) {
			async.parallel(renderFuncs, function(err, result) {
				render('autoProperty', desc, cb);
			});
		} else {
			cb(null, null);
		}
	};
};

/*
 * An objectTemplate is a json file describing a C object that
 * should be wrapped in JavaScript.  It can have three types of
 * functionality:
 *
 * methods:
 *     Methods are described as:
 *     {
 *         "name": "aJavascriptMethod",
 *         "argCount": 1
 *     }
 *     They make the promise that a C method matching the method.bar
 *     template is implemented elsewhere.
 *
 *
 * properties:
 *     Properties can be specified in two ways - either a String name, which
 *     means that the property is readable and writable, or an object
 *     {
 *         name: "propertyName",
 *         readOnly: true|false
 *     }
 *     They make the promise that a C method matching the property.bar
 *     template is implemented elsewhere.
 *
 * autoProperties:
 *     autoProperties are properties specified on an object
 *     description that can have their implementations automatically
 *     generated.  Autoproperty specs look like:
 *
 *     {
 *         "type": "double", //type is specified in engineName/types.js
 *         "name": "myProperty"
 *     }
 *     They have wrappers generated by the engine/autoProperty.bar template
 *
 *
 *     objecTemplates also have the following properties:
 *
 *     name: the name of the C backing of the object
 *
 *     jsName: the name that should be exported to JavaScript
 *
 *     headers: an array of headers that should be included in the generated
 *     C source
 *
 *     hasConstructor: true|false.  If an objectTemplate has a constructor,
 *     it is assumed that it is correctly implemented elsewhere.
 *
 *     constructorArgc: if there is a constructor, the number of arguments to it
 *
 */
var objectTemplate = function(engine, desc, cb) {
	async.parallel({
		methods: render('method', desc),
		methodArray: render('methodArray', desc),
		autoProperties: autoProperties(engine, desc),
		properties: render('property', desc),
		propertyArray: render('propertyArray', desc),
		templates: render('template', desc)
	},
	function(err, results) {
		if (!err) {
			desc.templateNames = desc.templates;
			desc = merge(results, desc);
			desc.NAME = desc.name.toUpperCase();
			desc.objectName = desc.objectName || desc.name;
			merge(results.properties, results.autoProperties);
			async.parallel({
				objectTemplate: render('objectTemplate', desc),
				header: render('header', desc)
			},
			function(err, result) {
				cb(err, result);
			});
		} else {
			console.log('error', err);
		}
	});
	
};
