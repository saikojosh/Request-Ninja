# Request-Ninja
A simple helper module to help with calling an endpoint and returning some data.

## Basic Usage
Make a quick GET request like this:

```javascript
const RequestNinja = require(`request-ninja`);
const req = new RequestNinja(`https://www.example.com/api/my-endpoint`);

req.go()
	.then(data => { ... })
	.catch(err => { ... });
```

Make a standard POST request like this:

```javascript
const RequestNinja = require(`request-ninja`);
const req = new RequestNinja(`https://www.example.com/api/my-endpoint`);

req.go({ some: `post data` }) // Will be encoded as a query string and the Content-Type header set to "application/x-www-form-urlencoded".
	.then(data => { ... })
	.catch(err => { ... });
```

Make a POST request with JSON like this:

```javascript
const RequestNinja = require(`request-ninja`);
const req = new RequestNinja(`https://www.example.com/api/my-endpoint`);

req.postJson({ some: `post data` })  // Will be encoded as JSON and the Content-Type header set to "application/json".
	.then(data => { ... })
	.catch(err => { ... });
```

## Breaking Changes in v0.2
A few minor breaking changes have been made in version 0.2.

* The setting `parseJSONResponse` is now cased as `parseJsonResponse`.
* If you supply post data as an Object or an Array and the Content-Type header includes "application/json", it will automatically be stringified, unless the setting `encodeJsonRequest` is falsy.
* The order of parameters has been changed for the `.go()` method from `.go(postData, callback, overrideSettings)` to `.go(postData, overrideSettings, callback)`.

## API Overview

### new RequestNinja(input, settings)
Returns a new instance of a request when supplied with the endpoint to call, and optionally a hash of settings to configure Request-Ninja's behaviour. The `input` parameter can be either a URL or the a hash of properties you could pass to Node's built in `http.request()` method.

| Setting              | Default Value | Description |
|----------------------|---------------|-------------|
| encoding             | "utf8"        | Override the encoding to use for requests and responses. |
| timeout              | `null`        | Set the number of milliseconds to wait before we time out an ongoing request. Set to a falsy value to disable. |
| encodeJsonRequest    | `true`        | By default, if you set the "Content-Type" header to "application/json" and the POST body is an Object/Array, it will be stringified automatically. Set to `false` to disable. |
| parseJsonResponse    | `true`        | By default, if the "Content-Type" header of the response is set to "application/json" and the response body contains JSON, it will be parsed automatically. Set to `false` to disable. |
| returnResponseObject | false         | Returns the node `response` object directly. If the response body is JSON it will be parsed and available as the `response.body` property. |
| forceMethod          | `null`        | Override the method we'll be using when making the request. |

### .setEncoding(encoding)
Change the encoding setting after a request object has been initialised. Affects the encoding for both the request and the response. Returns the request object so it can be chained.

### .setTimeout(milliseconds)
Change the timeout setting after a request object has been initialised. Returns the request object so it can be chained.

### .setHeaders(headerHash)
Add multiple headers to a request object like this:

```javascript
req.setHeaders({
	'Content-Type': `application/json`,
	'Authorization': `Basic .....`,
});
```

Returns the request object so it can be chained.

### .setHeader(headerString)
Add a single header to a request object like this:

```javascript
req.setHeader(`Content-Type: application/json`);
```

Returns the request object so it can be chained.

### .go(postData, overrideSettings, callback)
Executes the request with some optional post data, optional setting overrides (see the constructor for the available settings), and an optional callback. By default, this method will set the method to "POST" if there is post data provided, otherwise it will be set to "GET". If no callback is provided a promise will be returned.

**Post Data:**
If no headers are set, the post data will be encoded as a query string and the Content-Type header will be set to "application/x-www-form-urlencoded". If you set the Content-Type header to something that includes "application/json" (and the post data is an Object or Array) then the post data will be stringified automatically.

### .get(callback)
Utility method to execute the request with the GET method, and with an optional callback. If no callback is provided a promise will be returned. Internally this just calls the `.go()` method with the `forceMethod` setting overridden.

### .post(postData, callback)
Utility method to execute the request with the POST method, and with some optional post data and an optional callback. If no callback is provided a promise will be returned. Internally this just calls the `.go()` method with the `forceMethod` setting overridden.

### .postJson(postData, callback)
Utility method to execute the request with the POST method and convert the post data to JSON. This also sets the correct Content-Type header automatically. If no callback is provided a promise will be returned. Internally this just calls the `.go()` method with the `forceMethod` setting overridden.
