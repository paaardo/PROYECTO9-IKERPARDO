const puppeteer = require('puppeteer')
const fs = require('fs')

;(async () => {
  const navegador = await puppeteer.launch({ headless: false })
  const pagina = await navegador.newPage()
  const productos = []
  let numeroPagina = 1
  const maxPaginas = 2

  while (numeroPagina <= maxPaginas) {
    try {
      const url = `https://www.newegg.com/p/pl?d=laptop&page=${numeroPagina}`
      console.log(`Navegando a: ${url}`)
      await pagina.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

      await pagina.evaluate(() => {
        const botonAceptarCookies = document.querySelector(
          '.osano-cm-accept-all'
        )
        if (botonAceptarCookies) {
          botonAceptarCookies.click()
        } else {
          const bannerCookies = document.querySelector(
            '[aria-label="Banner de consentimiento de cookies"]'
          )
          if (bannerCookies) {
            bannerCookies.remove()
          }
        }
      })

      await pagina.waitForSelector('.item-cell', { timeout: 60000 })

      const html = await pagina.content()
      fs.writeFileSync(`pagina${numeroPagina}.html`, html)

      const nuevosProductos = await pagina.evaluate(() => {
        const elementos = document.querySelectorAll('.item-cell')
        return Array.from(elementos).map((elemento) => {
          const nombreElemento = elemento.querySelector('.item-title')
          const nombre = nombreElemento ? nombreElemento.innerText : 'N/A'
          const precioElemento = elemento.querySelector('.price-current strong')
          const precio = precioElemento ? precioElemento.innerText : 'N/A'
          const imagenElemento = elemento.querySelector('.item-img img')
          const imagen = imagenElemento ? imagenElemento.src : 'N/A'
          return { nombre, precio, imagen }
        })
      })

      console.log(`Productos en la página ${numeroPagina}:`, nuevosProductos)

      productos.push(...nuevosProductos)

      if (numeroPagina < maxPaginas) {
        await pagina.evaluate(() => {
          const botonSiguientePagina = document.querySelector(
            '.btn-group-cell a[title="Next"]'
          )
          if (botonSiguientePagina) {
            botonSiguientePagina.click()
          }
        })
        await pagina.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: 60000
        })
        numeroPagina++
      } else {
        break
      }
    } catch (error) {
      console.error(`Error en la página ${numeroPagina}:`, error)
      break
    }
  }

  if (productos.length > 0) {
    fs.writeFileSync('productos.json', JSON.stringify(productos, null, 2))
    console.log('Scraping completo. Datos guardados en productos.json')
  } else {
    console.log('No se encontraron productos.')
  }

  console.log('Esperando 10 segundos antes de cerrar el navegador...')
  await new Promise((resolver) => setTimeout(resolver, 10000))

  await navegador.close()
})()
