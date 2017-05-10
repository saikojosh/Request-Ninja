'use strict';

/*
 * TEST: Get
 * Test whether the module can return data with a GET request.
 */

/* global describe */
/* global it */
/* eslint newline-after-var: 0 */
/* eslint no-unused-expressions: 0 */
/* eslint no-unused-vars: 0 */
/* eslint import/no-extraneous-dependencies: 0 */
/* eslint promise/no-callback-in-promise: 0 */
/* eslint node/no-unpublished-require: 0 */

const expect = require(`chai`).expect;
const RequestNinja = require(`../requestNinja`);

describe(`When making a GET request`, () => {

	it(`should return data using a promise when a URI is requested using URL mode`, function (done) {
		this.timeout(1000 * 5);

		const req = new RequestNinja(`http://httpbin.org/get`);

		req.go()
			.then(result => {
				expect(result).to.be.ok;
				expect(result).to.be.an(`object`);
				expect(result).to.have.a.property(`url`, `http://httpbin.org/get`);
				return result;
			})
			.then(result => done())
			.catch(err => done(err));

	});

	it(`should return data using a callback when a URI is requested using URL mode`, function (done) {
		this.timeout(1000 * 5);

		const req = new RequestNinja(`http://httpbin.org/get`);

		req.go(null, null, (err, result) => {
			if (err) { return done(err); }
			expect(result).to.be.ok;
			expect(result).to.be.an(`object`);
			expect(result).to.have.a.property(`url`, `http://httpbin.org/get`);
			return done();
		});

	});

});
