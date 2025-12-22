import frag from "./frag.glsl?websqz-txt";
import binary from "./rand.bin?websqz-bin";
import test from "./test.json?websqz-txt&raw";

console.log("Test JSON:", test);
//import binaryCompressed from "./rand.bin?websqz-bin&compressed";
//import shaderCompressed from "./frag.glsl?websqz-txt&compressed";

if (import.meta.hot) {
  import.meta.hot.accept("./frag.glsl?websqz-txt", (newFrag) => {
    // the callback receives the updated './frag.glsl?websqz-txt' module
    console.log(newFrag?.default);
  });
}

console.log("Fragment Shader:", frag);
//console.log("Shader compressed:", shaderCompressed);
console.log("Binary Data:", binary);
//console.log("Binary Data Compressed:", binaryCompressed);
