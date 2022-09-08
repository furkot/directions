check: lint test

lint:
	./node_modules/.bin/jshint *.js lib test

MOCHA_OPTS += --recursive --require should

test:
	./node_modules/.bin/mocha $(MOCHA_OPTS)

.PHONY: check lint test
