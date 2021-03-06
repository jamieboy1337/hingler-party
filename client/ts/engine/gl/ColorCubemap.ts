import { GameContext } from "../GameContext";
import { Cubemap } from "./Cubemap";
import { TextureFormat } from "./Texture";

// would be nice to poll texture support?

export class ColorCubemap implements Cubemap {
  private ctx: GameContext;
  private cube: WebGLTexture;
  readonly dims: number;

  /**
   * Creates a new Cubemap
   * @param ctx - gamecontext
   * @param dims - size of each cube face
   */
  constructor(ctx: GameContext, dim: number) {
    // note: what about shadow cubemaps?
    // what happens when I need those?
    this.ctx = ctx;
    const gl = this.ctx.getGLContext();
    this.cube = gl.createTexture();

    ctx.getGLExtension("OES_texture_float");
    const linear = !!ctx.getGLExtension("OES_texture_float_linear");
    // firefox complains about this???
    ctx.getGLExtension("WEBGL_color_buffer_float");

    if (ctx.webglVersion === 2) {
      // 16f mipmap
      ctx.getGLExtension("EXT_color_buffer_float");
    }
    this.dims = dim;

    const wrap = ctx.getGL();
    const ind = wrap.bindTexture(this.cube, gl.TEXTURE_CUBE_MAP);
    gl.activeTexture(ind);

    // lule
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const ver = this.ctx.webglVersion;
    for (let i = 0; i < 6; i++) {
      // alloc our textures
      if (ver === 2) {
        const gl2 = gl as WebGL2RenderingContext;
        gl2.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl2.RGBA16F, dim, dim, 0, gl.RGBA, gl.FLOAT, null);
      } else {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, dim, dim, 0, gl.RGBA, gl.FLOAT, null);
      }
    }
  }

  generateMipmaps() {
    // "lazy texture initialization on level 0"
    // no idea what this means but i assume it has something to do with the crash before load
    const gl = this.ctx.getGLContext();
    const wrap = this.ctx.getGL();
    gl.activeTexture(wrap.bindTexture(this.cube, gl.TEXTURE_CUBE_MAP));
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }

  attachToFramebuffer(face: number, framebuffer: WebGLFramebuffer, mipLevel?: number, target?: number) {
    let mip = mipLevel;
    let targ = target;
    const gl = this.ctx.getGLContext();

    if (mip === undefined) {
      mip = 0;
    }

    if (targ === undefined) {
      targ = gl.COLOR_ATTACHMENT0;
    }

    const off = face - gl.TEXTURE_CUBE_MAP_POSITIVE_X;
    if (off < 0 || off > 5) {
      console.warn("Invalid face for bind call: " + face);
      return;
    }

    const wrap = this.ctx.getGL();

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.activeTexture(wrap.bindTexture(this.cube, gl.TEXTURE_CUBE_MAP));
    gl.framebufferTexture2D(gl.FRAMEBUFFER, targ, face, this.cube, mip);
  }

  bindToUniform(location: WebGLUniformLocation, index: number) {
    const gl = this.ctx.getGLContext();
    if (index > 31 || index < 0) {
      const err = "OOB index";
      console.error(err);
      throw Error(err);
    }

    const wrap = this.ctx.getGL();
    wrap.bindTexture(this.cube, gl.TEXTURE_CUBE_MAP, location);
  }

  bindCubemap(location?: number, index?: number) {
    const gl = this.ctx.getGLContext();
    let loc : number;
    let slot: number;
    if (location === undefined) {
      loc = gl.TEXTURE_CUBE_MAP;
    } else {
      loc = location;
    }

    if (index === undefined || (index < 0 || index >= 32)) {
      slot = gl.TEXTURE0;
    } else {
      slot = gl.TEXTURE0 + index;
    }

    gl.activeTexture(this.ctx.getGL().bindTexture(this.cube, loc));
  }

  getTextureFormat() {
    return TextureFormat.RGBA;
  }
}
