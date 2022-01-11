import { UnixFS } from 'ipfs-unixfs'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import * as pb from '@ipld/dag-pb'
import { File } from '@web-std/file'
import { importer } from './importer.js'

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {{ cid: CID, bytes?: Uint8Array }} Block
 */

class UnixFsEntity {
  constructor (name, size) {
    this.name = name
    this.size = size
  }

  /**
   * Determine if this part of the tree needs to be flushed.
   */
  dirty () {
    return false
  }

  /**
   * Return the blocks that have not yet been flushed from this DAG.
   * @returns {AsyncIterable<Block>}
   */
  async * flush () {}
}

export class UnixFsFile extends UnixFsEntity {
  /**
   * @param {File} file 
   */
  constructor (file) {
    super(file.name, file.size)
    /**
     * @private
     */
    this._file = file
    /**
     * Set after flush.
     * @type {CID|null}
     * @private
     */
    this._cid = null
  }

  dirty () {
    return this._cid == null
  }

  async * flush () {
    if (!this.dirty() && this._cid) {
      yield { cid: this._cid }
      return
    }
    const blocks = importer(this._file)
    let block
    for await (block of blocks) {
      yield block
    }
    this._cid = block.cid
  }
}

export class UnixFsDir extends UnixFsEntity {
  constructor (name) {
    super(name, 0)
    /**
     * @type {UnixFsEntity[]}
     * @private
     */
    this._entries = []
    /**
     * Set after flush.
     * @type {CID|null}
     * @private
     */
    this._cid = null
  }

  /**
   * Add an entry to this directory.
   * @param {File|UnixFsFile|UnixFsDir} entity
   * @returns {UnixFsDir}
   */
  append (entity) {
    if (entity instanceof File) {
      entity = new UnixFsFile(entity)
    }
    if (!(entity instanceof UnixFsFile) && !(entity instanceof UnixFsDir)) {
      throw new Error('not a File, UnixFsFile or a UnixFsDir')
    }
    this._entries.push(entity)
    this._cid = null
    return this
  }

  dirty () {
    if (!this._cid) {
      return true
    }
    for (const entry of this._entries) {
      if (entry.dirty()) return true
    }
    return false
  }

  async * flush () {
    if (!this.dirty() && this._cid) {
      yield { cid: this._cid }
      return
    }

    const links = []
    for (let i = 0; i < this._entries.length; i++) {
      const entry = this._entries[i]
      let block
      for await (block of entry.flush()) {
        if (!block.bytes) continue
        yield block
      }
      links.push(pb.createLink(entry.name, entry.size, block.cid))
    }

    const data = new UnixFS({ type: 'directory' })
    const node = pb.createNode(data.marshal(), links)
    const block = await Block.encode({ value: node, codec: pb, hasher: sha256 })
    this._cid = block.cid
    yield block
  }
}
