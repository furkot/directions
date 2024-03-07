check: lint test

lint:
	./node_modules/.bin/jshint *.js lib test

test:
	node --test --require should $(TEST_OPTS)

.PHONY: check lint test
