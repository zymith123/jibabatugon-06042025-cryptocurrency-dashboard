export interface Holding {
  symbol: string
  price: number
  quantity: number
  total: number
}

export function usePortfolio() {
  const cryptoOnHold = useState<Holding[]>('cryptoOnHold', () => [])

  const addCrpyto = (symbol: string, price: number, quantity: number, total: number) => {
    const newAddedCrypto = {
      symbol: symbol,
      price: price,
      quantity: quantity,
      total: total
    }
    cryptoOnHold.value.push(newAddedCrypto)
  }

  const removeCrypto = (index: number) => {
    cryptoOnHold.value.splice(index, 1)
  }

  return {
    cryptoOnHold,
    addCrpyto,
    removeCrypto,
  }
}
