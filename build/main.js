//      
// An event handler can take an optional event argument
// and should not return a value
                                          
                                                               

// An array of all currently registered event handlers for a type
                                            
                                                            
// A map of event types and their corresponding event handlers.
                        
                                 
                                   
  

/** Mitt: Tiny (~200b) functional event emitter / pubsub.
 *  @name mitt
 *  @returns {Mitt}
 */
function mitt(all                 ) {
	all = all || Object.create(null);

	return {
		/**
		 * Register an event handler for the given type.
		 *
		 * @param  {String} type	Type of event to listen for, or `"*"` for all events
		 * @param  {Function} handler Function to call in response to given event
		 * @memberOf mitt
		 */
		on: function on(type        , handler              ) {
			(all[type] || (all[type] = [])).push(handler);
		},

		/**
		 * Remove an event handler for the given type.
		 *
		 * @param  {String} type	Type of event to unregister `handler` from, or `"*"`
		 * @param  {Function} handler Handler function to remove
		 * @memberOf mitt
		 */
		off: function off(type        , handler              ) {
			if (all[type]) {
				all[type].splice(all[type].indexOf(handler) >>> 0, 1);
			}
		},

		/**
		 * Invoke all handlers for the given type.
		 * If present, `"*"` handlers are invoked after type-matched handlers.
		 *
		 * @param {String} type  The event type to invoke
		 * @param {Any} [evt]  Any value (object is recommended and powerful), passed to each handler
		 * @memberOf mitt
		 */
		emit: function emit(type        , evt     ) {
			(all[type] || []).slice().map(function (handler) { handler(evt); });
			(all['*'] || []).slice().map(function (handler) { handler(type, evt); });
		}
	};
}

function n(n,t){for(var r in t)n[r]=t[r];return n}function createStore(t){var r=[];function u(n){for(var t=[],u=0;u<r.length;u++)r[u]===n?n=null:t.push(r[u]);r=t;}function e(u,e,f){t=e?u:n(n({},t),u);for(var i=r,o=0;o<i.length;o++)i[o](t,f);}return t=t||{},{action:function(n){function r(t){e(t,!1,n);}return function(){for(var u=arguments,e=[t],f=0;f<arguments.length;f++)e.push(u[f]);var i=n.apply(this,e);if(null!=i)return i.then?i.then(r):r(i)}},setState:e,subscribe:function(n){return r.push(n),function(){u(n);}},unsubscribe:u,getState:function(){return t}}}

const createTimer = () => {
  const emitter = mitt();
  let accumulatedMs = 0;
  let startedMs = null;
  let requestId = null;

  const loop = () => {
    requestId = requestIdleCallback(loop);

    const elapsedMsFromStartedMs = performance.now() - startedMs;
    const totalMs = accumulatedMs + elapsedMsFromStartedMs;
    emitter.emit('update', totalMs);
  };

  return {
    start: () => {
      if (startedMs) {
        return
      }

      requestId = requestIdleCallback(loop);

      startedMs = performance.now();
    },

    stop: () => {
      if (!startedMs) {
        return
      }

      cancelIdleCallback(requestId);
      requestId = null;

      const elapsedMsFromStartedMs = performance.now() - startedMs;
      accumulatedMs += elapsedMsFromStartedMs;
      startedMs = null;
    },

    reset: () => {
      if (accumulatedMs) {
        accumulatedMs = 0;
      }

      if (startedMs) {
        startedMs = performance.now();
        return
      }

      emitter.emit('update', accumulatedMs);
    },

    onUpdate: (handler) => {
      emitter.on('update', handler);
    },
  }
};

const routes = new Map();

