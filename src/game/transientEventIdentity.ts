export class MonotonicTransientId {
  private nextValue = 1
  private readonly prefix: string

  constructor(prefix: string) {
    this.prefix = prefix
  }

  next() {
    const id = `${this.prefix}-${this.nextValue}`
    this.nextValue += 1
    return id
  }

  reset() {
    this.nextValue = 1
  }
}
