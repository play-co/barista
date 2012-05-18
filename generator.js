var fs = require('fs');
var engine = require('./engine');
var dust = require('dustjs-linkedin');
var async = require('async');

var templates = require('./templates').templates;
dust.escapeHtml = function(s) { return s; };
dust.optimizers.format = function(ctx, node) { return node; };

var merge = function(a, b) {
	for (var k in b) {
		if (a[k] === undefined) {
			a[k] = b[k];
		}
	}
	return a;
};

var render = function(name, desc, cb) {
	console.log('rendering', name);
	console.log(desc);
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
	console.log(templates);
	templates.forEach(function(template) {
		console.log('compiling', e[template], template);
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
			console.log(result);	
		});
	}
};

var objectTemplate = function(desc, cb) {
	async.parallel({
		methods: render('method', desc),
		properties: render('property', desc),
		templates: render('template', desc)
	},
	function(err, results) {
		if (!err) {
			console.log(results);
			desc = merge(results, desc);
			render('objectTemplate', desc, function(err, result) {
				cb(err, result);
			});
		}
	});
	
};

if (require.main === module) {
	exports.run('v8', './test/sound.json');
}
