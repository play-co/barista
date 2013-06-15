/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.
 
 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.
 
 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

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
