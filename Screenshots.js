/**
 * Screenshots
 *
 * @version 0.0.2
 */
var http = require('http'),
	fs = require('fs'),
	sugar = require('sugar'),
	md5 = require('MD5'),
	BrowserStack = require( "browserstack" ),
	stdout = process.stdout;

var auth = getAuthDetails();

if (!auth) {
	stdout.write('\033[31mNo Auth details provided, check you\'ve got a .browserstack file.\033\[39m\n');
		process.exit();
}

var client = BrowserStack.createClient( auth );

function getAuthDetails() {
	var ret = false;

	if ( fs.existsSync('.browserstack') ) {
		ret = JSON.parse( fs.readFileSync( '.browserstack', { encoding: "utf-8" }) );
	}
	return ret;
}

function getURL() {
	var args = process.argv.slice(2),
		url = args.length >= 1 ? args[0].replace(/--url=/,'') : "";

	if ( "" ===  url ) {
		url = 'http://socd.io';	
		stdout.write('\033[33mNo --url provided, falling back to: http://socd.io\033\[39m\n');
	}

	return url;
}

var processing = [];
var url = getURL();

var availableBrowsers,
	browserWorkers = [],
	bootupTimeSeconds = 25; 

fs.readFile( './less-browsers.json', { encoding: "utf-8" }, function ( err, data ) {
	if (err) throw err;
	
	availableBrowsers = JSON.parse( data );
});

	
client.getBrowsers( function ( error, browsers ) {
	
	// Create all our Browsers!
	for (var browser_count = 0; browser_count < availableBrowsers.length; browser_count++) {
		var browser = availableBrowsers[browser_count];

		var p = createWorker( Object.merge(
			browser,
			{
				url: url,
				timeout: 120
		}) );
	};
	
	interval = setInterval(function () {
		client.getWorkers( function(err, workers ) {
			console.log("Workers Waiting: " + workers.length + "/" + availableBrowsers.length );
			
			for ( var worker_count = 0; worker_count < workers.length; worker_count++) {
				var worker = workers[worker_count],
					hash = [
						worker.os,
						worker.os_version,
						worker.browser,
						worker.browser_version
					].toString();

				if ( worker.status === "running" && !processing.find( hash ) )  {
					processing.push( hash );
					captureScreengrab( worker );
				}
			};

			if ( workers.length === 0 ) {
				clearInterval(interval);
				process.exit();
			}
		});
	}, 2000 );

	// Refresh Local Browser Listing
	// fs.writeFile( 'browsers.json', JSON.stringify( browsers ) , function( err ) { throw err });
});


function saveImage ( url, dir_path, filename ) {
	var req = http.get( url, function ( res ) {
		var imagedata = '';
		res.setEncoding('binary');
		
		res.on('data', function (chunk) {
			imagedata += chunk;
		});

		res.on('end', function () {
			fs.mkdir('screenshots/', function(err) {});
			fs.mkdir('screenshots/' + dir_path, function(err) { } );
			fs.writeFile( 'screenshots/' + dir_path + "/" + filename, imagedata, 'binary', function ( err ) {
				if(err) throw err;
				console.log("Saved:" + 'screenshots/' + dir_path + "/" + filename )
			})
		});
	});
}

function createWorker( profile ) {
	client.createWorker( profile, function ( error, worker ) {
		browserWorkers.push( Object.merge( worker, { profile: profile }) );
	});
	return profile;
}

function captureScreengrab( worker ) {
	
	setTimeout( function() {
		
		client.takeScreenshot( worker.id, function ( error, data ) {

			if (error) {
				console.log(data);
				throw error;
			};

			if (!data.url) {
				console.log("captureScreengrab incorrect data provided:", data, error, worker );
				captureScreengrab(worker);
				return;
			}
			console.log(url.replace(/https?:\/\//g, '' ));
			saveImage( data.url, url.replace(/https?:\/\//g, '' ) , imageFileName( worker ) + ".png" );
			killWorker( worker );
		});
	}, bootupTimeSeconds * 1000 );
}

function imageFileName( worker ) {
	str = worker.os + "-" + worker.os_version + "-" + worker.browser + "-" + worker.browser_version;
	return str.toLowerCase().replace(/\s/,'-');
}

function killWorker( worker ) {
	client.terminateWorker( worker.id, function () {
		console.log( "Terminated Worker: " + worker.id, browserWorkers.length );
	});
}
