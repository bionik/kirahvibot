//Create configuration object
var config = {
  debug: true,
  channels: ['#kirahvi.dy.fi'],
  server: 'irc.quakenet.org',
  botName: 'kirahvi',
  openweathermap_api_key: 'fde182bcfdbc18c908de165c3bb04997'
};

//Load libraries

var http = require('http');
var irc = require('irc');
var io = require('socket.io');

function log(obj){
  if(config.debug && console.log !== undefined) {
    var now = new Date();
    var timestamp = '[' + now.toISOString() + ']: ';
    if(typeof obj == 'string' || typeof obj == 'number'){
      console.log(timestamp + obj);
    } else {
      console.log(timestamp);
      console.log(obj);
    }
  }
}

Bot = function(){
  'use strict';
  var h = this;

  h.io = new io();
  h.io.listen(31337);


  h.io.on('connection', function(socket){
    log('Socket connected');

    socket.on('players', function(data) {
      if(data === 0){
        h.bot.say('#kirahvi.dy.fi', 'Minecraft: No players.');
      } else {
        h.bot.say('#kirahvi.dy.fi', 'Minecraft: '+data+' players online!');
      }
    });

  });

  //Check for command and return parameters
  h.checkCommand = function(command, text){
    var text_trimmed = text.replace(/\s+/g,' ').trim();
    var parameters = text_trimmed.split(' ');
    //Check for command
    if(parameters[0] === command){
      if(parameters.length > 1){
        log(parameters);
        parameters.shift();
        //Return parameters, first removed.
        return parameters;
      }
      return [];
    }
    return false;
  };

  //Function to perform a http GET request
  h.get = function(url, success, error) {
    log(url);
    http.get(url, function(res) {
      var body = "";
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function () {
        success(JSON.parse(body));
      });
    }).on('error', function(e) {
      error(e);
    });
  };

  h.init = function(){

    //Initialize bot object
    h.bot = new irc.Client(config.server, config.botName, {
      channels: config.channels,
      encoding: 'UTF-8',
      userName: 'kirahvi',
      realName: 'IRC bot'
    });

    //Catch errors
    h.bot.addListener('error', function(message) {
      log('ERROR:');
      log(message);
    });

    //Add a listener for incoming message
    h.bot.addListener('message', function(from, to, text, messageObj) {
      //from: user, to: channel or nick, text: text, message: object
      log("Got message");

      //Check commands
      var params = [];
      var error;
      var query;
      var finished;

      //Respond to own name
      if ((params = h.checkCommand(config.botName, text)) !== false){
        log(config.botName);
        h.bot.say(from, 'Hi! Write help for available commands.');

      //Respond to "help", if sent directly to me (msg)
      } else if(to == config.botName && (params = h.checkCommand('help', text)) !== false) {
        log('help');
        h.bot.say(from, 'For now, you can use the following commands:');
        h.bot.say(from, '!w [city] - Displays current weather info');

      } else if ((params = h.checkCommand('!w', text)) !== false){
        log('!w');

        //Default query
        query = 'helsinki';

        if(typeof params[0] != 'undefined'){
          query = params[0];
        }

        h.get('http://api.openweathermap.org/data/2.5/weather?q='+query+'&units=metric'+'&APPID='+config.openweathermap_api_key, function(response){
          var output = '';

          if (typeof response.cod !== "undefined" && response.cod == 200){
            var town = response.name;
            var temp = response.main.temp;
            output = 'Temperature in '+town+' is '+temp+'°C';

          } else if (typeof response.cod != "undefined"){
            output = 'Can\'t find such a place.';

          } else {
            log('ERROR: Could not fetch data!');
            output = 'ERROR: Could not fetch data! Sorry :(';

          }

          //Send to channel or nick?
          if (to == config.botName) {
            h.bot.say(from, output);

          } else {
            h.bot.say(to, output);


          }

        }, function(){
            log('ERROR: Could not fetch data!');
            h.bot.say(from, 'ERROR: Could not fetch data! Sorry :(');

        });

      }

    });

  };

  //Initialize
  h.init();

};

log('Instancing bot');
var bot = new Bot();