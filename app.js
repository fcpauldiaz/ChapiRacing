/**
 * Newton Labs
 * App Entry file
 * 5/02/2017
 */
import socket from 'socket.io';
import express from 'express';
import UUID from 'uuid';
import http from 'http';

const port = process.env.PORT || 4004;
const app = express();
const server = http.createServer(app);
const debug = false;

server.listen(port);

//Log something so we know that it succeeded.
console.log('Express -> listening on ' + port );

//main index.html file
app.get( '/', ( req, res ) => {
  if (debug) {
    console.log('loading %s', __dirname + '/index.html');
  }
  res.sendFile( '/client/public/index.html' , { root:__dirname });
});


//send assets, files, images, css, javascript
app.get( '/*' , ( req, res, next ) => {
    //This is the current file they have requested
    var file = req.params[0];
    //show requested files.
    if (debug) {
      console.log('Express :: file sent : ' + file);
    }
    //send files
    res.sendFile( __dirname + '/' + file );
});

const io = socket.listen(server);
const maxCons = 4;


const game_server = require('./server/server.js');
 //let playerNumber = undefined;
  //Socket.io will make connections

io.sockets.on('connection', (client) => {
        
  //Generate a new UUID
  //and store this on their socket/connection
  client.userid = UUID();
  console.log('\t socket.io:: player ' + client.userid + ' connected');
  //tell player he is connected with id
 
  client.on('createGame', () => {
    const { game_id, player_number } = game_server.createGame(client.userid);
    client.game_id = game_id;
    client.emit('onconnected', {  
      player: player_number, 
      player_id: client.userid,
      game_id
    });
  })

  client.on('joinGame', (data) => {
    const { game_id, player_number } = game_server.findGame(client.userid, data.id_server);
    client.game_id = game_id;
    client.emit('onconnected', {  
      player: player_number, 
      player_id: client.userid,
      game_id
    });
  })


  //when player moves on team select
  client.on('teamselect', (data) => {
    game_server.updatePlayerPosition(data.player, client.userid);
    client.emit('updatePosition', {
     players: game_server.getPlayersPosition(client.game_id, client.userid)
    });
  });

  client.on('playerUpdate', (data) => {
    game_server.updatePlayerPosition(data.player, client.userid);
    client.emit('receiveUpdate', {
     players: game_server.getPlayersFullPosition(client.game_id, client.userid)
    });
  });

  client.on('getPlayerType', () => {
    client.emit('sendPlayerType', {
      type: game_server.getPlayerType(client.game_id, client.userid)
    })
  })

  client.on('requestState', () => {
    client.emit('getNewState', {
      players: game_server.sendNewState(client.game_id)
    })
  });

  client.on('prepareState', () => {
    game_server.prepareNewState(client.game_id);
  });
  
  client.on('addObject', (data) => {
    game_server.addNewObject(client.game_id, data.bulletOrCoin);
    client.emit('broadCastObject', {
      objects: game_server.broadCastObjects(client.game_id)
    })
  });

  client.on('requestObjects', () => {
    client.emit('updateBrodcast', {
      objects: game_server.broadCastObjects(client.game_id)
    })
  })
  
  client.on('removeObject', (data) => {
    client.emit('removeBroadcast', {
      object_id: game_server.removeObject(client.game_id, data.objectId)
    });
  })

  // Add a disconnect listener
  client.on('disconnect', () => {
    console.log('client disconnected ' + client.userid);
    game_server.endGame(client.userid);
  });

}); //client.on 

