'use strict';

/*
 * REQUEST NINJA
 */

const http = require('http');
const https = require('https');
const querystring = require('querystring');
const url = require('url');
const ifNotUndefined = require('ifnotundefined');

module.exports = class RequestNinja {

	/*
	 * Create a new request by passing in a URL or a Node http.request() options object.
	 */
	constructor (input, settings = {}) {

		// Defaults.
		this.encoding = ifNotUndefined(settings.encoding, 'utf8');
		this.timeout = ifNotUndefined(settings.timeout, null);
		this.parseJSONResponse = ifNotUndefined(settings.parseJSONResponse, true);
		this.mode = null;
		this.options = {};

		// Prepare the request options.
		switch (typeof input) {

			case 'object':
				this.options = input;
				this.mode = 'options';
				break;

			case 'string':
				this.options = this.convertUrlToOptions(input);
				this.mode = 'url';
				break;

			default:
				throw new Error('Invalid input.');

		}

		// Figure out which module we need to use.
		this.module = (this.options.protocol === 'https:' ? https : http);

	}

	/*
	 * Converts the URL to the options that http.request() expects.
	 */
	convertUrlToOptions (input) {

		const parts = url.parse(input);
		const options = {};

		options.protocol = parts.protocol || 'http:';
		options.hostname = parts.hostname || parts.host || void (0);
		options.port = parts.port || void (0);
		options.path = (parts.pathname + (parts.search || '') + (parts.hash || '')) || void (0);
		options.auth = parts.auth || void (0);

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
	go (postData, callback = null, extraOptions = {}) {

		const future = new Promise((resolve, reject) => {

			// If post data has been specified when we're in quick mode lets set the method appropriately.
			if (this.mode === 'url' && postData && !extraOptions.forceMethod) { this.options.method = 'POST'; }

			// If we are forcing a particular method to be used lets set it appropriately.
			if (extraOptions.forceMethod) { this.options.method = extraOptions.forceMethod; }

			// Override the timeout in the options, if one was explicitly set.
			if (typeof this.timeout === 'number') { this.options.timeout = this.timeout; }

			// Make the request.
			const requestBody = (postData && this.options.method === 'POST' ? this.preparePostData(postData) : null);
			let responseBody = '';

			const req = this.module.request(this.options, (res) => {
				res.setEncoding(this.encoding);
				res.on('data', chunk => responseBody += chunk);
				res.on('end', () => {
					const headers = (res.headers[`content-type`] || '').split(`;`);
					const isJSON = headers.includes(`application/json`);
					return resolve(this.parseJSONResponse && isJSON ? JSON.parse(responseBody) : responseBody);
				});
			});

			req.on('error', err => reject(err));

			// Cope with sending data in post requests.
			if (requestBody) {
				req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
				req.setHeader('Content-Length', Buffer.byteLength(requestBody));
				req.write(requestBody, this.encoding);
			}

			// Action the request.
			req.end();

		});

		// Return the promise if we aren't using a callback.
		if (typeof callback !== 'function') { return future; }

		// Otherwise fire the callback when the promise returns.
		future.then(data => callback(null, data)).catch(err => callback(err));

	}

	/*
	 * Returns true if the given post data can be written directly to the request stream.
	 */
	preparePostData (postData) {

		if (typeof postData === 'string' || postData instanceof Buffer) {
			return postData;
		} else if (typeof postData === 'object') {
			return querystring.stringify(postData);
		}

		return '';

	}

	/*
	 * Shortcut method for a get request.
	 */
	get (callback = null) {
		return this.go(null, callback, {
			forceMethod: 'GET',
		});
	}

	/*
	 * Shortcut method for a post request.
	 */
	post (postData, callback = null) {
		return this.go(postData, callback, {
			forceMethod: 'POST',
		});
	}

};
