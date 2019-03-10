module.exports = (eleventyConfig) => {
  eleventyConfig.addFilter('displayPublished', (published) => {
    const [year, month, date] = published.split('-').map(Number)
    return `${year}年${month}月${date}日`
  })

  eleventyConfig.addPassthroughCopy('src/avator.png')
  eleventyConfig.addPassthroughCopy('src/build')
  eleventyConfig.addPassthroughCopy('src/slides')

  return {
    dir: {
      input: 'src',
      output: 'dist',
    },
    passthroughFileCopy: true,
  }
}
