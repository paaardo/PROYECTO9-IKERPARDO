const puppeteer = require('puppeteer')
const fs = require('fs')

;(async () => {
  const navegador = await puppeteer.launch({ headless: false })
  const pagina = await navegador.newPage()
  const productos = []

  let haySiguientePagina = true
  let indicePagina = 1

  while (haySiguientePagina) {
    try {
      const url = `https://www.newegg.com/p/pl?d=laptop&page=${indicePagina}`
      console.log(`Navegando a: ${url}`)
      await pagina.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })

      await pagina.evaluate(() => {
        const eliminarModales = () => {
          const selectoresModales = [
            '[class*="modal"]',
            '[class*="popup"]',
            '[class*="overlay"]'
          ]
          selectoresModales.forEach((selector) => {
            const modales = document.querySelectorAll(selector)
            modales.forEach((modal) => modal.remove())
          })
        }

        eliminarModales()

        const selectoresModalesAdicionales = ['.modal', '.popup', '.overlay']
        selectoresModalesAdicionales.forEach((selector) => {
          const modales = document.querySelectorAll(selector)
          modales.forEach((modal) => modal.remove())
        })
      })

      await pagina.waitForSelector('.item-cell', { timeout: 60000 })

      const html = await pagina.content()
      fs.writeFileSync(`pagina${indicePagina}.html`, html)

      const nuevosProductos = await pagina.evaluate(() => {
        const items = document.querySelectorAll('.item-cell')
        return Array.from(items).map((item) => {
          const elementoNombre = item.querySelector('.item-title')
          const nombre = elementoNombre ? elementoNombre.innerText : 'N/A'
          const elementoPrecio = item.querySelector('.price-current strong')
          const precio = elementoPrecio ? elementoPrecio.innerText : 'N/A'
          const elementoImagen = item.querySelector('.item-img img')
          const imagen = elementoImagen ? elementoImagen.src : 'N/A'
          return { nombre, precio, imagen }
        })
      })

      console.log(`Productos en la página ${indicePagina}:`, nuevosProductos)

      productos.push(...nuevosProductos)

      haySiguientePagina = await pagina.evaluate(() => {
        const botonSiguientePagina = document.querySelector('.btn-next')
        return (
          botonSiguientePagina &&
          !botonSiguientePagina.classList.contains('disabled')
        )
      })

      indicePagina++
    } catch (error) {
      console.error(`Error en la página ${indicePagina}:`, error)
      haySiguientePagina = false
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
