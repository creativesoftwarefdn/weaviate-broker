'use strict'
/*                          _       _
 *__      _____  __ ___   ___  __ _| |_ ___
 *\ \ /\ / / _ \/ _` \ \ / / |/ _` | __/ _ \
 * \ V  V /  __/ (_| |\ V /| | (_| | ||  __/
 *  \_/\_/ \___|\__,_| \_/ |_|\__,_|\__\___|
 *
 * Copyright © 2016 - 2018 Weaviate. All rights reserved.
 * LICENSE: https://github.com/creativesoftwarefdn/weaviate/blob/develop/LICENSE.md
 * AUTHOR: Bob van Luijt (bob@kub.design)
 * See www.creativesoftwarefdn.org for details
 * Contact: @CreativeSofwFdn / bob@kub.design
 */

/*
 * Set constants
 */
const COMMANDLINEARGS   = require('command-line-args'),
      COMMANDLINEUSAGE  = require('command-line-usage'),
      AEDES             = require('aedes')(),
      SERVER            = require('net').createServer(AEDES.handle),
      HTTPSERVER        = require('http').createServer(),
      WS                = require('websocket-stream')

/*
 * Log function
 * Outputs the logs
 * 1 = normal log
 * 2 = error log without exit(1)
 * 3 = debug, only shows when debugging is enabled
 */
function Log(type, message){

  // define time
  let time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '').replace("-", '/')

  // switch through message types
  switch(type) {
    case 2:
        console.error(time + ' ERROR: ' + message)
        break;
    case 3:
        if(OPTIONS.debug == true) console.debug(time + ' DEBUG: ' + message)
        break;
    default:
        console.log(time + ' INFO: ' + message)
  }
}

/*
 * Define command line arguments 
 */
var OPTIONS = COMMANDLINEARGS([
  {
    name: 'help',
    type: Boolean,
    description: 'Display this usage guide.'
  }, {
    name: 'weaviateHost',
    type: String,
    alias: 'h',
    description: 'The host of the weaviate instance (without http(s)://) | default: localhost',
  }, {
    name: 'weaviatePort',
    type: Number,
    description: 'The port to connect to Weaviate | default: 80',
  }, {
    name: 'protocol',
    type: String,
    alias: 'p',
    description: 'The protocol to connect to Weaviate (http or https) | default: https',
  }, {
    name: 'weaviateUrl',
    type: String,
    alias: 'u',
    description: 'The url | default: /weaviate/v1/',
  }, {
    name: 'debug',
    type: String,
    alias: 'd',
    description: 'Show debug messages in log | default: false',
  }, {
    name: 'mqtt',
    type: Boolean,
    alias: 'm',
    description: 'Enable MQTT?'
  }, {
    name: 'mqttPort',
    type: Number,
    description: 'MQTT port | default: 1883'
  }, {
    name: 'websockets',
    type: Boolean,
    alias: 'w',
    description: 'Enable websockets?'
  }, {
    name: 'websocketPort',
    type: Number,
    description: 'Websocket port | default: 8888'
  }
])

/*
 * Show help menu else set defaults
 */
if (OPTIONS.help || OPTIONS.mqtt === undefined && OPTIONS.websockets === undefined) {
  const usage = COMMANDLINEUSAGE([
    {
      header: 'Weaviate MQTT & Websockets broker',
      content: 'A broker for Weaviate.'
    },
    {
      header: 'Usage',
      content: 'Define at least if mqtt or websockets should be enabled. For example: `$ weaviate-broker --mqtt --websockets`'
    },
    {
      header: 'Options',
      optionList: optionDefinitions
    },
    {
      content: 'Project home: www.creativesoftwarefdn.org'
    }
  ])
  console.log(usage)
  process.exit()
} else {
  // validate and set defaults
  if(OPTIONS.weaviateHost === undefined) OPTIONS.weaviateHost = "localhost"
  if(OPTIONS.weaviatePort === undefined) OPTIONS.weaviatePort = 80
  if(OPTIONS.weaviateUrl === undefined) OPTIONS.weaviateUrl = "/weaviate/v1"
  if(OPTIONS.debug === undefined) OPTIONS.debug = false
  if(OPTIONS.protocol === undefined) OPTIONS.protocol = "https"
  if(OPTIONS.mqttPort === undefined) OPTIONS.mqttPort = 1883
  if(OPTIONS.websocketPort === undefined) OPTIONS.websocketPort = 8888
  // show settings in log
  Log(3, "weaviate host set to: " + OPTIONS.weaviateHost)
  Log(3, "weaviate port set to: " + OPTIONS.weaviatePort)
  Log(3, "weaviate url set to: " + OPTIONS.weaviateUrl)
  Log(3, "debugging set to: " + OPTIONS.debug)
  Log(3, "protocol set to: " + OPTIONS.protocol)
  Log(3, "mqtt set to: " + OPTIONS.mqtt)
  Log(3, "mqtt port set to: " + OPTIONS.mqttPort)
  Log(3, "websockets set to: " + OPTIONS.websockets)
  Log(3, "websocket port set to: " + OPTIONS.websocketPort)
}

/*
 * Set the http or https protocol
 */
if(OPTIONS.protocol != "http" && OPTIONS.protocol != "https"){
  Log(2, "Select a valid protocol.")
  exit(1)
}
const HTTP = require(OPTIONS.protocol)

/*
 * Start MQTT server
 */
if(OPTIONS.mqtt == true){
  SERVER.listen(OPTIONS.mqttPort, function () {
    Log(1, 'MQTT server listening on port ' + OPTIONS.mqttPort)
  })
}

