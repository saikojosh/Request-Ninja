'use strict';

/*
 * REQUEST NINJA
 */

/* eslint max-lines: 0 */
/* eslint max-statements: 0 */
/* eslint promise/no-callback-in-promise: 0 */
/* eslint promise/prefer-await-to-callbacks: 0 */
/* eslint promise/prefer-await-to-then: 0 */

const http = require(`http`);
const https = require(`https`);
const querystring = require(`querystring`);
const url = require(`url`);
const extender = require(`object-extender`);

const ErrorNinja = require(`error-ninja`).define({
	INVALID_POST_DATA_TYPE: `Post data must be a String, Buffer, Object, Array, or Undefined.`,
});

module.exports = class RequestNinja {

	/*
	 * Create a new request by passing in a URL or a Node http.request() options object.
	 */
	constructor (input, _settings = {}) {

		this.settings = extender.defaults({
			encoding: `utf8`,
			timeout: null,
			encodeJsonRequest: true,
			parseJsonResponse: true,
			returnResponseObject: false,
			forceMethod: null,
			logging: false,
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

		// Ensure we have a headers hash if it hasn't been set.
		this.requestOptions.headers = this.requestOptions.headers || {};

		// Figure out which module we need to use.
		this.module = (this.requestOptions.protocol === `https:` ? https : http);

		// Log out the settings.
		this.log(`\nInstantiated a new RequestNinja with settings:`);
		this.log(this.settings);

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
		const [ key, value ] = headerString.split(/\s*:\s*/);
		return this.setHeaders({ [key]: value });
	}

	/*
	 * Fire the request with optional post data. If a callback is not specified this will return a promise.
	 * callback(err, data);
	 */
	go (postData, overrideSettings = {}, callback = null, stream = null) {

		const future = new Promise((resolve, reject) => {

			// Merge the override settings into the existing settings.
			const useSettings = extender.merge(this.settings, overrideSettings);

			// If post data has been specified when we're in quick mode lets set the method appropriately.
			if (this.mode === `url` && postData && !useSettings.forceMethod) { this.requestOptions.method = `POST`; }

			// If we are forcing a particular method to be used lets set it appropriately.
			if (useSettings.forceMethod) { this.requestOptions.method = useSettings.forceMethod; }

			// Override the timeout in the options, if one was explicitly set.
			if (typeof useSettings.timeout === `number`) { this.requestOptions.timeout = useSettings.timeout; }

			// Log out the request.
			this.log(`\nMaking a ${this.requestOptions.method} request...`);
			this.log(`Request Options:`);
			this.log(this.requestOptions);
			this.log(`Post Data:`);
			this.log(postData);
			this.log(`Stream:`);
			this.log(stream ? `Yes` : `No`);

			let requestBody = null;
			let responseBody = ``;

			// Prepare the data for the POST request.
			if (postData && (this.requestOptions.method === `POST` || this.requestOptions.method === `PUT`)) {

				// Prepare and set the request body.
				const {
					preparedPostData,
					preparedContentType,
				} = this.preparePostData(postData, this.requestOptions.headers, useSettings);

				requestBody = preparedPostData;

				// Only automatically set the content type if it wasn't set by the user.
				if (!this.requestOptions.headers[`content-type`]) {
					this.requestOptions.headers[`content-type`] = preparedContentType;
				}

			}

			// Make the request and handle the response.
			const req = this.module.request(this.requestOptions, res => {
				res.setEncoding(useSettings.encoding);
				res.on(`data`, chunk => responseBody += chunk);
				res.on(`end`, () => {

					const isJson = this.isContentTypeJson(res.headers);

					try {
						res.body = (isJson ? JSON.parse(responseBody.trim() || `{}`) : responseBody);
					}
					catch (err) {
						this.log(`Response body:`);
						this.log(`"${responseBody}"`);
						throw new Error(`Failed to parse JSON response because of "${err}".`);
					}

					return resolve(useSettings.returnResponseObject ? res : res.body);

				});
			});

			req.on(`error`, err => reject(err));

			// Cope with sending data in post requests.
			if (requestBody) {
				req.setHeader(`Content-Length`, Buffer.byteLength(requestBody));
				req.write(requestBody, useSettings.encoding);
				req.end();
			}

			// Or if we have a stream lets pipe it.
			else if (stream) {
				stream.pipe(req);
			}

			// Otherwise just finish the request.
			else {
				req.end();
			}

		});

		// Return the promise if we aren't using a callback.
		if (typeof callback !== `function`) {
			return future;
		}

		// Otherwise fire the callback when the promise returns.
		future.then(data => callback(null, data)).catch(err => callback(err));

		return null;

	}

	/*
	 * Returns true if the given post data can be written directly to the request stream.
	 */
	preparePostData (postData, headers, settings) {

		let preparedPostData = ``;
		let preparedContentType = `application/x-www-form-urlencoded`;

		// Strings and buffers can be passed straight through to Node's "http.request()" method.
		if (typeof postData === `string` || postData instanceof Buffer) {
			preparedPostData = postData;
			preparedContentType = `application/x-www-form-urlencoded`;
		}

		// If an object has been passed in we need to encode it.
		else if (typeof postData === `object`) {
			const isJson = this.isContentTypeJson(headers);
			const encodeJson = settings.encodeJsonRequest;

			// We should encode as JSON.
			if (isJson && encodeJson) {
				preparedPostData = JSON.stringify(postData);
				preparedContentType = `application/json`;
			}

			// We should NOT encode as JSON.
			else {
				preparedPostData = querystring.stringify(postData);
				preparedContentType = `application/x-www-form-urlencoded`;
			}
		}

		// Throw an error for invalid post data types.
		else if (postData) {
			throw new ErrorNinja(`INVALID_POST_DATA_TYPE`);
		}

		return { preparedPostData, preparedContentType };

	}

	/*
	 * Returns true if the Content-Type header exists and includes "application/json".
	 */
	isContentTypeJson (headers) {
		const headerParts = (headers[`content-type`] || ``).split(`;`);
		return headerParts.includes(`application/json`);
	}

	/*
	 * Shortcut method for a GET request.
	 */
	get (callback = null) {
		return this.go(null, {
			forceMethod: `GET`,
		}, callback);
	}

	/*
	 * Shortcut method for a POST request.
	 */
	post (postData, callback = null) {
		return this.go(postData, {
			forceMethod: `POST`,
		}, callback);
	}

	/*
	 * Forcefully stringifies the post data and forces the method to "POST".
	 */
	postJson (postData, callback = null) {
		this.setHeader(`Content-Type: application/json`);
		const json = JSON.stringify(postData);
		return this.go(json, {
			forceMethod: `POST`,
		}, callback);
	}

	/*
 * Shortcut method for a PUT request.
 */
	put (putData, callback = null) {
		return this.go(putData, {
			forceMethod: `PUT`,
		}, callback);
	}

	/*
	 * Forcefully stringifies the put data and forces the method to "PUT".
	 */
	putJson (putData, callback = null) {
		this.setHeader(`Content-Type: application/json`);
		const json = JSON.stringify(putData);
		return this.go(json, {
			forceMethod: `PUT`,
		}, callback);
	}

	/*
	 * Forcefully sets the method to "POST" and passes in a stream.
	 */
	postStream (stream, callback = null) {
		return this.go(null, {
			forceMethod: `POST`,
		}, callback, stream);
	}

	/*
	 * Logs out the given data if logging is enabled.
	 */
	log (output) {
		if (!this.settings.logging) { return; }
		const formattedOutput = (typeof output === `object` ? JSON.stringify(output, null, 2) : output);
		console.log(formattedOutput); // eslint-disable-line no-console
	}

};
