#!/usr/bin/env node
var generator = require('./generator');
var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var indent = require('./indent');


var argv = require('optimist')
	.usage('Usage: $0 -e [engine]  object.json ... [-o outputdir] | -c')
	.demand(['e'])
	.alias('e', 'engine')
	.describe('e', 'the engine to generate object wrappers for')
	.string('e')
	.alias('c', 'create')
	.describe('c', 'create templates for a new engine')
	.string('o')
	.alias('o', 'output')
	.describe('o', 'directory in which to place the generated source files')
	.argv;


if (argv.c) {
	require('./engine').create(argv.e);
} else {
	var files = argv._;
	var outputDir = argv.o || './out';
	if (!files.length) {
		console.log('missing object description files');
		process.exit(1);
	}
	if (!(files instanceof Array)) {
		files = [files];
	}
	files.forEach(function(file) {
		generator.run(argv.e, file, outputDir);
	});
	indent.indent(outputDir);
}
