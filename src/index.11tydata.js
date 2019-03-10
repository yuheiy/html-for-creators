const path = require('path')
const fs = require('fs')
const globby = require('globby')
const yaml = require('js-yaml')

module.exports = async () => {
  const metadata = yaml.safeLoad(fs.readFileSync('metadata.yaml', 'utf8'))
  const images = (await globby('src/slides/*.png', {
    transform: (entry) => path.relative('src', entry),
  })).sort()
  const slides = JSON.parse(fs.readFileSync('slides.json')).map(
    ([alt, ...notes], index) => {
      const src = images[index]
      return {
        id: path.parse(src || '').name,
        image: {
          src,
          alt,
        },
        notes,
      }
    },
  )

  return {
    ...metadata,
    slides,
  }
}
