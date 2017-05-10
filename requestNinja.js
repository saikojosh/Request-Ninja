'use strict';

/*
 * REQUEST NINJA
 */

/* eslint id-length: 0 */

const http = require(`http`);
const https = require(`https`);
const querystring = require(`querystring`);
const url = require(`url`);
const extender = require(`object-extender`);

module.exports = class RequestNinja {

	/*
	 * Create a new request by passing in a URL or a Node http.request() options object.
	 */
	constructor (input, _settings = {}) {

		this.settings = extender.defaults({
			encoding: `utf8`,
			timeout: null,
			encodeJSONRequest: true,
			parseJsonResponse: true,
			forceMethod: null,
		}, _settings);

		this.mode = null;
		this.requestOptions = {};

		// Prepare the request options.
		switch (typeof input) {

			case `object`:
				this.requestOptions = input;
				this.mode = `options`;
				break;

			case `string`:
				this.requestOptions = this.convertUrlToOptions(input);
				this.mode = `url`;
				break;

			default:
				throw new Error(`Invalid input.`);

		}

		// Figure out which module we need to use.
		this.module = (this.requestOptions.protocol === `https:` ? https : http);

	}

	/*
	 * Converts the URL to the options that http.request() expects.
	 */
	convertUrlToOptions (input) {

		const parts = url.parse(input);
		const requestOptions = {};

		requestOptions.protocol = parts.protocol || `http:`;
		requestOptions.hostname = parts.hostname || parts.host || void (0);
		requestOptions.port = parts.port || void (0);
		requestOptions.path = (parts.pathname + (parts.search || ``) + (parts.hash || ``)) || void (0);
		requestOptions.auth = parts.auth || void (0);

		return requestOptions;

	}

	/*
	 * Modify the default encoding of the request.
	 */
	setEncoding (encoding) {
		this.settings.encoding = encoding;
		return this;
	}

	/*
	 * Modify the default encoding of the request.
	 */
	setTimeout (milliseconds) {
		this.settings.timeout = milliseconds;
		return this;
	}

	/*
	 * Set multiple headers provided as an object.
	 */
	setHeaders (_headerHash) {

		const headerHash = {};

		// Make sure all header keys are lower case.
		for (const key in _headerHash) {
			if (!_headerHash.hasOwnProperty(key)) { continue; }
			const value = _headerHash[key];
			headerHash[key.toLowerCase()] = value;
		}

		// Merge new headers in.
		this.requestOptions.headers = extender.merge(this.requestOptions.headers || {}, headerHash);

		return this;

	}

	/*
	 * Set a single header provided in the format "Authorisation: Bearer .....".
	 */
	setHeader (headerString) {
		const [key, value] = headerString.split(/\s?:\s?/);
		return this.setHeaders({ [key]: value });
	}

	/*
	 * Fire the request with optional post data. If a callback is not specified this will return a promise.
	 * callback(err, data);
	 */
	go (postData, overrideSettings = {}, callback = null) {
		/* eslint promise/no-callback-in-promise: 0 */

		const future = new Promise((resolve, reject) => {

			// Merge the override settings into the existing settings.
			const useSettings = extender.merge(this.settings, overrideSettings);

			// If post data has been specified when we're in quick mode lets set the method appropriately.
			if (this.mode === `url` && postData && !useSettings.forceMethod) { this.requestOptions.method = `POST`; }

			// If we are forcing a particular method to be used lets set it appropriately.
			if (useSettings.forceMethod) { this.requestOptions.method = useSettings.forceMethod; }

			// Override the timeout in the options, if one was explicitly set.
			if (typeof useSettings.timeout === `number`) { this.requestOptions.timeout = useSettings.timeout; }

			let requestBody = null;
			let responseBody = ``;

			// Prepare the data for the POST request.
			if (postData && this.requestOptions.method === `POST`) {
				requestBody = this.preparePostData(postData, this.requestOptions.headers, useSettings);
			}

			// Make the request and handle the response.
			const req = this.module.request(this.requestOptions, res => {
				res.setEncoding(useSettings.encoding);
				res.on(`data`, chunk => responseBody += chunk);
				res.on(`end`, () => {
					const isJson = this.isContentTypeJson(res.headers);
					return resolve(useSettings.parseJsonResponse && isJson ? JSON.parse(responseBody) : responseBody);
				});
			});

			req.on(`error`, err => reject(err));

			// Cope with sending data in post requests.
			if (requestBody) {
				req.setHeader(`Content-Type`, `application/x-www-form-urlencoded`);
				req.setHeader(`Content-Length`, Buffer.byteLength(requestBody));
				req.write(requestBody, useSettings.encoding);
			}

			// Finish the request.
			req.end();

		});

		// Return the promise if we aren't using a callback.
		if (typeof callback !== `function`) { return future; }

		// Otherwise fire the callback when the promise returns.
		future.then(data => callback(null, data)).catch(err => callback(err));

	}

	/*
	 * Returns true if the given post data can be written directly to the request stream.
	 */
	preparePostData (postData, headers, settings) {

		if (typeof postData === `string` || postData instanceof Buffer) {
			return postData;
		}
		else if (typeof postData === `object`) {
			const isJson = this.isContentTypeJson(headers);
			return (isJson && settings.encodeJSONRequest ? JSON.stringify(postData) : querystring.stringify(postData));
		}

		return ``;

	}

	/*
	 * Returns true if the Content-Type header exists and includes "application/json".
	 */
	isContentTypeJson (headers) {
		const headerParts = (headers[`content-type`] || ``).split(`;`);
		return headerParts.includes(`application/json`);
	}

	/*
	 * Shortcut method for a get request.
	 */
	get (callback = null) {
		return this.go(null, callback, {
			forceMethod: `GET`,
		});
	}

	/*
	 * Shortcut method for a post request.
	 */
	post (postData, callback = null) {
		return this.go(postData, callback, {
			forceMethod: `POST`,
		});
	}

	/*
	 * Forcefully stringifies the post data and forces the method to "POST".
	 */
	postJson (postData, callback = null) {
		this.setHeader(`Content-Type: application/json`);
		return this.go(JSON.stringify(postData), callback, {
			forceMethod: `POST`,
		});
	}

};
