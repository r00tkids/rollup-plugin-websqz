# rollup-plugin-websqz

Rollup / Vite plugin for using [websqz](https://github.com/r00tkids/websqz) to compress and bundle code and assets into one HTML file.

## Usage
Add the following to your plugins section in `vite.config.js`
```js
{
    plugins: [
        websqz()
    ]
}
```

See `example` for a working example.