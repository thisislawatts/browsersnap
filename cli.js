#!/usr/bin/env node

const Browsersnap = require('./src/Browsersnap.js');

const chalk = require('chalk'),
		fs = require('fs'),
		_ = require('lodash'),
		BrowserStack = require('browserstack'),
		pkg = require('./package.json'),
		program = require('commander');



function getAuthDetails(username, password) {
	var ret = false;

	if ( !username || !password ) {

		if ( fs.existsSync( process.cwd() + '/.browserstack' ) ) {
			ret = JSON.parse(fs.readFileSync( process.cwd() + '/.browserstack'));
		} else {
			console.log(chalk.yellow(
				`No Browserstack account details provided, either:
	* Check you've got a .browserstack file in current directory
	* Add them to this command with --username|password flags
			`));
			process.exit();
		}

		return ret;
	}

	return {
		username : username,
		password : password
	}
}


program
	.version(pkg.version)
	.option('-u, --username [string]', 'Username')
	.option('-p, --password [string]', 'Password')
	.option('--verbose', 'Verbose mode');

program
	.command('browsers')
	.description(`Fetch available browsers as json`)
	.action(function(filter, options) {

		let auth = getAuthDetails(program.username, program.password);

		let bs = new Browsersnap( auth.username, auth.password, {
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
