var fs = require('fs');
var engine = require('./engine');
var dust = require('dustjs-linkedin');
var async = require('async');

var templates = require('./templates').templates;
var typeInfo = require('./types');
var types = typeInfo.types;
var customSetters = typeInfo.customSetters;
var customGetters = typeInfo.customGetters;

dust.escapeHtml = function(s) { return s; };
dust.optimizers.format = function(ctx, node) { return node; };


//TODO
//generate file and header
//add support for custom type setters/getters
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

var loadTemplates = function(engineName) {
	var e = engine.load(engineName);
	templates.forEach(function(template) {
		var compiled = dust.compile(e[template], template);	
		if (compiled) {
			dust.loadSource(compiled);
		}
	});
	return e;
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
			console.log(result);
		});
	}
};


var autoProperties = function(engine, desc) {
	if (desc.autoProperties) {
		desc.autoProperties.forEach(function(prop) {
			desc.properties.push(prop.name);
		});
		desc.autoProperties.forEach(function(prop) {
			console.log('looking for ', prop.type);
			console.dir(types);
			var type = types[prop.type];
			console.log('type is', type);
			var customSetter = engine.customSetters[type];
			var customGetter = engine.customGetters[type];
			if (customSetter) {
				console.log('has a custom setter!');
				prop.customSetter = customSetter;
			}
			if (customGetter) {
				prop.customGetter = customGetter;
			}
			prop.type = type;
		});
	}
	return function(cb) {
		var renderFuncs = [];
		desc.autoProperties.forEach(function(prop) {
			['customSetter', 'customGetter'].forEach(function(type) {
				renderFuncs.push(function(cb) {
					render(type, prop, function(err, result) {
						prop[type] = result;	
						cb(err, result);
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
