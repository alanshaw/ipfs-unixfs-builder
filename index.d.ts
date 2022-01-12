import type { CID } from 'multiformats'

export interface Block {
  cid: CID
  bytes?: Uint8Array
}

export class UnixFsEntity {
  constructor(name: string, size: string)
  name: string
  size: number
  /**
   * Determine if this part of the tree needs to be flushed.
   */
  dirty(): boolean
  /**
   * Return the blocks that have not yet been flushed from this DAG.
   * 
   * Note: flushing a clean (already flushed) `UnixFsDir` or `UnixFsFile` will
   * return an iterator of just one "flushed" block. It has a `cid` but no
   * `bytes`.
   */
  flush(): AsyncIterable<Block>
}

export class UnixFsFile extends UnixFsEntity {
  constructor(file: File)
}

export class UnixFsDir extends UnixFsEntity {
  constructor(name: string)
  /**
   * Add an entry to this directory.
   */
  append(entity: File|UnixFsFile|UnixFsDir): UnixFsDir
  /**
   * The entries that make up this directory.
   */
  entries: UnixFsEntity[]
}
