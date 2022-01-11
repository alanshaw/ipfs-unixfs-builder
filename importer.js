import { importer as unixFsImporter } from 'ipfs-unixfs-importer'
import { Pushable } from './pushable.js'

const importerOptions = {
  cidVersion: 1,
  rawLeaves: true,
  maxChunkSize: 1048576,
  maxChildrenPerNode: 1024
}

/**
 * A UnixFS importer that spits out blocks instead of entries.
 * @param {File} file
 * @returns {AsyncIterable<import('./index').Block>}
 */
export function importer (file) {
  const blocks = Pushable()
  const blockstore = {
    async put(cid, bytes) {
      await blocks.push({ cid, bytes })
    }
  }
  ;(async () => {
    const source = [{ path: file.name, content: file.stream() }]
    try {
      for await (const _ of unixFsImporter(source, blockstore, importerOptions)) {}
      blocks.end()
    } catch (err) {
      blocks.end(err)
    }
  })()
  return blocks
}