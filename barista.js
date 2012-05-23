var generator = require('./generator');


var argv = require('optimist')
	.usage('Usage: $0 -e [engine]  object.json ... | -c')
	.demand(['e'])
	.alias('e', 'engine')
	.describe('e', 'the engine to generate object wrappers for')
	.string('e')
	.alias('c', '--create')
	.describe('c', 'create templates for a new engine')
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
