import type { OutputAsset, OutputChunk, OutputOptions, Plugin } from "rollup";
import querystring from "node:querystring";
import { importFromString } from "module-from-string";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

const removeEmptyEqualsRegex = /([?&])([^=&]+)=(&|$)/g;
function removeEmptyEquals(query: string): string {
  return query.replace(removeEmptyEqualsRegex, (match, sep, key, end) => {
    return end === '&' ? `${sep}${key}&` : `${sep}${key}`;
  });
}

const websqzPrefix = "\0websqz:";
const websqzPrefixBin = "\0websqz-bin:";

type WebSqzFile = {
  fileName: string;
  content: Uint8Array;
  isCompressed: boolean;
  fileExt: string;
  isText: boolean;
};

type WebSqzOptions = {
  websqzPath?: string;
};

type WebSqzCliOptions = {
  jsMain: string;
  files: string[];
  preCompressedFiles: string[];
  output: string;
}

class WebSqzExe {
  websqzPath: string;
  constructor(websqzPath: string) {
    this.websqzPath = websqzPath;
  }

  async run(cliOptions: WebSqzCliOptions): Promise<void> {
    const args: string[] = [];

    args.push("--js-main", cliOptions.jsMain);

    for (const file of cliOptions.files) {
      args.push("--files", file);
    }
    for (const preCompressedFile of cliOptions.preCompressedFiles) {
      args.push("--pre-compressed-files", preCompressedFile);
    }

    args.push("--output-directory", cliOptions.output);

    const spawn = await child_process.spawn(this.websqzPath, args, {
      stdio: "inherit",
    });

    return new Promise<void>((resolve, reject) => {
      spawn.once("error", (err) => {
        reject(err);
      });

      spawn.once("close", (code) => {
        if (code !== 0) {
          reject(new Error(`websqz process exited with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }
}

function websqzExecutablePath(executablePath: string | undefined): string {
  if (!executablePath) {
    const path = __dirname + "/bin/websqz";
    const extension = process.platform == "win32" ? ".exe" : "";

    if (fsSync.existsSync(path + extension)) {
      return path + extension;
    }

    return "websqz" + extension;
  }

  return executablePath;
}

export default function (options: WebSqzOptions = {}, isBuild?: boolean): Plugin {
  const websqzExePath = websqzExecutablePath(options.websqzPath);
  const websqzExe = new WebSqzExe(websqzExePath);

  const files = new Map<string, WebSqzFile>();
  const isAlreadyCompressed = new Map<string, boolean>();
  let fileNameIdx = 0;

  const findNextAvailableFileName = () => {
    const startChar = 97; // a
    const endChar = 122; // z
    const alphabetSize= endChar - startChar;

    let numChars = fileNameIdx === 0 ? 1 : Math.floor(Math.log(fileNameIdx) / Math.log(alphabetSize)) + 1;
    let candidateName = "";
    
    for (let i = 0; i < numChars; i++) {
      const charCode = startChar + ((Math.floor(fileNameIdx / Math.pow(alphabetSize, i))) % alphabetSize);
      candidateName = String.fromCharCode(charCode) + candidateName;
    }

    fileNameIdx++;

    return candidateName;
  }

  return {
    name: "rollup-plugin-websqz",

    resolveId: {
      order: "pre",
      handler: async function (
        source: string,
        importer: string | undefined,
        options: any,
      ) {
        const beforeParams = source.slice(0, source.indexOf("?"));
        const afterParams = source.slice(source.indexOf("?") + 1);
        const parsed = querystring.parse(afterParams);

        const isWebSqzTxt = parsed["websqz-txt"] != null;
        const isWebSqzBin = parsed["websqz-bin"] != null;

        if (!isWebSqzTxt && !isWebSqzBin) {
          return null;
        }

        if (isWebSqzTxt && isWebSqzBin) {
          throw new Error(
            `Cannot use both websqz-txt and websqz-bin on the same import: ${source}`,
          );
        }

        const isCompressed = parsed["compressed"] != null;

        delete parsed["websqz-txt"];
        delete parsed["websqz-bin"];
        delete parsed["compressed"];

        const cleanedUpSource = removeEmptyEquals(
          beforeParams +
          (Object.keys(parsed).length
            ? "?" + querystring.stringify(parsed)
            : "")
        );

        const resolution = await this.resolve(
          cleanedUpSource,
          importer,
          options,
        );

        if (!resolution) {
          throw new Error(
            `Could not resolve ${cleanedUpSource} in ${importer}`,
          );
        }

        if (isBuild) {
          if (isAlreadyCompressed.get(resolution.id) === undefined) {
            isAlreadyCompressed.set(resolution.id, isCompressed);
          } else {
            this.warn(
              `The module '${resolution.id}' has been imported with both compressed and uncompressed options. Compressed = ${isAlreadyCompressed.get(resolution.id)} will be used.`,
            );
          }
        }

        if (isWebSqzTxt) {
          if (isBuild) {
            return websqzPrefix + resolution.id;
          } else {
            return resolution.id;
          }
        }
        
        if (isWebSqzBin) {
          return websqzPrefixBin + resolution.id;
        }
      },
    },

    async load(id: string) {
      if (id.startsWith(websqzPrefix)) {
        const idWithoutPrefix = id.replace(websqzPrefix, "");
        const fileName = findNextAvailableFileName();

        this.debug(`Using file name '${fileName}' for module '${idWithoutPrefix}'`);

        // We need to create temporary files with the content to pass to websqz
        // since the content might have changed by other plugins as glslify
        const moduleInfo = await this.load({ id: idWithoutPrefix });
        const contentStr = (await importFromString(moduleInfo.code!))
          .default;
        if (
          typeof contentStr !== "string" &&
          !(contentStr instanceof String)
        ) {
          this.error(
            {
              message: `Expected a string from loading '${idWithoutPrefix}', but got ${typeof contentStr}. Try using '?raw' in the import instead.`,
            },
          );
        }

        let content = Buffer.from(contentStr, "utf-8");

        files.set(idWithoutPrefix, {
          fileName,
          content: content,
          isCompressed: isAlreadyCompressed.get(idWithoutPrefix) || false,
          fileExt: path.extname(idWithoutPrefix),
          isText: true,
        });

        return `export default new TextDecoder().decode(wsqz.files["${fileName}"]);`;
      }

      if (id.startsWith(websqzPrefixBin)) {
        const idWithoutPrefix = id.replace(websqzPrefixBin, "");

        if (isBuild) {
          const data = await fs.readFile(idWithoutPrefix);
          const fileName = findNextAvailableFileName();
          this.debug(`Using file name '${fileName}' for module '${idWithoutPrefix}'`);

          files.set(idWithoutPrefix, {
            fileName,
            content: data,
            isCompressed: isAlreadyCompressed.get(idWithoutPrefix) || false,
            fileExt: path.extname(idWithoutPrefix),
            isText: false,
          });
          return `export default wsqz.files["${fileName}"];`;
        } else {
          const data = await fs.readFile(idWithoutPrefix);

          return `export default Uint8Array.fromBase64("${data.toString("base64")}");`;
        }
      }
    },

    writeBundle: async function (outputOptions: OutputOptions, bundle: { [fileName: string]: OutputAsset | OutputChunk }) {
      const jsFiles = Object.entries(bundle)
        .filter(([fileName, asset]) => fileName.endsWith('.js') && asset.type === 'chunk');

      if (jsFiles.length === 0) {
        throw new Error('No JavaScript file found in the bundle.');
      }
      if (jsFiles.length > 1) {
        throw new Error('Multiple JavaScript files found in the bundle. Make sure to bundle into a single file.\nTry setting "build.rollupOptions.output.inlineDynamicImports" to true in Vite config.');
      }

      const [jsFileName, jsChunk] = jsFiles[0];

      if (isBuild) {
        const outDir = path.resolve(
            outputOptions.dir || "",
            "websqz-tmp");
        if (await fs.stat(outDir).catch(() => false)) {
          await fs.rmdir(outDir, { recursive: true });
        }

        const filesToCompress = [];
        const preCompressedFiles = [];

        for (const [id, file] of files) {
          this.debug(`Copying '${id}' for websqz...`);
          const outPath = path.resolve(
            outputOptions.dir || "",
            "websqz-tmp",
            file.fileName,
          );

          await fs.mkdir(path.dirname(outPath), { recursive: true });
          await fs.writeFile(outPath, file.content);

          if (file.isCompressed) {
            preCompressedFiles.push(path.relative(".", outPath));
          } else {
            filesToCompress.push({ isText: file.isText, fileExt: file.fileExt, path: path.relative(".", outPath) });
          }
        }

        // Sort by file extension for better compression ratios in websqz
        filesToCompress.sort((a, b) => Math.sign(a.fileExt.localeCompare(b.fileExt)) + 2 * (a.isText === b.isText ? 0 : a.isText ? -1 : 1));

        this.info(`Using websqz executable at '${websqzExe.websqzPath}'`);
        await websqzExe.run({
          jsMain: path.resolve(
            outputOptions.dir || "",
            jsFileName,
          ),
          files: filesToCompress.map(f => f.path),
          preCompressedFiles: preCompressedFiles,
          output: path.resolve(
            outputOptions.dir || "",
            "websqz-output",
          ),
        });

        const relOutPath = path.relative(".", path.resolve(outputOptions.dir || "", "websqz-output"));
        this.info(`Websqz completed, output at '${relOutPath}'.\nRun 'python -m http.server -d ${relOutPath}' to serve the output.`);
      }
    },
  };
}
