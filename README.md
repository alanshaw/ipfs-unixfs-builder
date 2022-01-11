# ipfs-unixfs-builder

Build an IPFS UnixFS DAG.

A simple append only interface that constructs a DAG that can be incrementally "flushed" (obtain a CAR file of the changed bits) to free up memory and allow for the creation of DAGs of arbitrary size that are not bounded by memory or disk.

## Usage

```js
import { UnixFsDir } from 'ipfs-unixfs-builder'

const docs = new UnixFsDir('documents')

// Only append, this is how we can keep memory usage low,
// once flushed, we can discard all but the root CID (for files)
// or the root CID + the entry CIDs (for directories).
docs.append(new File())

// All the blocks so far...
for await (const block of docs.flush()) {
  // last block is the root
  console.log(block.cid, block.bytes)
}

const pics = new UnixFsDir('pictures')

pics.append(new File())
pics.append(new File())
pics.append(new File())

// Add the pictures directory to the documents directory!
docs.append(pics)

// Just the new bits, up to the root directory
for await (const block of docs.flush()) {
  // last block is the root
  console.log(block.cid, block.bytes)
}
```

Note: flushing a clean (already flushed) `UnixFsDir` or `UnixFsFile` will return an iterator of just one "flushed" block. It has a `cid` but no `bytes`.

The idea is that you add files/directories to the builder and when you've added files that exceed a certain size (1GB for example) you call `flush()` to chunk and hash everything added so far. This gives you a list of blocks, which you can write to disk, or create a CAR file and upload to NFT.Storage/Web3.Storage, allowing the used memory to be reclaimed. You can then add more and more files to the builder and eventually call `flush()` again. This time you'll only get blocks for the new bits (and the bits that changed).

⚠️ WARNING: does not support directory sharding, so it is possible to create directories that bigger than the maximum block size that IPFS will transfer across the network.
