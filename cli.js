#!/usr/bin/env node

const Browsersnap = require('./src/Browsersnap.js');

const chalk = require('chalk'),
		fs = require('fs'),
		_ = require('lodash'),
		BrowserStack = require('browserstack'),
		pkg = require('./package.json'),
		program = require('commander');

program
	.version(pkg.version)
	.option('-u, --username [string]', 'Username')
	.option('-p, --password [string]', 'Password')
	.option('--verbose', 'Verbose mode');

program
	.command('browsers')
	.description(`Fetch available browsers as json`)
	.action(function(filter, options) {

		let bs = new Browsersnap(program.username, program.password, {
			verboseMode : program.verbose
		});

		return bs.browsers();
	});

program
	.command('get <url|comma,seperated,list,of,urls|path-to-json.url>')
	.description('Screenshot requested url')
	.action( function( urls ) {

		let bs = new Browsersnap(program.username, program.password, {
			verboseMode : program.verbose
		});

		bs.get(urls);

	});

program.parse(process.argv);
