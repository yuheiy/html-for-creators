const fs = require('fs')

const indenters = [' ', ' ', '　']

const isListitem = (line) => {
  return indenters.some((indent) => line.startsWith(indent))
}

const getIndentLevel = (line) => {
  let level = 0
  while (isListitem(line.slice(level))) {
    level++
  }
  return level
}

const getText = (listitemline) => {
  const level = getIndentLevel(listitemline)
  return listitemline.slice(level)
}

const sbBody = fs
  .readFileSync('sb.txt', 'utf8')
  .split('\n')
  .slice(1)
  .filter(isListitem)

const formatted = []

sbBody.forEach((line) => {
  const level = getIndentLevel(line)
  if (level === 1) {
    formatted.push([getText(line)])
  } else {
    formatted[formatted.length - 1].push(getText(line))
  }
})

fs.writeFileSync('slides.json', JSON.stringify(formatted))
