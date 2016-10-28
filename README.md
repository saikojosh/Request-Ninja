# Request-Ninja
A simple helper module to help with calling an endpoint and returning some data.

## Basic Usage
```javascript
const RequestNinja = require('request-ninja');
const req = new RequestNinja('https://www.example.com/api/my-endpoint');

req.go().then((data) => { ... }).catch((err) => { ... });
```
