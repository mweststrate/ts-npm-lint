#!/usr/bin/env node
/*jslint
	node
*/
var fs = require('fs');
var glob = require('glob');
var chalk = require('chalk');

function read(fileName) {
	return fs.readFileSync(fileName, 'utf8');
}

function analyze() {
	var outDir = ".";

	if (!fs.existsSync('package.json')) {
		exit(1, "Expected a file 'package.json' in the current directory. Pleare run ts-npm-lint in the root of a package");
	}
	
	var pkgJson = JSON.parse(read('package.json'));
	
	if (!pkgJson.main)
		hint("package.json didn't declare a 'main' entry file. Please include an entry file, e.g: \"main\": \"lib/index.js\"");
	if (!pkgJson.typings)
		hint("package.json doesn't declare a 'typings' entry file. Please include an entry file (without extension), e.g: \"typings\": \"lib/index\"");
	if (!pkgJson.devDependencies || !pkgJson.devDependencies.typescript)
		hint("typescript is not registered as build dependency, please install it using 'npm install typescript --save-dev'");
	
	if (!fs.existsSync('tsconfig.json')) {
		hint("No 'tsconfig.json' was found. Please use it to define the default build parameters. See: https://github.com/Microsoft/TypeScript/wiki/tsconfig.json");
	} else {
		var tsConfig = JSON.parse(read('tsconfig.json'));
		if (!tsConfig.compilerOptions)
			hint("'tsconfig.json' doesn't contain a 'compilerOptions' section. Please add it to define default compile parameters");
		else {
			var cOptions = tsConfig.compilerOptions;
			if (!cOptions.declaration)
				hint('Set the tsconfig.json compiler option \'"declaration": true\' so that module consumers can use your typings');
			if (!cOptions.module)
				hint('It is strongly recommended to set the compiler option \'"module": "commonjs"\' so that your module can be consumed by other npm packages');
			if (!cOptions.outDir) {
				hint('It is recommended to set the compiler output directory using the "outDir" option, so that the typescript sources can be put into .npmignore, and the output files and declaration files in .gitignore. e.g: \'"outDir": "lib/"\'');
			} else {
				outDir = cOptions.outDir.replace(/\/$|\\$/,""); // strip trailing slash
			}
		}
	}

	if (pkgJson.dependencies) {
		var depInfo = []; // name, hasOwnTyping
		Object.keys(pkgJson.dependencies).map(function(dep) {
			if (!fs.existsSync("node_modules/" + dep + "/package.json")) {
				hint("Failed to read package.json of dependency '" + dep + "', please run 'npm install'");
			} else {
				var subPackage = JSON.parse(read("node_modules/" + dep + "/package.json"));
				depInfo.push([dep, !!subPackage.typings]);
			}
		});
		
		// recommend 'node' typings as well.
		depInfo.push(["node", false]);
		
		var needsTsd = depInfo.some(function(entry) {
			return entry[1] === false;
		});
		var hasTsd = fs.existsSync('tsd.json');
		if (needsTsd && !hasTsd)
			hint("Some dependencies of this package don't ship with their own typings. You can install the 'tsd' tool to manage these. Use 'npm install -g tsd'. For more info see: http://definitelytyped.org/tsd/. Packages without typings:\n  " + 
				depInfo.filter(function(e) { return !e[1]; }).map(function(e) { return e[0]; }).join(', ')
			);
		if (hasTsd) {
			var tsdInfo = JSON.parse(read('tsd.json'));
			var installed = (tsdInfo.installed ? Object.keys(tsdInfo.installed) : []).map(function(name) {
				return name.split("/")[0];
			});

			depInfo.forEach(function (entry) {
				var name = entry[0];
				if (entry[1] && installed.indexOf(name) !== -1)
					hint("A tsd typing for the package '" + name + "' was installed, yet it ships with its own typing!");
				if (!entry[1] && installed.indexOf(name) === -1)
					hint("No tsd typing were installed for package '" + name + "', try to use 'tsd install " + name + " --save' to be able to use strongly typed package imports.");
			});
			
			hint("Please mention in the documentation of your package that the following typings might need to be installed using 'tsd install <package> --save':\n  " + installed.join(', '));
		}
	}
	
	var dTsFiles = findDtsFiles(outDir);
	if (dTsFiles.length === 0) {
		hint("No *.d.ts files where found in the compilers output directory ("+ outDir + "). Please run the typescript compiler first and make sure the 'declaration' option is enabled.");
	} else {
		var foundReferences = dTsFiles
			.map(function (filename) {
				return read(filename)
					.split("\n")
					.filter(function(line) {
						return line.indexOf('/// <reference path=') >= 0;
					})
					.map(function(line) {
						return "  " + filename + ': ' + line;
					});
			})
			.reduce(function(res, lines) {
				res.push.apply(res, lines);
				return res;
			}, []);
		
		if (foundReferences.length > 0) {
			hint("Found '/// <reference path' d.ts file includes in the following .d.ts files:");
			foundReferences.forEach(function(line) {
				console.log(line);
			});
			console.log();
			hint("Please remove those references to make your typings usable for package consumers. " + 
			     "Keeping triple slash references might collide with typings used in consuming packages. " +
			     "Remove triple slash references by running 'ts-npm-lint --fix-typings' as part of your build process.");
		}
	}
}

function fixTypings() {
	var outDir = ".";
	var config = { };
	if (fs.existsSync('tsconfig.json'))
		config = JSON.parse(read('tsconfig.json'));
	if (config && config.compilerOptions && config.compilerOptions.outDir)
		outDir = config.compilerOptions.outDir;
	var dtsFiles = findDtsFiles(outDir);
	if (!dtsFiles)
		exit(2, "No .d.ts files found in dir: " + outDir);
	dtsFiles.forEach(function(file) {
		var match = false;
		var contents = read(file).replace(/^\/\/\/ <reference path="(.*)" \/>/gm, function(_, tsdFile) {
			console.log("[ts-npm-lint] Removed reference to '" + tsdFile + "' in " + file);
			return "// [ts-npm-lint] disabled triple slash reference to '" + tsdFile + "'";
		});
		fs.writeFileSync(file, contents,'utf8');
	});
}

function findDtsFiles(dir) {
	return glob.sync(dir + "/**/*.d.ts", {
		nodir: true,
		ignore: [dir + "/typings/**/*.d.ts", dir + "/node_modules/**/*.d.ts"]
	});
}

function hint(msg) {
	console.log(chalk.dim("[ts-npm-lint]") + " " + msg);
	console.log();
}

function exit(nr, msg) {
	console.error(chalk.red("[ts-npm-lint] ") + msg);
	process.exit(nr);
}

if (!module.parent) {
	if (process.argv[process.argv.length - 1] === '--fix-typings')
		fixTypings();
	else
		analyze();
}

module.exports = {
	analyze: analyze,
	fixTypings: fixTypings
};