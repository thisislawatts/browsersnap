const chalk = require('chalk');
const got = require('got');
const fs = require('fs');
const Browserstack = require('browserstack');
const _ = require('lodash');



/**
 *
 * @return array - Array of URLs
 */
function parseUrls( url ) {

	if ( url.match(/json/) ) {

		return require( url ).urls;
	}

	if (url.match(',')) {
		return url.split(',');
	}

	return [url];
}

const Browsersnap = function( username, password, options ) {

	this.auth = {
		username : username,
		password : password
	};

	this.opts = options;
	this.screenshotQueue = [];
	this.processingQueue = [];
	this.processingController;
	this.processedCounter = 0;
	this.processTotal = 0;
	this.urls = [];
	this.imagesOutputTo = 'reports/';

	this.client;


	if (!this.auth) {

		console.log(chalk.red('Failed to find access credentials.'));

		return this;
	}

	this.client = Browserstack.createScreenshotClient(this.auth)

	this.log(chalk.green(`Using account ${this.auth.username}.`));

	return this;
}


/**
 *
 *
 * @param  array urls
 * @return array      [description]
 */
Browsersnap.prototype.get = function(urls) {

	let _self = this;
	_self.urls = parseUrls(urls);

	console.log( chalk.green(`${_self.urls.length} url(s) requested.`));


	_self.urls.map(function(uri) {
		_self.screenshotQueue.push(uri);
	});

	_self.processingController = setInterval( function() {
		_self.checkingProcessingJobs();
	}, 1500 );

	return urls;
}

Browsersnap.prototype.browsers = function() {
	let _self = this;

	_self.client.getBrowsers(function( error, browsers ) {

		if (error) {
			console.log(chalk.red(error));
			return;
		}

		// if (filter === 'latest') {
		// 	var nested = [];
		// 	var tmpB = '', tmpBv = 0;

		// 	_.map(browsers.reverse(), function(browser) {
		// 		var os = keyify(browser.os);
		// 		var osVersion = keyify(browser.os_version);
		// 		var browserName = keyify(browser.browser);
		// 		var browserVersion = keyify(browser.browser_version);

		// 		if ( isDepreciatedOS(os, osVersion) || (tmpB === browserName && tmpBv > browserVersion) ) {
		// 			return;
		// 		}

		// 		tmpB = browserName;
		// 		tmpBv = browserVersion;

		// 		if (nested.length < 25 ) {
		// 			nested.push(browser);
		// 		}
		// 	});

		// 	console.log( JSON.stringify(nested));


		// } else {
		console.log( JSON.stringify(browsers) );
	});
}

Browsersnap.prototype.checkingProcessingJobs = function() {

	let _self = this;


	if ( _self.processingQueue.length >= 1 ) {
		_self.getJobStatus( _self.processingQueue[0].job_id );

		_self.log( chalk.green( _self.processedCounter + ' of ' + _self.urls.length + ' completed.'));

		return;
	}


	if ( _self.screenshotQueue.length > 0 ) {
		_self.getScreenshotFor( _self.screenshotQueue.pop(), _self.getLatestBrowsers( 2 ) );
		return;
	}

	console.log( chalk.green(
		`All processing jobs complete 👌
Images saved in ${_self.imagesOutputTo}/*.jpg` ) );
	clearInterval( _self.processingController );
}

Browsersnap.prototype.getJobStatus = function(job_id) {

	let _self = this;

	_self.client.getJob( job_id ,function(err, job) {

		if (err) {
			throw err;
		}

		if (job.state === 'all_queued') {

			console.log( chalk.dim('Waiting: ' + job.state ), job );

		} else {

			if (job.state === 'done') {

				_self.processedCounter++;

				_self.processingQueue = _.remove( _self.processingQueue, function(j) {
					return j.id === job.id;
				});

				_self.saveScreenshots( job.screenshots );
			}
		}
	});
}



Browsersnap.prototype.getLatestBrowsers = function( numberOfBrowsers ) {

	return [{"device":null,"browser":"firefox","os_version":"El Capitan","browser_version":"45.0","os":"OS X"}];

	return _.slice( _.shuffle( require( BROWSER_PATH + 'latest.json')), 0, numberOfBrowsers );
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

Browsersnap.prototype.log = function(str) {
	if (this.opts.verboseMode) {
		console.log(str);
	}
}

Browsersnap.prototype.getScreenshotFor = function ( url, browsers ) {

	let _self = this,
		opts = {
		url 		: url,
		browsers	: browsers,
		wait_time 	: 10
	};

	_self.client.generateScreenshots( opts, (err, job) => {
		if (err) {
			console.log(chalk.red(err), err);
			_self.screenshotQueue.push(url);

			_self.log(chalk.yellow( `Moved ${url} back to screenshotQueue` ));

			return false;
		}

		_self.processingQueue.push( job );
		console.log(`Awaiting screenshots for ${opts.url} from ${browsers.length} browser(s).`);
	});
}



/**
 * [saveScreenshots description]
 * @param  {array} screenshots
 * @return {[type]}             [description]
 */
Browsersnap.prototype.saveScreenshots = function(screenshots) {

	let _self = this;

	screenshots.map(function(screenshot) {

		_self.log(`Saving image for: ${screenshot.url}`);

		if (!fs.existsSync(_self.imagesOutputTo) ) {
			fs.mkdir(_self.imagesOutputTo);
		}

		var filename = _.compact( _.values( _.pick( screenshot, ['os','os_version','device','browser','browser_version']))).join('_').toLowerCase();

		got.stream(screenshot.image_url).pipe( fs.createWriteStream( _self.imagesOutputTo + '/' + urlToFilename( screenshot.url ) + '-' + filename +'.jpg',{
			autoclose : false
		}));

	});
}

var urlToFilename = ( url ) => {
	return url.replace(/https?:\/\/|\/$/g,'').split('?').shift().replace(/\//g,'-');
};

module.exports = Browsersnap;
