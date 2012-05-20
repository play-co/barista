var generator = require('./generator');


var argv = require('optimist')
	.usage('Usage: $0 -e [engine] -f object.json')
	.demand(['e', 'f'])
	.alias('e', 'engine')
	.alias('f', 'file')
	.describe('e', 'the engine to generate object wrappers for')
	.describe('f', 'the file describing the object to be wrapped')
	.argv;


generator.run(argv.e, argv.f);
