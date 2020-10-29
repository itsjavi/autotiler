default: build

clean:
	rm -rf dist/*

start:
	npm start

build:
	npm run dist
	sleep 1
	rm -rf dist/autotiler-mac.app
	cp -r dist/mac/Autotiler.app dist/autotiler-mac.app

version-major:
	npm version major

version-minor:
	npm version minor

version-patch:
	npm version patch

version-fix: version-patch
version: version-minor

release: build
	node publish.js

$(V).SILENT:
.PHONY: docs tests test build dist
