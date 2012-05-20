var fs = require('fs');
var engine = require('./engine');
var dust = require('dustjs-linkedin');
var async = require('async');

var templates = require('./templates').templates;
var types = require('./types').types;
dust.escapeHtml = function(s) { return s; };
dust.optimizers.format = function(ctx, node) { return node; };


//TODO
//generate file and header
//add support for custom type setters/getters
//wrap in an easy to use commandline interface
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
};

exports.run = function(engineName, fileName) {
	loadTemplates(engineName);
	var contents = fs.readFileSync(fileName);
	var desc = JSON.parse(contents);
	if (desc.type == 'objectTemplate') {
		objectTemplate(desc, function(err, result) {
			if (err) {
				console.log('error', err);
			}
			console.log(result);
		});
	}
};


var autoProperties = function(desc) {
	if (desc.autoProperties) {
		merge(desc.properties, desc.autoProperties);
		desc.autoProperties.forEach(function(prop) {
			prop.type = types[prop.type];
		});
	}
	return function(cb) {
		if (desc.autoProperties) {
			dust.render('autoProperty', desc, cb);
		} else {
			cb(null, null);
		}
	};
};
var objectTemplate = function(desc, cb) {
	async.parallel({
		methods: render('method', desc),
		autoProperties: autoProperties(desc),
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
