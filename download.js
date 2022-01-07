require('dotenv').config();
const https = require('https');
const fs = require('fs');
const async = require('async');
const path = require('path');

try {
	if (!process.env.TILEURL) {
		throw new Error('Missing TILEURL in .env file')
	}
	if (!process.env.FORMAT) {
		throw new Error('Missing FORMAT in .env file')
	}
	if (!process.env.MBFILE) {
		throw new Error('Missing MBFILE in .env file')
	}

	const tileNumbers = [];
	const tilesFolderName = 'tiles';
	const tilesFolder =  path.join(__dirname, tilesFolderName);
	const MBTilesFile = path.join(__dirname, process.env.MBFILE);
	let maxZoom = 1;
	let tilesDownloaded = 0;
	let tilesSkipped = 0;
	let tilesError = 0;
	if (process.env.MAXZOOM) {
		maxZoom = parseInt(process.env.MAXZOOM);
	}

	let topTileUrl = getUrl(0,0,0);
	console.log('Top level URLL ' + topTileUrl);

	if (!fs.existsSync(tilesFolder)){
		fs.mkdirSync(tilesFolder);
	}

	function getUrl(z,x,y) {
		return process.env.TILEURL.replace('{z}',z).replace('{x}',x).replace('{y}',y).replace('{format}',process.env.FORMAT);
	}

	function downloadTile(coordinates, callback) {
		const z = coordinates[0];
		const x = coordinates[1];
		const y = coordinates[2];

		const tilePath = "tiles/tile-" + z + "-" + x + "-" + y + ".png";
		const fullPath = path.join(__dirname + "/tiles/" + z + "/" + x + "/" + y + ".png");
		if (!fs.existsSync(fullPath)) {
			console.log('Downloading', z, x, y);
			let tileurl = getUrl(z,x,y);
			const request = https.get(tileurl, function (response) {
				if (response.statusCode === 200) {
					const file = fs.createWriteStream(tilePath);
					response.pipe(file);
					callback();
					tilesDownloaded++;
				} else {
					tilesError++;
					console.error('Bad server response: ' + response.statusMessage)
				}
			});
		} else {
			console.log('Skipping',z,x,y);
			tilesSkipped++;
			callback();
		}
	}

	function initTileNumber() {
		console.log('Initializing tile number array 0 - ' + maxZoom);
		for (let z = 0; z <= maxZoom; z++) {
			for (let x = 0; x < Math.pow(2, z); x++) {
				for (let y = 0; y < Math.pow(2, z); y++) {
					tileNumbers.push([z, x, y]);
				}
			}
		}
	}

	function downloadAllTiles() {
		console.log('Downloading tiles...')
		//Run 10 tile downloads at a time
		async.eachLimit(tileNumbers, 10, downloadTile, function (err) {
			if (err) {
				console.error(err);
			}
			else {
				console.log('All tiles downloaded')
				console.log(' Tiles downloaded: ' + tilesDownloaded)
				console.log(' Tiles skipped (already downloaded): ' + tilesSkipped)
				console.log(' Tiles failed to downloaded: ' + tilesError)

				restructureFiles();
				recreateMBTilesFile();
			}
		})
	}

	function createDirectory(filename) {
		try {
			if (filename.startsWith('tile-')) {
				// tile-9-99-91.png
				coordinates = filename.split('.');
				coordinates = coordinates[0];
				// tile-9-99-91
				coordinates = coordinates.split('-');
				coordinates.shift();
				// [9,99,91]

				console.log('Moving ' + filename);
				const newPath = 'tiles/' + coordinates[0] + '/' + coordinates[1] + '/';
				const newFilename = coordinates[2] + '.png';
				fs.mkdirSync(newPath, {recursive: true})
				fs.renameSync(path.join(tilesFolder, filename), newPath + newFilename)
			}
		} catch (e) {
			console.error(e);
		}
	}

	function restructureFiles() {
		try {
			console.log('Creating folder structure')
			let unsortedFilenames = [];
			unsortedFilenames = fs.readdirSync(tilesFolderName);
			for (let file of unsortedFilenames) {
				createDirectory(file);
			}
		} catch (e) {
			console.error(e);
		}
	}

	function recreateMBTilesFile() {
		const exec = require('child_process').exec;
		if (fs.existsSync(MBTilesFile)){
			fs.rmSync(MBTilesFile);
		}

		const commandLineExec = "./mbutil/mb-util --scheme=xyz --image_format=png  ./tiles/ " + MBTilesFile
		console.log('Executing: ' + commandLineExec);
		exec(commandLineExec).on('exit', () => console.log('Done creating ' + MBTilesFile));
	}

	initTileNumber();
	downloadAllTiles();
}
catch (e) {
	console.error('Download fatal error!');
	console.error(e);
}
