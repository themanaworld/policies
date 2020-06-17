DENO_INSTALL ?= ${HOME}/.deno

default: build

.PHONY: build
build:
	rm -rf build && mkdir -p build
	${DENO_INSTALL}/bin/deno run --allow-read=. --allow-write=build src/build.ts

.PHONY: deno # installs deno (only use this in CI)
deno:
	curl -fsSL https://deno.land/x/install/install.sh | sh
