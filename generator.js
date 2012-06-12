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
var loadTemplates = function(engineName) {
	var e = engine.load(engineName);
	templates.forEach(function(template) {
		var compiled = dust.compile(e[template], template);	
		if (compiled) {
			dust.loadSource(compiled);
		}
	});
	loadCustom('Setter', e);
	loadCustom('Getter', e);
	return e;
};

var writeFile = function(fileName, contents) {
	return function(cb) {
		fs.writeFile(fileName, contents, cb);
	};
};
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
	properties: [],
	autoProperties: []
};
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

var isUpper = function(char) {
	return char && char.toUpperCase() == char;
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
		if (index != 0 && isUpper(c)) {
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
}
var getCName = function(name) {
	//split based on capital letters
	var toks = split(name).map(function(tok) {
		return tok.toLowerCase();	
	});
	return toks.join('_');
}

var autoProperties = function(engine, desc) {
	if (desc.autoProperties.length) {
		desc.autoProperties.forEach(function(prop) {
			desc.properties.push(prop.name);
		});
		desc.autoProperties.forEach(function(prop) {
			var type = engine.types[prop.type];
			var customSetter = engine.customSetters[prop.type];
			var customGetter = engine.customGetters[prop.type];
			if (!customSetter) {
				var customSetter = engine.customSetters[type];
			}
			if (!customGetter) {
				var customGetter = engine.customGetters[type];
			}
			console.log(prop, customSetter, customGetter);
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
			['customSetter', 'customGetter'].forEach(function(type) {
				var templateName = type + '_' + prop.jsType;
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

var objectTemplate = function(engine, desc, cb) {
	async.parallel({
		methods: render('method', desc),
		autoProperties: autoProperties(engine, desc),
		properties: render('property', desc),
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

if (require.main === module) {
	exports.run('v8', './test/sound.json');
}
