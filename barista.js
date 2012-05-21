var generator = require('./generator');


var argv = require('optimist')
	.usage('Usage: $0 -e [engine]  object.json ... | -c')
	.demand(['e'])
	.alias('e', 'engine')
	.describe('e', 'the engine to generate object wrappers for')
	.string('e')
	.describe('f', 'the file describing the object to be wrapped')
	.alias('c', '--create')
	.argv;


if (argv.c) {
	require('./engine').create(argv.e);
} else {
	var files = argv._;
	if (!files.length) {
		console.log('missing object description files');
		process.exit(1);
	}
	if (!(files instanceof Array)) {
		files = [files];
	}
	files.forEach(function(file) {
		generator.run(argv.e, file);
	});
}
