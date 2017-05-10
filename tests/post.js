'use strict';

/*
 * TEST: Post
 * Test whether the module can return data with a POST request.
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

describe(`When making a POST request`, () => {

	it(`should return data using a promise when a URI is requested using URL mode`, function (done) {
		this.timeout(1000 * 5);

		const req = new RequestNinja(`http://httpbin.org/post`);

		req.setHeader(`Content-Type: application/json`);
		req.go({ var1: 123, var2: `abc` })
			.then(result => {
				expect(result).to.be.ok;
				expect(result).to.be.an(`object`);
				const data = JSON.parse(result.data);
				expect(data).to.be.an(`object`);
				expect(data).to.have.a.property(`var1`, 123);
				expect(data).to.have.a.property(`var2`, `abc`);
				return result;
			})
			.then(result => done())
			.catch(err => done(err));

	});

	it(`should return data using a callback when a URI is requested using URL mode`, function (done) {
		this.timeout(1000 * 5);

		const req = new RequestNinja(`http://httpbin.org/post`);

		req.setHeader(`Content-Type: application/json`);
		req.go({ var1: 123, var2: `abc` }, null, (err, result) => {
			if (err) { return done(err); }
			expect(result).to.be.ok;
			expect(result).to.be.an(`object`);
			const data = JSON.parse(result.data);
			expect(data).to.be.an(`object`);
			expect(data).to.have.a.property(`var1`, 123);
			expect(data).to.have.a.property(`var2`, `abc`);
			return done();
		});

	});

	it(`should return data using a promise when a URI is requested using URL mode (and the .postJson() method is used)`, function (done) {
		this.timeout(1000 * 5);

		const req = new RequestNinja(`http://httpbin.org/post`);

		req.postJson({ var1: 123, var2: `abc` })
			.then(result => {
				expect(result).to.be.ok;
				expect(result).to.be.an(`object`);
				const data = JSON.parse(result.data);
				expect(data).to.be.an(`object`);
				expect(data).to.have.a.property(`var1`, 123);
				expect(data).to.have.a.property(`var2`, `abc`);
				return result;
			})
			.then(result => done())
			.catch(err => done(err));

	});

});
