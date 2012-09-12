var child = require('child_process');
var fs = require('fs');
var path = require('path');

exports.indent = function(dir) {

	// TODO: indent is not available on all platforms
	return;

	var files = fs.readdirSync(dir).map(function(file) { return path.join(dir, file); });
	var c = child.spawn('indent', [
		"--blank-lines-after-declarations",
		"--braces-on-if-line",
		"--braces-on-func-def-line",
		"--braces-on-struct-decl-line",
		"--line-length80",
		"--cuddle-else",
		"--no-space-after-casts",
		"--no-space-after-parentheses",
		"--no-space-after-function-call-names",
		"--space-after-for",
		"--space-after-if",
		"--space-after-while",
		"--swallow-optional-blank-lines"].concat(files)
	);
};
