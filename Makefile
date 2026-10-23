.PHONY: setup lint test run build
setup:
	npm --prefix src/backend ci
lint:
	node deployment/quality-gate.js lint
test:
	npm --prefix src/backend test
run:
	npm --prefix src/backend start
build:
	npm --prefix src/backend run build:static
