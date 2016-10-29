#!/usr/bin/env node

const chalk = require('chalk'),
		got = require('got'),
		fs = require('fs'),
		_ = require('lodash'),
		BrowserStack = require('browserstack'),
		pkg = require('./package.json'),
		program = require('commander');

var	stdout = process.stdout;
var auth = getAuthDetails();
var screenshotClient = BrowserStack.createScreenshotClient(auth);

var screenshotQueue = [];

var processingQueue = [];
var processingController;

var processedCounter = 0;
var processTotal = 0;

program
	.version(pkg.version);

program
	.command('browsers [filter]')
	.description('Fetch available browsers as json')
	.action(function(filter) {

	screenshotClient.getBrowsers(function( error, browsers ) {

		if (filter === 'latest') {
			var nested = [];
			var tmpB = '', tmpBv = 0;

			_.map(browsers.reverse(), function(browser) {
				var os = keyify(browser.os);
				var osVersion = keyify(browser.os_version);
				var browserName = keyify(browser.browser);
				var browserVersion = keyify(browser.browser_version);

				if ( isDepreciatedOS(os, osVersion) || (tmpB === browserName && tmpBv > browserVersion) ) {
					return;
				}

				tmpB = browserName;
				tmpBv = browserVersion;

				if (nested.length < 25 ) {
					nested.push(browser);
				}
			});

			console.log( JSON.stringify(nested));


		} else {
			console.log( JSON.stringify(browsers) );
		}
	});
});

program
	.command('name')
	.action(function() {
		var b = require('./b.json');

		var out = b.map(function(browser) {
			return _.values(browser).join(' ').trim().replace(/\s/g,'-');
		});

		console.log(out);
	});

program
	.command('get <url|path-to-json.url>')
	.description('screenshot requested url')
	.action( function( url ) {

		// var urls = _.slice( getUrlsFromString( url ), 0, 2 );
		var urls = getUrlsFromString( url );

		console.log( chalk.cyan('Fetching ' + (urls.length > 1 ? urls.length + ' screenshots.' : url) ) );

		urls.map(function(uri) {

			screenshotQueue.push(uri);
		});

		processingController = setInterval( checkingProcessingJobs, 1500 );

		processTotal = urls.length;

	});

program.parse(process.argv);

/**
 *
 * @return array - Array of URLs
 */
function getUrlsFromString( url ) {

	if ( url.match(/json/) ) {

		return require( url ).urls;

	}

	return url.split(',');
}

function getLatestBrowsers( numberOfBrowsers ) {

	return [{"device":null,"browser":"firefox","os_version":"El Capitan","browser_version":"45.0","os":"OS X"}];

//	return _.slice( _.shuffle( require( BROWSER_PATH + 'latest.json')), 0, numberOfBrowsers );
}

function isDepreciatedOS( os, osVersion ) {
	var unsupported_os_versions = ['xp','snowleopard','mountainlion','lion'];

	if ( ['windows','osx'].indexOf(os) > -1 && unsupported_os_versions.indexOf(osVersion) > -1 ) {
		return true;
	}

	if ( ['android'].indexOf(os) > -1 ) {
		return osVersion <= 43;
	}

	if ( ['ios'].indexOf(os) > -1 ) {
		return osVersion <= 60;
	}

	return false;
}

function keyify( str ) {

	if (parseFloat(str)) {
		return str.replace('.','');
	}

	return str ? str.toLowerCase().replace(/\s/g,'') : false;
}

function getScreenshotFor( url, browsers ) {
	var opts = {
		url 		: url,
		browsers	: browsers,
		wait_time 	: 10
	};

	screenshotClient.generateScreenshots( opts, (err, job) => {
		if (err) {
			console.log(chalk.red(err));
			screenshotQueue.push(url);
			console.log( chalk.yellow( `Moved ${url} back to screenshotQueue` ) );

			return false;
		}

		// TODO: What is this all doing?
		//
		// if (job.screenshots) {
		// 	for (var i = 0; i < job.screenshots.length; i++) {
		// 		screenshotQueue.push(job.screenshots[i]);
		// 	}
		// }

		processingQueue.push( job );
		console.log('Added another job to processingQueue so there are now:', processingQueue.length );
	});
}



function getAuthDetails() {
	var ret = false;

	if ( fs.existsSync('.browserstack') ) {
		ret = JSON.parse(fs.readFileSync('.browserstack'));
	} else {
		stdout.write('No Auth details provided, check you\'ve got a .browserstack file.\n');
		process.exit();
	}

	return ret;
}


/**
 * [saveScreenshots description]
 * @param  {array} screenshots
 * @return {[type]}             [description]
 */
function saveScreenshots(screenshots) {

	console.log('Screenshots:', screenshots );

	screenshots.map(function(screenshot) {

		var folder = 'reports/hauslondon.com/';

		console.log('Saving image for:', screenshot );

		if (!fs.existsSync(folder) ) {
			fs.mkdir(folder);
		}

		var filename = _.compact( _.values( _.pick( screenshot, ['os','os_version','device','browser','browser_version']))).join('_').toLowerCase();

		console.log('Writing to:', screenshot.image_url );

		got.stream(screenshot.image_url).pipe( fs.createWriteStream( folder + '/' + urlToFilename( screenshot.url ) + '-' + filename +'.jpg',{
			autoclose: false
		}));

	});
}

var urlToFilename = ( url ) => {
	return url.replace(/https?:\/\/|\/$/g,'').split('?').shift().replace(/\//g,'-');
};

function checkingProcessingJobs() {

	// console.log( chalk.yellow( 'Number of items to be sent to browserstack:', screenshotQueue.length ) );
	// console.log( chalk.yellow( 'Number of items awaiting completion by browserstack:', processingQueue.length ) );

	console.log( chalk.green( processedCounter + ' of ' + processTotal + ' completed.'));

	if ( processingQueue.length >= 1 ) {
		getJobStatus( processingQueue[0].job_id );
		return;
	}


	// Check if there are
	//
	if ( screenshotQueue.length > 0 ) {
		getScreenshotFor( screenshotQueue.pop(), getLatestBrowsers( 2 ) );
		return;
	}

	console.log( chalk.bgGreen( 'All processing jobs complete.' ) );
	clearInterval( processingController );
}

function getJobStatus(job_id) {

	// console.log( 'Checking job:', job_id );

	screenshotClient.getJob( job_id ,function(err, job) {

		if (err) {
			throw err;
		}

		if (job.state === 'all_queued') {

			console.log( chalk.dim('Waiting: ' + job.state ), job );

		} else {

			// console.log('Job Status:', job.state );

			if (job.state === 'done' ) {
				processedCounter++;
				console.log(chalk.bgGreen('Job 1 of ' + processingQueue.length + ' completed.'));

				console.log('Remove job from queue:', job.id );

				processingQueue = _.remove( processingQueue, function(j) {
					console.log('Removing:', j.id, job.id );
					return j.id === job.id;
				});

				console.log('Number of jobs remaining:', processingQueue.length );
				saveScreenshots( job.screenshots );
			}
		}
	});
}
