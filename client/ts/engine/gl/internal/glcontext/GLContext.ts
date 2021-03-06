import { RingArray } from "nekogirl-valhalla/array/RingArray";
import { LRUMap } from "nekogirl-valhalla/map/LRUMap";
import { GLContextI } from "../../GLContextI";
import { Texture } from "../../Texture";
import { UniformMap } from "./UniformMap";

export class GLContext implements GLContextI {
  private programMap : Map<WebGLProgram, UniformMap>;
  private textureMap : LRUMap<WebGLTexture, number>;

  // store currently bound webgl buffer
  private bufferMap : Map<number, WebGLBuffer>;

  private boundProgram : WebGLProgram;
  private activeUniformList : UniformMap;

  private texCapacity : number;

  private gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.activeUniformList = null;
    this.programMap = new Map();
    this.bufferMap = new Map();
    
    const texmax = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
    
    this.textureMap = new LRUMap(texmax);
    this.texCapacity = texmax;
  }

  useProgram(prog: WebGLProgram) {
    if (prog !== this.boundProgram) {
      if (!this.programMap.has(prog)) {
        this.programMap.set(prog, new UniformMap(this.gl));
      }
  
      this.activeUniformList = this.programMap.get(prog);
      this.gl.useProgram(prog);
      this.boundProgram = prog;
    }
  }

  uniform1i(loc: WebGLUniformLocation, val: number) {
    if (this.activeUniformList === null) {
      throw Error("No program currently bound!");
    }

    this.activeUniformList.uniform1i(loc, val);
  }

  uniform1f(loc: WebGLUniformLocation, val: number) {
    if (this.activeUniformList === null) {
      throw Error("No program currently bound!");
    }

    this.activeUniformList.uniform1f(loc, val);
  }

  bindTexture(tex: WebGLTexture, target: number, loc?: WebGLUniformLocation) {
    let res = -1;
    if (this.textureMap.has(tex)) {
      res = this.textureMap.get(tex);
      this.textureMap.insert(tex, res);
    } else {
      if (this.textureMap.size < this.texCapacity) {
        const index = this.textureMap.size;
        this.textureMap.insert(tex, index);
        res = index;
      } else {
        const swap = this.textureMap.evict();
        this.textureMap.insert(tex, swap);
        res = swap;
      }

      // should we always activate this texture?
      this.gl.activeTexture(this.gl.TEXTURE0 + res);
      this.gl.bindTexture(target, tex);
    }

    if (loc !== undefined) {
      this.activeUniformList.uniform1i(loc, res);
    }

    return this.gl.TEXTURE0 + res;
  }

  bindBuffer(targ: number, buf: WebGLBuffer) {
    if (this.bufferMap.has(targ)) {
      if (this.bufferMap.get(targ) === buf) {
        return;
      }
    }

    const gl = this.gl;
    gl.bindBuffer(targ, buf);
    this.bufferMap.set(targ, buf);
  }

  clearTexBinds() {
    // lazy soln
    this.textureMap = new LRUMap(this.texCapacity);
  }
}