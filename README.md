# rollup-plugin-websqz
Rollup / Vite plugin for using [websqz](https://github.com/r00tkids/websqz) to compress and bundle code and assets into one HTML file. This is intented for intros in the [demoscene](https://en.wikipedia.org/wiki/Demoscene) or size restricted JS challenges.

## Usage
```js
// vite.config.js
import { defineConfig } from 'vite';
import websqz from 'rollup-plugin-websqz';

export default defineConfig({
  plugins: [websqz()]
});
```

See the [example](./example) for a working example with support for `vite-plugin-glsl`.

## Example Options
```js
websqz({
    websqzPath: null, // It's resolved to the websqz executable installed when installing the npm package, else it'll try to execute based on $PATH
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