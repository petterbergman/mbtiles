# MBTiles
Downloads mbtiles from a source such as MapBox (or similar) and serves them on localhost

# Install
Use npm install to install dependencies as well as mbutil (postinstall)

# Configuration
Configure settings in .env

# Download tiles
npm download.js
Files will be downloaded in tiles folder according to configuration in .env. Files already downloaded, will be skipped. To redownload, delete tiles folder.

# Server mbtiles file
npm server.js
Will server mbtiles file on localhost. File name and port specified in .env
