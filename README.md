# ts-npm-lint
Utility to create typescript based npm modules. Can also strip reference paths for .d.ts files and check TSD configs.

Building strongly typed npm modules using typescript is quite tricky.
Especially if your package depends on other packages and you want to offer typings to consumers of your module.
This tool checks your `package.json`, `tsconfig.json` and `tsd.json` files to verify your setup.

The goal of this tool that _your_ npm package consumers can ultimately just do the following:

`npm install your-cool-page --save`

And in some `.ts` file:

```javascript
import coolPackage from "your-cool-package".
```

## Installation

`npm install -g ts-npm-lint`

## Usage

Run `ts-npm-lint` in the root of your package to get information about your current setup.

Run `ts-npm-lint --fix-typings` to strip triple slash references from your typing files so that they can be used by directly by other packages.
Probably this should be part of your build process, after running the typescript compiler.
In that case just run `npm install ts-npm-lint --save-dev` and add something like `"build": "tsc && ts-npm-lint --fix-typings"` to the `scripts` section of your `package.json`. 

## Example output

To get an idea of the things ts-npm-lint checks, here the output of the tool on different packages:

```
[ts-npm-lint] package.json doesn't declare a 'typings' entry file. Please include an entry file (without extension), e.g: "typings": "lib/index"

[ts-npm-lint] typescript is not registered as build dependency, please install it using 'npm install typescript --save-dev'

[ts-npm-lint] No 'tsconfig.json' was found. Please use it to define the default build parameters. See: https://github.com/Microsoft/TypeScript/wiki/tsconfig.json

[ts-npm-lint] Some dependencies of this package don't ship with own typings. You can install the 'tsd' tool to manage these. Use 'npm install -g tsd'. For more info see: http://definitelytyped.org/tsd/

[ts-npm-lint] No *.d.ts files where found in the compilers output directory (.). Please run the typescript compiler first and make sure the 'declaration' option is enabled.
```

```
[ts-npm-lint] Some dependencies of this package don't ship with their own typings. You can install the 'tsd' tool to manage these. Use 'npm install -g tsd'. For more info see: http://definitelytyped.org/tsd/. Packages without typings:
  lodash, node-uuid, restler, node
```

```
[ts-npm-lint] It is recommended to set the compiler output directory using the "outDir" option, so that the typescript sources can be put into .npmignore, and the output files and declaration files in .gitignore. e.g: '"outDir": "lib/"'

[ts-npm-lint] Please mention in the documentation of your package that the following typings might need to be installed using 'tsd install <package> --save':
  when, rest, node, lodash, xml2js, jsonpath, assertion-error, chai, mocha, promises-a-plus, chai-as-promised, nock

[ts-npm-lint] Found '/// <reference path' d.ts file includes in the following .d.ts files:

  ./test/smoke-test.d.ts: /// <reference path="../typings/tsd.d.ts" />

[ts-npm-lint] Please remove those references to make your typings usable for package consumers. Keeping triple slash references might collide with typings used in consuming packages. Remove triple slash references by running 'ts-npm-lint --fix-typings' as part of your build process.
```

One might find some of the hints opiniated. If it raises any questions, please feel free to file an isue for an explanation!


## FAQ

Please start asking!

**Q: Does it work on windows?**
A: Didn't test, but it should.

## Future ideas

* Query tsd to see whether typings are available
* Instead of prosing a solution, apply a solution
* Add option to only fix typings in a specified dir
* Check typescript version (1.6+ required)