routes.set('presenter', (containerElement) => {
  const $ = (selector) => containerElement.querySelector(selector);
  const $$ = (selector) => [...containerElement.querySelectorAll(selector)];

  // Slide
  {
    const store = createStore({
      selectedIndex: 0,
      isUpwardVisible: false,
      isDownwardVisible: false,
      isPlaying: false,
    });

    let slideshowWindow = null;

    const getNextToSelectedState = () => {
      const selectedSlideElement = $('.js-slide.selected');
      const rect = selectedSlideElement.firstElementChild.getBoundingClientRect();
      const distanceToLowerSideFromUpperSideOfViewport = rect.bottom;
      const distanceToUpperSideFromLowerSideOfViewport =
        $('.js-main').clientHeight - rect.top;
      const isUpwardVisible = distanceToLowerSideFromUpperSideOfViewport < 0;
      const isDownwardVisible = distanceToUpperSideFromLowerSideOfViewport < 0;

      return {
        isUpwardVisible,
        isDownwardVisible,
      }
    };

    $$('[name="slide"]').forEach((element, index) => {
      element.addEventListener('change', () => {
        store.setState({ selectedIndex: index });
        store.setState(getNextToSelectedState());
      });
    });

    $('.js-main').addEventListener(
      'scroll',
      () => {
        store.setState(getNextToSelectedState());
      },
      {
        passive: true,
      },
    );

    $$('.js-to-selected').forEach((element) => {
      element.addEventListener('click', () => {
        const selectedSlideElement = $('.js-slide.selected');
        selectedSlideElement.focus();
      });
    });

    $('.js-slideshow').addEventListener('click', (event) => {
      if (slideshowWindow == null || slideshowWindow.closed) {
        slideshowWindow = window.open(
          event.currentTarget.href,
          event.currentTarget.target,
          'titlebar=yes',
        );
        store.setState({ isPlaying: true });
      } else {
        slideshowWindow.focus();
      }

      event.preventDefault();
    });

    const render = ({
      selectedIndex,
      isUpwardVisible,
      isDownwardVisible,
      isPlaying,
    }) => {
      if (slideshowWindow) {
        slideshowWindow.postMessage(selectedIndex, location.origin);
      }

      $(`[name="slide"][value="${selectedIndex + 1}"]`).checked = true;

      $$('.js-slide').forEach((element, index) => {
        const isSelected = selectedIndex === index;
        element.classList.toggle('selected', isSelected);
      });

      $('.js-to-selected-upward').hidden = !isUpwardVisible;
      $('.js-to-selected-downward').hidden = !isDownwardVisible;

      $('.js-slideshow').href = `./?view=slideshow&page=${selectedIndex}`;

      if (isPlaying) {
        $('.js-slideshow-text').textContent = $(
          '.js-slideshow-text',
        ).dataset.playingText;
      }
    };

    store.subscribe(render);
    render(store.getState());
  }

  // Timer
  {
    const store = createStore({
      timerType: 'silent', // 'up' | 'silent'
      elapsedMs: 0,
    });

    const timer = createTimer();

    timer.onUpdate((elapsedMs) => {
      const currentMs = Math.trunc(store.getState().elapsedMs / 1000);
      const nextMs = Math.trunc(elapsedMs / 1000);

      if (currentMs !== nextMs) {
        store.setState({ elapsedMs });
      }
    });

    $$('[name="timer"]').forEach((element) => {
      let changeState;

      switch (element.value) {
        case 'up':
          changeState = timer.start;
          break

        case 'silent':
          changeState = timer.stop;
          break
      }

      element.addEventListener('change', () => {
        store.setState({ timerType: element.value });
        changeState();
      });
    });

    $('.js-timer-reset').addEventListener('click', () => {
      timer.reset();
    });

    const render = ({ timerType, elapsedMs }) => {
      const minutes = String(Math.trunc(elapsedMs / 1000 / 60)).padStart(2, 0);
      const seconds = String(Math.trunc(elapsedMs / 1000) % 60).padStart(2, 0);
      $('.js-timer-elapsedTime').textContent = `${minutes}:${seconds}`;

      $(`[name="timer"][value="${timerType}"]`).checked = true;
    };

    store.subscribe(render);
    render(store.getState());
  }
});

routes.set('slideshow', (containerElement) => {
  const $$ = (selector) => [...containerElement.querySelectorAll(selector)];

  const params = new URLSearchParams(location.search);
  const initialSelectedIndex = Number(params.get('page'));

  const store = createStore({
    selectedIndex: Number.isInteger(initialSelectedIndex)
      ? initialSelectedIndex
      : 0,
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) {
      return
    }

    if (typeof event.data === 'number') {
      store.setState({ selectedIndex: event.data });
    }
  });

  window.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'f': {
        document.documentElement.requestFullscreen();
        break
      }

      case 'Escape': {
        document.exitFullscreen();
        break
      }

      case 'ArrowRight': {
        const { selectedIndex } = store.getState();
        const isLastSelected = selectedIndex === $$('.js-slide').length - 1;

        if (isLastSelected) {
          return
        }

        store.setState({ selectedIndex: selectedIndex + 1 });
        break
      }

      case 'ArrowLeft': {
        const { selectedIndex } = store.getState();
        const isFirstSelected = selectedIndex === 0;

        if (isFirstSelected) {
          return
        }

        store.setState({ selectedIndex: selectedIndex - 1 });
        break
      }
    }
  });

  const render = ({ selectedIndex }) => {
    $$('.js-slide').forEach((element, index) => {
      const isSelected = index === selectedIndex;
      element.hidden = !isSelected;
    });
  };

  store.subscribe(render);
  render(store.getState());
});

const main = () => {
  const params = new URLSearchParams(location.search);
  const viewType = params.get('view');
  const start = routes.get(viewType);

  if (!start) {
    return
  }

  document.querySelector('#guest').hidden = true;

  const containerElement = document.querySelector(`#${viewType}`);
  containerElement.hidden = false;
  start(containerElement);
};

main();
//# sourceMappingURL=main.js.map
