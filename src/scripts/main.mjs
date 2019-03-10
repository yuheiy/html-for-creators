import mitt from 'mitt'
import createStore from 'unistore'

const createTimer = () => {
  const emitter = mitt()
  let accumulatedMs = 0
  let startedMs = null
  let requestId = null

  const loop = () => {
    requestId = requestIdleCallback(loop)

    const elapsedMsFromStartedMs = performance.now() - startedMs
    const totalMs = accumulatedMs + elapsedMsFromStartedMs
    emitter.emit('update', totalMs)
  }

  return {
    start: () => {
      if (startedMs) {
        return
      }

      requestId = requestIdleCallback(loop)

      startedMs = performance.now()
    },

    stop: () => {
      if (!startedMs) {
        return
      }

      cancelIdleCallback(requestId)
      requestId = null

      const elapsedMsFromStartedMs = performance.now() - startedMs
      accumulatedMs += elapsedMsFromStartedMs
      startedMs = null
    },

    reset: () => {
      if (accumulatedMs) {
        accumulatedMs = 0
      }

      if (startedMs) {
        startedMs = performance.now()
        return
      }

      emitter.emit('update', accumulatedMs)
    },

    onUpdate: (handler) => {
      emitter.on('update', handler)
    },
  }
}

const routes = new Map()

routes.set('presenter', (containerElement) => {
  const $ = (selector) => containerElement.querySelector(selector)
  const $$ = (selector) => [...containerElement.querySelectorAll(selector)]

  // Slide
  {
    const store = createStore({
      selectedIndex: 0,
      isUpwardVisible: false,
      isDownwardVisible: false,
      isPlaying: false,
    })

    let slideshowWindow = null

    const getNextToSelectedState = () => {
      const selectedSlideElement = $('.js-slide.selected')
      const rect = selectedSlideElement.firstElementChild.getBoundingClientRect()
      const distanceToLowerSideFromUpperSideOfViewport = rect.bottom
      const distanceToUpperSideFromLowerSideOfViewport =
        $('.js-main').clientHeight - rect.top
      const isUpwardVisible = distanceToLowerSideFromUpperSideOfViewport < 0
      const isDownwardVisible = distanceToUpperSideFromLowerSideOfViewport < 0

      return {
        isUpwardVisible,
        isDownwardVisible,
      }
    }

    $$('[name="slide"]').forEach((element, index) => {
      element.addEventListener('change', () => {
        store.setState({ selectedIndex: index })
        store.setState(getNextToSelectedState())
      })
    })

    $('.js-main').addEventListener(
      'scroll',
      () => {
        store.setState(getNextToSelectedState())
      },
      {
        passive: true,
      },
    )

    $$('.js-to-selected').forEach((element) => {
      element.addEventListener('click', () => {
        const selectedSlideElement = $('.js-slide.selected')
        selectedSlideElement.focus()
      })
    })

    $('.js-slideshow').addEventListener('click', (event) => {
      if (slideshowWindow == null || slideshowWindow.closed) {
        slideshowWindow = window.open(
          event.currentTarget.href,
          event.currentTarget.target,
          'titlebar=yes',
        )
        store.setState({ isPlaying: true })
      } else {
        slideshowWindow.focus()
      }

      event.preventDefault()
    })

    const render = ({
      selectedIndex,
      isUpwardVisible,
      isDownwardVisible,
      isPlaying,
    }) => {
      if (slideshowWindow) {
        slideshowWindow.postMessage(selectedIndex, location.origin)
      }

      $(`[name="slide"][value="${selectedIndex + 1}"]`).checked = true

      $$('.js-slide').forEach((element, index) => {
        const isSelected = selectedIndex === index
        element.classList.toggle('selected', isSelected)
      })

      $('.js-to-selected-upward').hidden = !isUpwardVisible
      $('.js-to-selected-downward').hidden = !isDownwardVisible

      $('.js-slideshow').href = `./?view=slideshow&page=${selectedIndex}`

      if (isPlaying) {
        $('.js-slideshow-text').textContent = $(
          '.js-slideshow-text',
        ).dataset.playingText
      }
    }

    store.subscribe(render)
    render(store.getState())
  }

  // Timer
  {
    const store = createStore({
      timerType: 'silent', // 'up' | 'silent'
      elapsedMs: 0,
    })

    const timer = createTimer()

    timer.onUpdate((elapsedMs) => {
      const currentMs = Math.trunc(store.getState().elapsedMs / 1000)
      const nextMs = Math.trunc(elapsedMs / 1000)

      if (currentMs !== nextMs) {
        store.setState({ elapsedMs })
      }
    })

    $$('[name="timer"]').forEach((element) => {
      let changeState

      switch (element.value) {
        case 'up':
          changeState = timer.start
          break

        case 'silent':
          changeState = timer.stop
          break
      }

      element.addEventListener('change', () => {
        store.setState({ timerType: element.value })
        changeState()
      })
    })

    $('.js-timer-reset').addEventListener('click', () => {
      timer.reset()
    })

    const render = ({ timerType, elapsedMs }) => {
      const minutes = String(Math.trunc(elapsedMs / 1000 / 60)).padStart(2, 0)
      const seconds = String(Math.trunc(elapsedMs / 1000) % 60).padStart(2, 0)
      $('.js-timer-elapsedTime').textContent = `${minutes}:${seconds}`

      $(`[name="timer"][value="${timerType}"]`).checked = true
    }

    store.subscribe(render)
    render(store.getState())
  }
})

routes.set('slideshow', (containerElement) => {
  const $$ = (selector) => [...containerElement.querySelectorAll(selector)]

  const params = new URLSearchParams(location.search)
  const initialSelectedIndex = Number(params.get('page'))

  const store = createStore({
    selectedIndex: Number.isInteger(initialSelectedIndex)
      ? initialSelectedIndex
      : 0,
  })

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) {
      return
    }

    if (typeof event.data === 'number') {
      store.setState({ selectedIndex: event.data })
    }
  })

  window.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'f': {
        document.documentElement.requestFullscreen()
        break
      }

      case 'Escape': {
        document.exitFullscreen()
        break
      }

      case 'ArrowRight': {
        const { selectedIndex } = store.getState()
        const isLastSelected = selectedIndex === $$('.js-slide').length - 1

        if (isLastSelected) {
          return
        }

        store.setState({ selectedIndex: selectedIndex + 1 })
        break
      }

      case 'ArrowLeft': {
        const { selectedIndex } = store.getState()
        const isFirstSelected = selectedIndex === 0

        if (isFirstSelected) {
          return
        }

        store.setState({ selectedIndex: selectedIndex - 1 })
        break
      }
    }
  })

  const render = ({ selectedIndex }) => {
    $$('.js-slide').forEach((element, index) => {
      const isSelected = index === selectedIndex
      element.hidden = !isSelected
    })
  }

  store.subscribe(render)
  render(store.getState())
})

const main = () => {
  const params = new URLSearchParams(location.search)
  const viewType = params.get('view')
  const start = routes.get(viewType)

  if (!start) {
    return
  }

  document.querySelector('#guest').hidden = true

  const containerElement = document.querySelector(`#${viewType}`)
  containerElement.hidden = false
  start(containerElement)
}

main()
