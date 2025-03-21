#!/bin/bash

# Compile TypeScript file
npx tsc workflow/src/workers/list-iframes.ts --esModuleInterop true --module commonjs

# Run the compiled JavaScript
node workflow/src/workers/list-iframes.js "$1" 