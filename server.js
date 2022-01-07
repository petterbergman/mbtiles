require('dotenv').config();
const express = require("express");
const app = express();
const MBTiles = require('@mapbox/mbtiles');
const fs = require('fs')

try {
  if (!process.env.MBFILE) {
    throw new Error('Missing MBFILE in .env file')
  }

  if (!fs.existsSync(process.env.MBFILE)) {
    throw new Error(process.env.MBFILE + ' not found')
  }

  let port = 3123;
  if (process.env.PORT) {
    port = parseInt(process.env.PORT);
  }

  try {
    console.log('Loading ' + process.env.MBFILE)
    new MBTiles(process.env.MBFILE + '?mode=ro', function (err, mbtiles) {
      console.log(mbtiles) // mbtiles object with methods listed below
      if (err) {
        console.error(err);
        throw err;
      } else {
        mbtiles.getInfo(function (err, info) {
          console.log(info); // info
        })
        app.get('/:z/:x/:y.*', function (req, res) {
          console.log(req.params);
          const extension = req.params[0];
          switch (extension) {
            case "jpg":
            case "png": {
              mbtiles.getTile(req.params.z, req.params.x, req.params.y, function (err, tile, headers) {
                if (err) {
                  res.status(404).send('Tile error: ' + err);
                } else {
                  res.header("Content-Type", "image/png")
                  res.send(tile);
                }
              });
              break;
            }
            case "grid.json": {
              mbtiles.getGrid(req.params.z, req.params.x, req.params.y, function (err, grid, headers) {
                if (err) {
                  res.status(404).send('Grid error: ' + err);
                } else {
                  res.header("Content-Type", "text/json")
                  res.send(grid);
                }
              });
              break;
            }
            default: {
              res.status(500).send('Unknown extension: ' + extension);
            }
          }
        });
        console.log('Loaded ' + process.env.MBFILE)
        // actually create the server
        app.listen(port);

        console.log('Serving ' + process.env.MBFILE + ' on port ' + port);
        console.log('Visit http://localhost:'+port+'/0/0/0.png');

      }
    });
  } catch (e) {
    console.error(e);
  }

// Log each request
  app.use(function (req, res, next) {
    console.log(req.method + ': ' + req.url);

    next();
  });

}
catch (e) {
  console.error('Server fatal error!');
  console.error(e);
}
