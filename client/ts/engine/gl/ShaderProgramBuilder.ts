// build shaders from scratch
// support include syntax path relative
// i already wrote this in cpp :)

import { Future } from "../../../../ts/util/task/Future";
import { Task } from "../../../../ts/util/task/Task";
import { GameContext } from "../GameContext";
import { ShaderFileParser } from "./internal/ShaderFileParser";

// TODO:
// separate local imports and imports from our engine folder
// first, check the engine folder
// then, check local directory

const shaderCache : Map<string, WebGLProgram> = new Map();
const shadersCompiling : Map<string, Promise<void>> = new Map();

// load shader async compile
// use a static func to check the shadercache at the end of each frame,
// and resolve any lingering promises

export function isShaderCompiling() {
  return (shadersCompiling.size === 0);
}

export function shadersStillCompiling() {
  return (shadersCompiling.size);
}

/**
 * Builds shaders from files.
 * Also supports non-standard include syntax for incorporating shader code from other files.
 */
export class ShaderProgramBuilder {
  private fileParser: ShaderFileParser;
  private ctx: GameContext;

  private vertPath: string;
  private fragPath: string;

  private flags: string[];

  constructor(ctx: GameContext) {
    this.vertPath = null;
    this.fragPath = null;
    this.ctx = ctx;
    this.fileParser = new ShaderFileParser(this.ctx);
    this.flags = [];
  }

  /**
   * Builder function which specifies a vertex shader.
   * @param vertexPath - the path to the desired vertex shader.
   * @returns the builder instance.
   */
  withVertexShader(vertexPath: string) {
    // cue an async method which will build the shader
    this.vertPath = vertexPath;
    return this;
  }

  /**
   * Builder which specifies a fragment shader.
   * @param fragmentPath - the path to the desired fragment shader.
   * @returns the builder instance.
   */
  withFragmentShader(fragmentPath: string) {
    this.fragPath = fragmentPath;
    return this;
  }

  withFlags(...flags: string[]) {
    this.flags.push(...flags);
    this.fileParser.setProgramFlags(this.flags);
    return this;
  }

  private getPathString() {
    return `${this.vertPath}|${this.fragPath}:${this.flags.join(",")}`;
  }

  buildFuture() : Future<WebGLProgram> {
    if (this.vertPath === null || this.fragPath === null) {
      let err = `Missing ${this.vertPath === null ? "vertex " : ""}${this.vertPath === null && this.fragPath === null ? "and " : ""}${this.fragPath === null ? "fragment " : ""}shader!`;
      console.error(err);
      throw err;
    }

    let progTask = new Task<WebGLProgram>();
    
    // errors from compilation will throw here
    // `<vertpath>|<fragpath>:flagA,flagB,...,flagZ`
    let pathString = this.getPathString();

    if (shaderCache.has(pathString)) {
      progTask.resolve(shaderCache.get(pathString));
    } else if (shadersCompiling.has(pathString)) {
      shadersCompiling.get(pathString).then(() => {
        if (shaderCache.has(pathString)) {
          progTask.resolve(shaderCache.get(pathString));
        }
      })
    } else {
      this.build().then((prog) => {
        progTask.resolve(prog);
      })
    }

    return progTask.getFuture();
  }

  /**
   * Builds the shader.
   * @returns a promise which rejects if either shader is missing or invalid, or if a link error occurs, and resolves to the compiled program.
   */
  async build() : Promise<WebGLProgram> {
    // since our shaders are async: we ought to come up with a way to return this :(
    // in usage: if the built shader is not ready yet, then perform a no-op when drawing.
    if (this.vertPath === null || this.fragPath === null) {
      let err = `Missing ${this.vertPath === null ? "vertex " : ""}${this.vertPath === null && this.fragPath === null ? "and " : ""}${this.fragPath === null ? "fragment " : ""}shader!`;
      console.error(err);
      throw err;
    }

    const gl = this.ctx.getGLContext();
    
    // errors from compilation will throw here
    let pathString = this.getPathString();
    if (shadersCompiling.has(pathString)) {
      await shadersCompiling.get(pathString);
      // shader is compiling -- wait for completion
    }

    if (shaderCache.has(pathString)) {
      // since we've already waited for compilation: if this is false, the shader has not been compiled yet.
      return shaderCache.get(pathString);
    }
    
    let res: () => void;
    let rej: (e?: any) => void;
    let progress : Promise<void> = new Promise((resolve, reject) => {
      res = resolve;
      rej = reject;
    });

    // use futures for this
    // parallel: linkprogram will be an async call
    // perframe:
    //  - check linkstatus
    //    - note: we'll have to put the program somewhere where we can see what its up to
    //  - if failed, log link log, then shader logs, reject.
    //  - if succeed, resolve.
    shadersCompiling.set(pathString, progress);
    
    let vertShader : [WebGLShader, string];
    let fragShader : [WebGLShader, string];

    this.fileParser.setProgramFlags(this.flags);

    try {
      vertShader = await this.createShaderFromFile_(this.vertPath, gl.VERTEX_SHADER);
      fragShader = await this.createShaderFromFile_(this.fragPath, gl.FRAGMENT_SHADER);
    } catch (e) {
      console.error(e);
      rej(e);
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vertShader[0]);
    gl.attachShader(prog, fragShader[0]);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.log("Encountered linking error: " + gl.getProgramParameter(prog, gl.LINK_STATUS));
      let info = gl.getProgramInfoLog(prog);
      console.error(info);

      // only check compilation status if link fails
      for (let tuple of [vertShader, fragShader]) {
        const shader = tuple[0];
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          let log = gl.getShaderInfoLog(shader);
          this.printParsedShaderWithLineNumbers(tuple[1], "");
          console.error(log);
          gl.deleteShader(shader);
          throw Error(log);
        }
      }
      rej();
      throw Error(info);
    }

    // shader is not cached -- cache it!
    shaderCache.set(pathString, prog);
    shadersCompiling.delete(pathString);
    res();
    return prog;
  }

  private async createShaderFromFile_(shaderPath: string, shaderType: number) : Promise<[WebGLShader, string]> {
    const gl = this.ctx.getGLContext();
    let shader = gl.createShader(shaderType);
    let contents = await this.fileParser.parseShaderFile(shaderPath, (shaderType === gl.VERTEX_SHADER));

    gl.shaderSource(shader, contents);
    gl.compileShader(shader);
    return [shader, contents];
  }

  private printParsedShaderWithLineNumbers(shader: string, path: string) {
    let lines = shader.split(/\r?\n/);
    let breaks = Math.ceil(Math.log10(lines.length + 1)) + 2;
    for (let i = 0; i < lines.length; i++) {
      let numstr = (i + 1).toString(10).padEnd(breaks, " ");
      lines[i] = numstr + lines[i];
    }

    console.warn(`Error in ${path}: \n${lines.join("\r\n")}`);
  }
}
