export function usePortfolio() {
  const cryptoOnHold = useState('cryptoOnHold', ()=>[])

  const addCrpyto = (symbol: string, price: number, quantity: number, total: number) => {
    const newAddedCrypto = {
      symbol: symbol,
      price: price,
      quantity: quantity,
      total: total
    }
    cryptoOnHold.value.push(newAddedCrypto)
  }

  return {
    cryptoOnHold,
    addCrpyto
  }
}