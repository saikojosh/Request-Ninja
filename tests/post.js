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

const expect = require('chai').expect;
const RequestNinja = require('../index');

describe('Request: POST', () => {

	it('should return data using a promise when a URI is requested using URL mode', function (done) {
		this.timeout(1000 * 5);

		const req = new RequestNinja('http://httpbin.org/post');

		req.go({ var1: 123, var2: 'abc' })
			.then((result) => JSON.parse(result))
			.then((result) => {
				expect(result).to.be.ok;
				const data = JSON.parse(result.data);
				expect(data).to.have.a.property('var1', 123);
				expect(data).to.have.a.property('var2', 'abc');
				return result;
			})
			.then((result) => done())
			.catch((err) => done(err));

	});

	it('should return data using a callback when a URI is requested using URL mode', function (done) {
		this.timeout(1000 * 5);

		const req = new RequestNinja('http://httpbin.org/post');

		req.go({ var1: 123, var2: 'abc' }, (err, _result) => {
			if (err) { return done(err); }
			expect(_result).to.be.ok;
			const result = JSON.parse(_result);
			const data = JSON.parse(result.data);
			expect(data).to.have.a.property('var1', 123);
			expect(data).to.have.a.property('var2', 'abc');
			return done();
		});

	});

});
