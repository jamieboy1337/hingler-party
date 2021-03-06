import { ComponentType } from "./component/ComponentType";
import { GLContextI } from "./gl/GLContextI";
import { GPUTimer, SharedGPUTimer } from "./gl/internal/SharedGPUTimer";
import { FileLoader } from "./loaders/FileLoader";
import { GLTFLoader } from "./loaders/GLTFLoader";
import { InstancedModel } from "./model/InstancedModel";
import type { Scene } from "./object/scene/Scene";
import { SceneSwap } from "./object/scene/SceneSwap";

export interface EXT_disjoint_timer_query_webgl2 {
  readonly QUERY_COUNTER_BITS_EXT : GLenum;
  readonly TIME_ELAPSED_EXT : GLenum;
  readonly TIMESTAMP_EXT : GLenum;
  readonly GPU_DISJOINT_EXT : GLenum;

  queryCounterEXT(query: WebGLQuery, target: GLenum) : void;
}

/**
 * A Context aims to provide consistent information to all components on the state of execution.
 */
export interface GameContext {
  /**
   * true if the device is detected as a mobile device, false otherwise.
   */
  readonly mobile : boolean;

  /**
   * true if the debugger is open, false otherwise
   */
  readonly debugger : boolean;

  /**
   * 1 or 2, for webgl and webgl2 respectively
   */
  readonly webglVersion : number;

  getGPUTimer() : GPUTimer;

  /**
   * @returns the delta on the last frame, in seconds.
   */
  getDelta() : number;

  /**
   * @returns a reference to this context's file loader.
   */
  getFileLoader() : FileLoader;

  /**
   * @returns a reference to this context's GLTF loader.
   * TODO: figure out how to organize our file loaders efficiently.
   */
  getGLTFLoader() : GLTFLoader;

  /**
   * Grabs a GL extension from the GL context, if available. Otherwise, returns null.
   * @param name - name of desired GL extension.
   * @returns the extension if available, or null.
   */
  getGLExtension<T>(name: string) : T;

  // kick it into gear

  // common shortcuts
  getGLExtension(name: "OES_texture_float")               : OES_texture_float               | null;
  getGLExtension(name: "OES_texture_float_linear")        : OES_texture_float_linear        | null;
  getGLExtension(name: "OES_element_index_uint")          : OES_element_index_uint          | null;
  getGLExtension(name: "WEBGL_depth_texture")             : WEBGL_depth_texture             | null;
  getGLExtension(name: "ANGLE_instanced_arrays")          : ANGLE_instanced_arrays          | null;
  getGLExtension(name: "EXT_shader_texture_lod")          : EXT_shader_texture_lod          | null;
  getGLExtension(name: "OES_standard_derivatives")        : OES_standard_derivatives        | null;
  getGLExtension(name: "WEBGL_color_buffer_float")        : WEBGL_color_buffer_float        | null;
  getGLExtension(name: "EXT_disjoint_timer_query_webgl2") : EXT_disjoint_timer_query_webgl2 | null;
  getGLExtension(name: "OES_texture_half_float")          : OES_texture_half_float          | null;
  getGLExtension(name: "OES_texture_half_float_linear")   : OES_texture_half_float_linear   | null;
  getGLExtension(name: "EXT_color_buffer_half_float")     : EXT_color_buffer_half_float     | null;
  /**
   * @returns the present GL rendering context.
   */
  getGLContext() : WebGLRenderingContext | WebGL2RenderingContext;

  /**
   * @returns a GLContext which mirrors GL state.
   */
  getGL() : GLContextI;

  registerInstancedModel(model: InstancedModel) : void;

  /**
   * @returns the XY size of the window, in pixels
   */
  getScreenDims() : [number, number];

  // circular dependency between gamecontext and scene
  // swap to a scene interface and use that here instead?
  // in cpp i think i was able to forward declare the scene for the interface
  // and then use the actual class in impl

  // import type { ... } works fine i guess!

  /**
   * @param scene - The scene which will be loaded.
   */
  loadNewScene(scene: Scene) : SceneSwap;

  /**
   *  Stores a variable in this context's environment
   *  @param key - the key used to identify the desired environment variable.
   *  @param value - the value associated with key.
   *  @param opts - optional params affecting some vars.
   */ 
  setContextVar(key: string, value: any, opts?: {shaderInteger: boolean}) : void;

  /**
   *  Fetches a variable from this context.
   *  @param key - the key associated with the desired var.
   *  @returns the associated environment var, or null if DNE.
   */ 
  getContextVar(key: string) : any;
  // template this function??
  
  /**
   *  @returns a list of glsl #defines for all environment variables prefixed
   *  with `SHADER_`.
   */ 
  getShaderEnv() : string;
}
