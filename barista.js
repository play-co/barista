var generator = require('./generator');


var argv = require('optimist')
	.usage('Usage: $0 -e [engine] -f object.json')
	.demand(['e', 'f'])
	.alias('e', 'engine')
	.describe('e', 'the engine to generate object wrappers for')
	.string('e')
	.alias('f', 'file')
	.describe('f', 'the file describing the object to be wrapped')
	.string('f')
	.argv;


var files = argv.f;
if (!(files instanceof Array)) {
	files = [files];
}
files.forEach(function(file) {
	generator.run(argv.e, file);
});
