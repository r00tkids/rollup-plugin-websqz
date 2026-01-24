# rollup-plugin-websqz
Rollup / Vite plugin for using [websqz](https://github.com/r00tkids/websqz) to compress and bundle code and assets into one HTML file. This is intented for intros in the [demoscene](https://en.wikipedia.org/wiki/Demoscene) or size restricted JS challenges.

## Install
1. `npm i rollup-plugin-websqz` 
2. `node ./node_modules/rollup-plugin-websqz/scripts/install.js` to install the pre-built websqz executable from https://github.com/r00tkids/websqz

## Usage
```js
// vite.config.js
import { defineConfig } from 'vite';
import websqz from 'rollup-plugin-websqz';

export default defineConfig({
  plugins: [websqz()]
});
```

See the [example](https://github.com/r00tkids/rollup-plugin-websqz/tree/main/example) for a working example with support for `vite-plugin-glsl`.

## Example Options
```js
websqz({
    /*
    Full path to the websqz executable.
    If null (default), the plugin uses the websqz executable
    installed by running step 2 in the Install section.
    Otherwise it will try to resolve websqz from your system PATH.
    */
    websqzPath: null,
    fileHooks: [
        {
            filter: /\.glsl$/,
            transform: async (ctx, id, content) => {
                return {
                    content: Buffer.from("Hello World", "utf-8"),
                    isCompressed: false,
                    isText: true,
                    fileExt: ".glsl" // Optional
                };
            }
        }
    ]
})
```