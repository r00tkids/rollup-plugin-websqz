import smallWasm from "./assets/plasma.wasm?websqz-bin&raw";

async function hashUint8Array(u8, algorithm = 'SHA-256') {
  if (!(u8 instanceof Uint8Array)) u8 = new Uint8Array(u8);
  const digest = await crypto.subtle.digest(algorithm, u8.buffer);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

console.log(smallWasm.length);

// example usage with the imported wasm bytes
(async () => {
  try {
    const wasmBytes = smallWasm instanceof Uint8Array ? smallWasm : new Uint8Array(smallWasm);
    const hash = await hashUint8Array(wasmBytes);
    console.log('wasm SHA-256:', hash);
  } catch (e) {
    console.error('Hashing failed', e);
  }
})();

const width = 128;
const height = 128;

const memory = new WebAssembly.Memory({ initial: 1 });
const imports = {
  math: {
    sin: Math.sin,
    cos: Math.cos,
    sqrt: Math.sqrt,
    floor: Math.floor,
  },
  image: {
    memory,
  }
};

(async () => {
  const { instance } = await WebAssembly.instantiate(smallWasm, imports);

  if (!instance.exports.render) {
    console.error('No `render` export found in wasm');
  }

  const bytes = new Uint8Array(memory.buffer, 0, width * height * 4);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!document.body.contains(canvas)) {
    document.body.appendChild(canvas);
  }

  function animate(t) {
    instance.exports.render(t | 0);

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(bytes);
    ctx.putImageData(imageData, 0, 0);

    requestAnimationFrame(animate);
  }

  animate();
})();