/*
 * Start websocket server
 */
if(OPTIONS.websockets == true){
  WS.createServer({
    server: HTTPSERVER
  }, AEDES.handle)

  HTTPSERVER.listen(OPTIONS.websocketPort, function () {
    Log(1, 'websocket server listening on port: ' + OPTIONS.websocketPort)
  })
}

/*
 * Authenticate user
 */
AEDES.authenticate = function(client, username, password, callback) {

  // store connected client data
  if(client.CONNECTEDCLIENTS === undefined) client.CONNECTEDCLIENTS = {
    'username': "",
    'password': "",
    'accessTo': ""
  }

  // check if username and password are set
  if(username === undefined || password === undefined){
    // can't validate user, do not accept
    Log(2, "No username or password set")
    var error = new Error('Auth error, no username or password set')
    error.returnCode = 4
    return callback(error, null)
  }

  // connect to Weaviate to validate user
  HTTP.get({
    host: OPTIONS.weaviateHost,
    port: OPTIONS.weaviatePort,
    path: OPTIONS.weaviateUrl + '/keys/me',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-TOKEN': username,
      'X-API-KEY': password
    }
  }, function(res) {
   if(res.statusCode === 200){
      // success, accept
      Log(1, "User (" + username + ") connected with id: " + client.id)
      callback(null, username === username)
      client.CONNECTEDCLIENTS = {
        'username': username,
        'password': password,
      }
    } else {
      // can't validate user, do not accept
      Log(2, "User (" + username + ") fails to connect")
      var error = new Error('Auth error')
      error.returnCode = 4
      callback(error, null)
    }
  }).on('error', function(e) {
    Log(2, "Got error: " + e.message);
    callback(new Error('can not connect to topic topic'))
  }).end();

}

/*
 * Authenticate subscribe (is a user allowed to subscribe)
 */
AEDES.authorizeSubscribe = function (client, sub, callback) {
  
  // connect to Weaviate to validate user
  HTTP.get({
    host: OPTIONS.weaviateHost,
    port: OPTIONS.weaviatePort,
    path: OPTIONS.weaviateUrl + sub.topic,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-TOKEN': client.CONNECTEDCLIENTS.username,
      'X-API-KEY': client.CONNECTEDCLIENTS.password
    }
  }, function(res) {

    // set connectedclients
    if(client.CONNECTEDCLIENTS.accessTo === undefined) client.CONNECTEDCLIENTS.accessTo = {}

    if(res.statusCode === 200){
      // correct, subscribe
      Log(1, "Subscribe (" + client.CONNECTEDCLIENTS.username + ") to: " + sub.topic)
      client.CONNECTEDCLIENTS.accessTo[sub.topic] = true;
      callback(null, sub)
    } else {
      // incorrect, fail
      Log(2, "Can not subscribe (" + client.CONNECTEDCLIENTS.username + ") to: " + sub.topic)
      client.CONNECTEDCLIENTS.accessTo[sub.topic] = false;
      callback(new Error('Can not subscribe'))
    }
  }).on('error', function(e) {
    Log(2, "Got error: " + e.message);
    callback(new Error('can not connect to topic topic'))
  }).end();

}

/*
 * Authorize publish (is a user allowed to publish)
 */
AEDES.authorizePublish = function (client, packet, callback) {

  // check if set
  if(client.CONNECTEDCLIENTS.accessTo === undefined) client.CONNECTEDCLIENTS.accessTo = {}

  // validate if user is allowed to publish to this topic
  if(client.CONNECTEDCLIENTS.accessTo[packet.topic] == true){
    callback(null)
  } else {

    // connect to Weaviate to validate access to topic
    HTTP.get({
      host: OPTIONS.weaviateHost,
      port: OPTIONS.weaviatePort,
      path: OPTIONS.weaviateUrl + packet.topic,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-TOKEN': client.CONNECTEDCLIENTS.username,
        'X-API-KEY': client.CONNECTEDCLIENTS.password
      }
    }, function(res) {
      if(res.statusCode === 200){
        // correct, publish
        //if(client.CONNECTEDCLIENTS.accessTo === undefined) client.CONNECTEDCLIENTS.accessTo = {}
        client.CONNECTEDCLIENTS.accessTo[packet.topic] = true;
        callback(null)
      } else {
        // incorrect, fail
        Log(2, "not allowed to publish to: " + sub.topic)
        client.CONNECTEDCLIENTS.accessTo[packet.topic] = false;
        callback(new Error('not allowed to publish'))
      }
    }).on('error', function(e) {
      Log(2, "Got error: " + e.message);
      callback(new Error('can not connect to topic topic'))
    }).end();
  }
}

/*
 * Display client errors
 */
AEDES.on('clientError', function (client, err) {
  Log(2, 'client error ' + err.message)
})

/*
 * Display connection errors
 */
AEDES.on('connectionError', function (client, err) {
  Log(2, 'client error ', client, err.message, err.stack)
})

/*
 * Debug message when client connects
 */
AEDES.on('client', function (client) {
  Log(3, 'new client connected with id: ' + client.id)
})

/*
 * Debug message when client publishes
 */
AEDES.on('publish', function (packet, client) {
  if (client) {
    Log(3, 'message from client ' + client.id)
  }
})

/*
 * Debug message when client subscribes
 */
AEDES.on('subscribe', function (subscriptions, client) {
  if (client) {
    Log(3, 'subscribe from client ' + client.id)
  }
})