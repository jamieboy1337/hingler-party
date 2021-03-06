export interface Accessor {
  bufferView: number,
  byteOffset?: number,
  normalized?: boolean,
  componentType: number,
  count: number,
  min?: Array<number>,
  max?: Array<number>,
  type: GLTFAccessorType
};

export interface BufferView {
  buffer: number,
  byteLength: number,
  byteOffset?: number,
  byteStride?: number
};

export interface Buffer {
  byteLength: number
}

export interface GLTFNode extends GLTFNodeReadOnly {
  name?: string,
  rotation?: [number, number, number, number],
  translation?: [number, number, number],
  scale?: [number, number, number],
  mesh?: number,
  skin?: number,
  children?: Array<number>
}

export interface GLTFNodeReadOnly {
  readonly name?: string,
  readonly rotation?: [number, number, number, number],
  readonly translation?: [number, number, number],
  readonly scale?: [number, number, number],
  readonly mesh?: number,
  readonly skin?: number,
  readonly children?: Array<number>
}

export interface Primitive {
  indices: number,
  material: number,
  attributes: {
    POSITION: number,
    NORMAL?: number,
    TANGENT?: number,
    TEXCOORD_0?: number,
    TEXCOORD_1?: number,
    COLOR_0?: number,
    JOINTS_0?: number,
    WEIGHTS_0?: number
  }
}

export interface Mesh {
  name: string,
  primitives: Array<Primitive>
}

// TODO: handling defaults?
export interface Sampler {
  magFilter?: number,
  minFilter?: number,
  wrapS?: number,
  wrapT?: number,
  name?: string
};

export interface ImageSchema {
  mimeType?: string;
  bufferView?: number;
  name: string;
}

export interface TextureSchema {
  sampler: number,
  source: number
};

export interface TextureInfoSchema {
  index: number;
}

export interface PBRMaterialSchema {
  baseColorFactor?: [number, number, number, number],
  baseColorTexture?: TextureInfoSchema,
  metallicFactor?: number,
  roughnessFactor?: number,
  metallicRoughnessTexture?: TextureInfoSchema
};

export interface MatNormalTexture {
  index: number,
  // ignore this for now
  texcoord: number,
  scale: number
}

export interface Material {
  name?: string,
  pbrMetallicRoughness: PBRMaterialSchema,
  emissiveFactor?: [number, number, number],
  normalTexture?: MatNormalTexture
};

export interface GLTFSkin {
  inverseBindMatrices?: number,
  skeleton?: number,
  joints: Array<number>;
}

export interface GLTFAnimation {
  name?: string,
  channels: Array<GLTFAnimationChannel>,
  samplers: Array<GLTFAnimationSampler>
};

export interface GLTFAnimationChannel {
  sampler: number,
  target: GLTFAnimationChannelTarget
}

export interface GLTFAnimationSampler {
  input: number,
  interpolation: GLTFSamplerInterpolation,
  output: number
};

export interface GLTFAnimationChannelTarget {
  path: GLTFTargetPathType,
  node: number
}

export enum GLTFTargetPathType {
  TRANSLATION = "translation",
  ROTATION = "rotation",
  SCALE = "scale"
}

export enum GLTFAccessorType {
  SCALAR = "SCALAR",
  VEC2 = "VEC2",
  VEC3 = "VEC3",
  VEC4 = "VEC4"
}

export enum GLTFSamplerInterpolation {
  LINEAR = "LINEAR"
}

// handle optional params
export interface GLTFJson {
  accessors?: Array<Accessor>,
  animations?: Array<GLTFAnimation>,
  buffers?: Array<Buffer>,
  bufferViews?: Array<BufferView>,
  images?: Array<ImageSchema>,
  materials?: Array<Material>,
  meshes?: Array<Mesh>,
  nodes?: Array<GLTFNode>,
  samplers?: Array<Sampler>,
  skins?: Array<GLTFSkin>,
  textures?: Array<TextureSchema>
};