### INSTALLATION

node.js
```sh
npm install puntopagos-node
```

### HOW TO USE
```javascript
var puntoPagos = require('puntopagos-node');

// Config current deployment mode.
puntoPagos.config('PUNTOPAGOS_KEY_CONFIG', 'PUNTOPAGOS_SECRET_CONFIG') 

// Create payment
puntoPagos.pay(puntoPagos.generateId(), amont, puntoPagos.paymentMethod.webpay, callback);
// err, data -> {token:token, redirect:redirect}

// Validate payament
puntoPagos.validate(token, generated_id, amount, callback);
// err, data
```

### DEVELOPMENT
For sandbox mode ser enviorment var PUNTOPAGOS to 'debug'  
```sh
PUNTOPAGOS=debug node app.js 
```

### PuntoPagos Documentation
[Oficial documentation](https://github.com/PuntoPagos/documentacion)
