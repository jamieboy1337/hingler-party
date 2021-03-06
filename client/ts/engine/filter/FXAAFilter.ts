import { GameContext } from "../GameContext";
import { Framebuffer } from "../gl/Framebuffer";
import { ColorFramebuffer } from "../gl/internal/ColorFramebuffer";
import { ShaderProgramBuilder } from "../gl/ShaderProgramBuilder";
import { getEnginePath } from "../internal/getEnginePath";
import { RenderType } from "../internal/performanceanalytics";
import { PostProcessingFilter } from "../material/PostProcessingFilter";
import { RenderContext } from "../render/RenderContext";


export class FXAAFilter extends PostProcessingFilter {
  private lumaFramebuffer: Framebuffer;

  private lumaShader: WebGLProgram;
  private aaShader: WebGLProgram;

  private locs: {
    aPosition: number
  };

  private unifs: {
    col: WebGLUniformLocation;
    lum: WebGLUniformLocation;
    resolution: WebGLUniformLocation;
  };

  private lumaPos: number;
  private lumaTex: WebGLUniformLocation;

  constructor(ctx: GameContext) {
    super(ctx);
    this.lumaFramebuffer = new ColorFramebuffer(ctx, ctx.getScreenDims());

    this.aaShader = null;
    this.lumaShader = null;

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/fxaa/fxaa.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/fxaa/fxaa.frag"))
      .build()
      .then(this.bindUniforms.bind(this));

    new ShaderProgramBuilder(ctx)
      .withVertexShader(getEnginePath("engine/glsl/texturexfer/texturexfer.vert"))
      .withFragmentShader(getEnginePath("engine/glsl/lum/lum.frag"))
      .build()
      .then(this.bindUniformsLuma.bind(this));
  }

  private bindUniforms(res: WebGLProgram) {
    this.aaShader = res;
    const gl = this.getContext().getGLContext();

    this.locs = {
      aPosition: gl.getAttribLocation(this.aaShader, "aPosition")
    }

    this.unifs = {
      col: gl.getUniformLocation(this.aaShader, "col"),
      lum: gl.getUniformLocation(this.aaShader, "lum"),
      resolution: gl.getUniformLocation(this.aaShader, "resolution")
    };
  }

  private bindUniformsLuma(res: WebGLProgram) {
    this.lumaShader = res;
    const gl = this.getContext().getGLContext();
    this.lumaPos = gl.getAttribLocation(this.lumaShader, "aPosition");
    this.lumaTex = gl.getUniformLocation(this.lumaShader, "disp");
  }

  runFilter(src: Framebuffer, dst: Framebuffer, rc: RenderContext) {
    const timer = this.getContext().getGPUTimer();
    const id = timer.startQuery();
    if (this.aaShader !== null && this.lumaShader !== null) {
      const gl = this.getContext().getGLContext();
      const wrap = this.getContext().getGL();
      
      const oldDims = this.lumaFramebuffer.dims;
      const newDims = this.getContext().getScreenDims();
      if (oldDims[0] !== newDims[0] || oldDims[1] !== newDims[1]) {
        this.lumaFramebuffer.setFramebufferSize(newDims);
      }

      gl.viewport(0, 0, newDims[0], newDims[1]);

      wrap.useProgram(this.lumaShader);
      this.lumaFramebuffer.bindFramebuffer(gl.FRAMEBUFFER);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
      src.getColorTexture().bindToUniform(this.lumaTex, 1);
      const buf = this.getScreenBuffer();
      wrap.bindBuffer(gl.ARRAY_BUFFER, buf);

      gl.vertexAttribPointer(this.lumaPos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.lumaPos);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(this.lumaPos);

      wrap.useProgram(this.aaShader);
      dst.bindFramebuffer(gl.FRAMEBUFFER);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      this.lumaFramebuffer.getColorTexture().bindToUniform(this.unifs.lum, 0);
      src.getColorTexture().bindToUniform(this.unifs.col, 1);
      gl.uniform2fv(this.unifs.resolution, newDims);
      
      gl.vertexAttribPointer(this.locs.aPosition, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.locs.aPosition);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(this.locs.aPosition);
    }
    timer.stopQueryAndLog(id, "FXAAFilter", RenderType.POST);
  }
}