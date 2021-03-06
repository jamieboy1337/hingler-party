/**
 * Wrapper which obscures implementation details in favor of a general interface.
 */
export interface FileLike {
  readonly fail: boolean;
  // returns the file's contents as a string.
  asString() : string;

  // returns the file's contents as an ArrayBuffer.
  asArrayBuffer() : ArrayBuffer;

  waitUntilReady() : Promise<FileLike>;
}