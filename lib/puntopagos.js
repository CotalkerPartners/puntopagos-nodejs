/* jshint -W097 */
"use strict";

/*
 * PUNTO PAGOS NODE 
 * V 1.3.1
 * 
 * HOW TO USE
 * var puntoPagos = request('puntopagos-node');
 *
 * // Create payment
 * puntoPagos.pay(puntoPagos.generateId(), amont, puntoPagos.paymentMethod.webpay, callback(err, data));
 * // data = {token:token, redirect:redirect}
 *
 * // Validate payament
 * puntoPagos.validate(token, generated_id, amount, callback(err, data)); 
 *
 */

/// External libs
var request   = require('request');
var crypto    = require('crypto');

var DEBUG = (process.env.PUNTOPAGOS == 'debug') ;
console.log("PUNTOPAGOS in", DEBUG ? "DEBUG" : "PRODUCTION", "mode");

/// Punto Pagos payment steps
var step1     = "transaccion/crear";
var step2     = "transaccion/procesar";
var step3     = "transaccion";
var step3a    = "transaccion/traer";

/// URL and KEYS
var PUNTOPAGOS_URL;
var PUNTOPAGOS_KEY;
var PUNTOPAGOS_SECRET;

if (!DEBUG) {
  PUNTOPAGOS_URL     = "https://www.puntopagos.com/";
  // use .config to set
  PUNTOPAGOS_KEY     = "replace_with_production_key";
  PUNTOPAGOS_SECRET  = "replace_with_production_secret";
} else if (DEBUG) {
  PUNTOPAGOS_URL     = "https://sandbox.puntopagos.com/";
  // use .config to set
  PUNTOPAGOS_KEY     = "replace_with_debug_key";
  PUNTOPAGOS_SECRET  = "replace_with_debug_secret";
}

var lineEnding = '\n';

exports.paymentMethod = {
  'presto'       : { code: 2  , displayName: 'Tarjeta Presto'} ,
  'webpay'       : { code: 3  , displayName: 'WebPay'        } ,
  'bancochile'   : { code: 4  , displayName: 'Banco Chile'   } ,
  'bci'          : { code: 5  , displayName: 'BCI'           } ,
  'tbanc'        : { code: 6  , displayName: 'TBanc'         } ,
  'banco estado' : { code: 7  , displayName: 'Banco Estado'  } ,
  'bbva'         : { code: 16 , displayName: 'BBVA'          } ,
  'ripley'       : { code: 10 , displayName: 'Ripley'        } ,
  'paypal'       : { code: 15 , displayName: 'PayPal'        } 
};

exports.config = function(PUNTOPAGOS_KEY_CONFIG, PUNTOPAGOS_SECRET_CONFIG) {
  PUNTOPAGOS_KEY    = PUNTOPAGOS_KEY_CONFIG;
  PUNTOPAGOS_SECRET = PUNTOPAGOS_SECRET_CONFIG;
};

