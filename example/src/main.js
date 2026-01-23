import frag from "./frag.glsl";
import binary from "./rand.bin?websqz-bin";
import json from "./test.json?websqz-txt&raw";
import websqzJpg from "./websqz.jpg?websqz-bin&compressed&raw";

if (import.meta.hot) {
  import.meta.hot.accept(["./frag.glsl", "./rand.bin?websqz-bin", "./test.json?websqz-txt&raw"], (modules) => {
    for (const mod of modules) {
      if (!mod) continue; // module not updated
      console.log("HMR update:", mod.default);
    }
  });
}

console.log("Fragment Shader:", frag);
console.log("Binary Data:", binary);
console.log("Test JSON:", json);
console.log("WebSQZ JPG Data (already compressed):", websqzJpg);
