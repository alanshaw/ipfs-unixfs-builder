import test from 'ava'
import { File } from '@web-std/file'
import * as pb from '@ipld/dag-pb'
import * as raw from 'multiformats/codecs/raw'
import { UnixFsDir } from './index.js'

test('should work', async t => {
  const docs = new UnixFsDir('documents')

  docs.append(new File([JSON.stringify({ hello: 'world' })], 'test.json'))

  // All the blocks so far...
  let rootBlock
  for await (const block of docs.flush()) {
    // last block is the root
    rootBlock = block
    printBlock(block)
  }

  t.is(rootBlock.cid.code, pb.code)
  const rootNode = pb.decode(rootBlock.bytes)
  t.is(rootNode.Links.length, 1)
  t.is(rootNode.Links[0].Name, 'test.json')

  const pics = new UnixFsDir('pictures')

  pics.append(new File(['😁'], 'smile.png'))
  pics.append(new File(['🤖'], 'robot.png'))
  pics.append(new File(['🚗'], 'red-car.png'))

  // Add the pictures directory to the documents directory!
  docs.append(pics)

  // Just the new bits, up to the root directory
  let newRootBlock
  for await (const block of docs.flush()) {
    // last block is the root
    newRootBlock = block
    printBlock(block)
  }

  t.is(newRootBlock.cid.code, pb.code)
  const newRootNode = pb.decode(newRootBlock.bytes)
  t.is(newRootNode.Links.length, 2)
  t.true(newRootNode.Links.some(l => l.Name === 'test.json'))
  t.true(newRootNode.Links.some(l => l.Name === 'pictures'))
})

function printBlock (block) {
  if (block.cid.code === pb.code) {
    const node = pb.decode(block.bytes)
    console.log(`${block.cid} (dag-pb)`, node.Data)
    node.Links.forEach(l => console.log(`    - ${l.Hash} ${l.Name} (${l.Tsize})`))
  } else if (block.cid.code === raw.code) {
    console.log(`${block.cid} (raw)`, block.bytes)
  } else {
    console.log(`${block.cid} (unknown)`, block.bytes)
  }
}
