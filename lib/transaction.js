/*
 * Copyright (c) 2013 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

var serialize = require('./serializer');
var Request = require('./request');
var Response = require('./response');
var streams = require('./streams');
var Base = require('./base');
var await = require('await');
var http = require('http');
var url = require('url');

// ---------------------------

/*
function ghostFetch(cb, socketPath, ctx){
  return http.get({
    socketPath: socketPath,
    path: ctx._response.getGhostUrl()
  }, function(inResp){
    return cb.call(ctx, arguments);
  });
}

function serverFetch(cb, ctx){
  return http._request({
    hostname: ctx._request.hostname,
    port: ctx._request.port || ctx._request.getDefaultPort(),
    method: ctx._request.method,
    path: ctx._request.url,
    headers: ctx._request.headers
  }, function(inResp){
    return cb.apply(ctx, arguments);
  });
}
*/

module.exports = Base.extend(function(){
  this._request = new Request();
  this._response = new Response();
  this._request.on('log', function(log){
    this.emit('log', log);
  }.bind(this));
  this._response.on('log', function(log){
    this.emit('log', log);
  }.bind(this));
},{

  sendToServer: function(){
    var req = this._request,
      resp = this._response;
    return await('inResp')
    .run(function(prom){
      if (resp.isPopulated()){
        prom.fail(new Error('response is already populated'));
      } else {
        req.sanitize();
        var outReq = http.request({
          hostname: req.hostname,
          port: req.port || req.getDefaultPort(),
          method: req.method,
          path: req.url,
          headers: req.headers
        }, function(inResp){
          prom.keep('inResp',inResp);
        });
        req.source.on('error', function(){
          prom.fail(err);
        });
        req.source.pipe(outReq);
      }
    }, this);
  },

  sendToClient: function(outResp){
    var resp = this._response;
    return await('sent')
    .run(function(prom){
      resp.sanitize();
      outResp.writeHead(resp.statusCode, resp.headers);
      resp.source.on('error', function(){
        prom.fail(err);
      });
      resp.source.on('end', function(){
        prom.keep('sent');
      });
      resp.source.pipe(outResp);
    });
  },

  start: function(){
    // for now, an immediately-kept promise
    return await('started').keep('started');
  }
});

