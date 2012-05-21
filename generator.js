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

var writeFiles = function(objectName, contents) {
	var fileName = './out/js_' + objectName + '.gen.cpp';
	fs.writeFile(fileName, contents, function(err, out) {
		if (!err) {
			console.log('wrote file');
		} else {
			console.log(err);
		}
	});
};
exports.run = function(engineName, fileName) {
	var engine = loadTemplates(engineName);
	var contents = fs.readFileSync(fileName);
	var desc = JSON.parse(contents);
	if (desc.type == 'objectTemplate') {
		objectTemplate(engine, desc, function(err, result) {
			if (err) {
				console.log('error', err);
			}
			writeFiles(desc.name, result);
		});
	}
};


var autoProperties = function(engine, desc) {
	if (desc.autoProperties) {
		desc.autoProperties.forEach(function(prop) {
			desc.properties.push(prop.name);
		});
		desc.autoProperties.forEach(function(prop) {
			var type = engine.types[prop.type];
			var customSetter = engine.customSetters[type];
			var customGetter = engine.customGetters[type];
			if (customSetter) {
				prop.customSetter = customSetter;
			}
			if (customGetter) {
				prop.customGetter = customGetter;
			}
			prop.jsType = type;
		});
	}
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
			desc = merge(results, desc);
			merge(results.properties, results.autoProperties);
			render('objectTemplate', desc, function(err, result) {
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
