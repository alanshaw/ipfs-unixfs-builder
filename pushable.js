import FIFO from 'p-fifo'
import defer from 'p-defer'

export function Pushable () {
  const fifo = new FIFO()
  let errorPromise, returnPromise

  return {
    [Symbol.asyncIterator] () {
      return this
    },
    next: async () => {
      errorPromise = defer()
      returnPromise = defer()
      let res
      try {
        res = await Promise.race([
          errorPromise.promise,
          returnPromise.promise,
          fifo.shift()
        ])
      } finally {
        errorPromise = returnPromise = null
      }
      return res
    },
    return: async () => {
      returnPromise && returnPromise.resolve({ done: true })
      return { done: true }
    },
    throw: async err => {
      errorPromise && errorPromise.reject(err)
      return { done: true }
    },
    push: value => fifo.push({ value }),
    end: async err => {
      if (err) {
        errorPromise && errorPromise.reject(err)
        return
      }
      return fifo.push({ done: true })
    }
  }
}