'use strict';

/*
 * REQUEST NINJA
 */

const http = require('http');
const https = require('https');
const url = require('url');

module.exports = class RequestNinja {

  /*
   * Create a new request by passing in a URL or a Node http.request() options object.
   */
  constructor (input) {

    // Defaults.
    this.encoding = 'utf8';
    this.mode = null;
    this.options = {};

    // Prepare the request options.
    switch (typeof input) {

      case 'object':
        this.options = input;
        this.mode = 'url';
        break;

      case 'string':
        this.options = this.convertUrlToOptions(input);
        this.mode = 'options';
        break;

      default:
        throw new Error('Invalid input.');

    }

    // Figure out which module we need to use.
    this.module = (this.options.protocol === 'https' ? https : http);

  }

  /*
   * Converts the URL to the options that http.request() expects.
   */
  convertUrlToOptions (input) {

    const parts = url.parse(input);
    const options = {};

    options.protocol = parts.protocol || 'http';
    options.hostname = parts.hostname || parts.host || null;
    options.port = parts.port || null;
    options.path = (parts.pathname + parts.search + parts.hash) || null;
    options.auth = parts.auth || null;

    return options;

  }

  /*
   * Modify the default encoding of the request.
   */
  setEncoding (encoding) {
    this.encoding = encoding;
  }

  /*
   * Modify the default encoding of the request.
   */
  setTimeout (ms) {
    this.timeout = ms;
  }

  /*
   * Fire the request with optional post data. If a callback is not specified this will return a promise.
   * callback(err, data);
   */
  go (postData, callback = null) {

    const future = new Promise((resolve, reject) => {

      // If post data has been specified when we're in quick mode lets set the method appropriately.
      if (this.mode === 'url' && postData) { this.options.method = 'POST'; }

      // Override the timeout in the options, if one was explicitly set.
      if (typeof this.timeout === 'number') { this.options.timeout = this.timeout; }

      // Make the request.
      let body = '';
      const req = http.request(this.options, (res) => {
        res.setEncoding(this.encoding);
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => resolve(body));
      });

      req.on('error', (err) => reject(err));

      // Write data to request body if given.
      if (postData) { req.write(this.preparePostData(postData)); }

      req.end();

    });

    // Return the promise if we aren't using a callback.
    if (typeof callback !== 'function') { return future; }

    // Otherwise fire the callback when the promise returns.
    future.then((data) => callback(null, data)).catch((err) => callback(err));

  }

  /*
   * Returns true if the given post data can be written directly to the request stream.
   */
  preparePostData (postData) {

    if (typeof postData === 'string' || postData instanceof Buffer) {
      return postData;
    } else if (typeof postData === 'object') {
      return JSON.encode(postData);
    }

    return '';

  }

};