exports.pay = function (trx_id, amount, paymentMethod, redirect) {
  if (trx_id   === undefined ||
    amount     === undefined ) {
    //paypack['detalle']    == undefined ||
    //paypack['medio_pago'] == undefined ||
    throw ("Data missing");
  }
  amount = amount+".00";
  if (DEBUG) {
    console.log("TX ID, AMOUNT", trx_id, " ", amount);
  }
  
  var date = ((new Date()).toGMTString());
  var body = {
    trx_id       : trx_id,
    monto        : amount,
    medio_pago   : paymentMethod.code, 
    //detalle    : paypack['detalle'],
  };
  var uri  = PUNTOPAGOS_URL + step1;
  if (DEBUG) {
    console.log("PP Paying $" + amount + " with: " + paymentMethod.displayName);
    console.log("PP URI: " + uri);
  }
  var message = step1   + '\n' +
                trx_id  + '\n' +
                amount  + '\n' +
                date;
  var sha1 = crypto
              .createHmac("sha1", PUNTOPAGOS_SECRET)
              .update(message)
              .digest("base64");
  
  var headers = {
       'User-Agent'     : "puntopagos-node-1.3.0.js",
       'Accept'         : 'application/json',
       'Accept-Charset' : 'utf-8',
       'Content-Type'   : 'application/json; charset=utf-8',
       ///@note Configure server date for Chile.
       ///      sudo dpkg-reconfigure tzdata
       ///      sudo ntpdate ntp.shoa.cl
       'Fecha'          : date,
       ///@note Signature: "PP" <KEY>:hmac/sha1(<MESSAGE>)
       'Autorizacion'   :  "PP " + PUNTOPAGOS_KEY + ":" + sha1
  };
  
  if (DEBUG) {
    console.log("URI", uri);
    console.log("HEADERS", headers);
    console.log("BODY", body);
  }
  
  request.post({
      uri     : uri,
      headers : headers,
      body    : JSON.stringify(body)
  }, function (err, res, data) {
    if (err) console.log("ERROR:", err);
    //respuesta: 00 = OK   (Otras según tabla errores)
    //token: Identificador único de la transacción en Punto Pagos
    //trx_id: Identificador único de la transacción del cliente
    //monto: Monto total de la transacción
    //error: mensaje de error en caso que la respuesta sea distinta de 00 (opcional)
    var error = null;
    var redir = null;
    var token = null;
  
    console.log("Pagando...");
    if (data) {
      data = JSON.parse(data);
      if (DEBUG) {
        console.log("DATA:", data);
      }
    }
    if (!data || data.respuesta === undefined || data.token === undefined) {
      error = "Cannot complete transaction 0x4256";
    } else if (data.respuesta === "00") {
      redir =  PUNTOPAGOS_URL + step2 + "/" + data.token;
      token = data.token;
      if (DEBUG) {
        console.log("DATA:", data);
      }
    } else {
      error = "Cannot complete transaction 0x1735";
      if (DEBUG) {
        console.log("DATA:", data);
      }
    }
    redirect(error, {token: token, redirect: redir});
  });
};

exports.generateId = function() {
  return (idv6() + genDate()).replace(/[^0-9]/g,'');
};
  
exports.validate = function(token, nid, price, callback) {
  var date = (new Date()).toGMTString();
  var message = step3a          + lineEnding +
                token           + lineEnding +
                nid             + lineEnding +
                price + '.00'   + lineEnding +
                date;

  var sha1 = crypto
              .createHmac("sha1", PUNTOPAGOS_SECRET)
              .update(message)
              .digest("base64");

  if (DEBUG) {
    console.log("MESSAGE:", message);
    console.log("SHA1", sha1);
  }

  request.get({
    uri: PUNTOPAGOS_URL + step3 + "/" + token,
    headers : {
           'User-Agent'     : "puntopagos-node-1.3.0.js",
           'Accept'         : 'application/json',
           'Accept-Charset' : 'utf-8',
           'Content-Type'   : 'application/json; charset=utf-8',
           'Fecha'          : date,
           'Autorizacion'   : "PP " + PUNTOPAGOS_KEY + ":" + sha1
    }
  }, function(erri, resi, data) {

    var cb_data;

    if (data === undefined) {
      return callback("Sin data token", cb_data);
    }

    if (DEBUG) {
      console.log("DATA", data);
    }
    data = JSON.parse(data);
     
    cb_data     = null;
    var cb_err  = null;

    if (data.respuesta === undefined) {
      return callback("Sin código de respuesta", cb_data);
    }

    switch (data.respuesta) {
      case '00':
      case '01':
        cb_data = "Compra OK";
        break;
      default:
        cb_err = "Codigo pago errorneo";
        break;
    }
    
    return callback(cb_err, cb_data);
  });
};

/* Workaround to puntopagos id creation */
var idv6 =  function() {
  var f = 0;
  while(f < 1 || f > 8) {
    f = parseInt(Math.random()*10);
  }
  f += "";
  return f + parseInt(Math.random()*10) +
             parseInt(Math.random()*10) +
             parseInt(Math.random()*10) +
             parseInt(Math.random()*10);
};

var padStr = function(i) {
      return (i < 10) ? "0" + i : "" + i;
};

var genDate = function() {
  var temp = new Date();
  return  padStr(temp.getFullYear())  +
          padStr(1 + temp.getMonth()) +
          padStr(temp.getDate())      +
          padStr(temp.getHours())     +
          padStr(temp.getMinutes())   +
            padStr(temp.getSeconds());
};
