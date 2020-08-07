default: build

start:
	npm start

build:
	npm run dist

version-major:
	npm version major

version-minor:
	npm version minor

version-patch:
	npm version patch

version-fix: version-patch
version: version-patch

release: build
	node publish.js

$(V).SILENT:
.PHONY: docs tests test build dist
