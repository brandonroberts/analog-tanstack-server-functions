export function createClientRpc(functionId: string) {
  const url = `${process.env['TSS_SERVER_FN_BASE']}/${functionId}`

  const fn = async (...args: any[]) => {
    const res = await fetch(url, {
      method: 'GET',
      // You'll likely want to use a better serializer here
      // body: JSON.stringify(args),
    })

    return await res.json()
  }

  // You can also assign any other properties you want to the function
  // for things like form actions, or debugging
  Object.assign(fn, {
    url: url,
  })

  return fn
}