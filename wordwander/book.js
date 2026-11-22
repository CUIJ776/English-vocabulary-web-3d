const bookView = (() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const hasPerspective = CSS.supports('transform-style', 'preserve-3d');
  let pageTurn, catalogTurn, catalogReveal;

  function enableEntrance(open) {
    const poster = document.getElementById('book-poster');
    poster.addEventListener('click', open);
    if (!hasPerspective) return;

    const stage = document.getElementById('shelf-visual');
    const camera = document.getElementById('book-camera');
    const model = document.getElementById('book-model');
    const turn = document.getElementById('book-turn');
    const views = [
      {pitch:34, yaw:-13, roll:-5},
      {pitch:32, yaw:16, roll:5},
      {pitch:13, yaw:0, roll:0}
    ];
    let viewIndex = 0, currentView = views[0], drag, didDrag = false;

    function setView(view) {
      currentView = view;
      model.style.setProperty('--book-pitch', view.pitch + 'deg');
      model.style.setProperty('--book-yaw', view.yaw + 'deg');
      model.style.setProperty('--book-roll', view.roll + 'deg');
    }

    poster.hidden = true;
    camera.hidden = false;
    turn.hidden = false;
    stage.classList.add('has-book');
    turn.addEventListener('click', () => {
      viewIndex = (viewIndex + 1) % views.length;
      setView(views[viewIndex]);
    });
    document.getElementById('book-open').addEventListener('click', event => {
      if (!didDrag || event.detail === 0) open();
    });
    camera.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      didDrag = false;
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, view:currentView};
    });
    camera.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const x = event.clientX - drag.x;
      const y = event.clientY - drag.y;
      if (!didDrag) {
        if (Math.abs(x) < 6 || (event.pointerType !== 'mouse' && Math.abs(x) < Math.abs(y))) return;
        didDrag = true;
        camera.setPointerCapture(event.pointerId);
        stage.setAttribute('data-dragging', '');
      }
      const yaw = Math.max(-24, Math.min(24, drag.view.yaw + x * .2));
      const pitch = Math.max(12, Math.min(39, drag.view.pitch - y * .12));
      setView({pitch, yaw, roll:yaw * .23});
    });
    function stopDrag(event) {
      if (drag?.id !== event.pointerId) return;
      drag = undefined;
      stage.removeAttribute('data-dragging');
    }
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    camera.addEventListener('lostpointercapture', stopDrag);
  }

  function revealCatalog(stage) {
    if (reducedMotion.matches || !stage.animate) return;
    catalogReveal = stage.animate([
      {opacity:.35, transform:'translateY(15px) scale(.96)'},
      {opacity:1, transform:'translateY(0) scale(1)'}
    ], {duration:430, easing:'cubic-bezier(.22,.65,.3,1)'});
  }

  function enableCatalogRotation() {
    const catalog = document.getElementById('story-catalog');
    const stage = document.getElementById('catalog-stage');
    const book = document.getElementById('catalog-book');
    const rotate = document.getElementById('catalog-rotate');
    const topView = document.getElementById('catalog-view');
    const compact = matchMedia('(max-width: 680px)');
    if (!hasPerspective) {
      rotate.parentElement.hidden = true;
      document.getElementById('catalog-hint').hidden = true;
      return;
    }
    let drag;

    function readingView(value) {
      stage.dataset.view = value ? 'reading' : 'desk';
      topView.setAttribute('aria-pressed', String(value));
    }

    function rotationMode(value) {
      catalog.toggleAttribute('data-rotating', value);
      rotate.setAttribute('aria-pressed', String(value));
    }

    function limit(pitch, yaw) {
      const maxYaw = compact.matches ? 11 : 18;
      return {
        pitch:Math.max(3, Math.min(compact.matches ? 20 : 39, pitch)),
        yaw:Math.max(-maxYaw, Math.min(maxYaw, yaw))
      };
    }

    function pose() {
      const style = getComputedStyle(book);
      const value = axis => parseFloat(
        (stage.dataset.view !== 'reading' && style.getPropertyValue('--catalog-drag-' + axis)) ||
        style.getPropertyValue('--catalog-' + axis)
      );
      return limit(value('pitch'), value('yaw'));
    }

    function aim(pitch, yaw) {
      const next = limit(pitch, yaw);
      if (stage.dataset.view === 'reading') readingView(false);
      book.style.setProperty('--catalog-drag-pitch', next.pitch + 'deg');
      book.style.setProperty('--catalog-drag-yaw', next.yaw + 'deg');
      book.style.setProperty('--catalog-drag-roll', next.yaw * .14 + 'deg');
    }

    topView.addEventListener('click', () => {
      rotationMode(false);
      readingView(stage.dataset.view !== 'reading');
    });
    rotate.addEventListener('click', () => {
      const enable = !catalog.hasAttribute('data-rotating');
      rotationMode(enable);
      if (enable) {
        const current = pose();
        aim(Math.max(current.pitch, compact.matches ? 11 : 24), current.yaw > 0 ? -10 : 10);
      }
    });
    rotate.addEventListener('keydown', event => {
      if (!catalog.hasAttribute('data-rotating')) return;
      const step = {ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,5],ArrowDown:[0,-5]}[event.key];
      if (!step) return;
      event.preventDefault();
      event.stopPropagation();
      const current = pose();
      aim(current.pitch + step[1], current.yaw + step[0]);
    });
    book.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || event.shiftKey || event.target.closest('button,a') ||
          (event.pointerType !== 'mouse' && !catalog.hasAttribute('data-rotating'))) return;
      if (event.pointerType === 'mouse') event.preventDefault();
      drag = {id:event.pointerId, x:event.clientX, y:event.clientY, initial:pose()};
    });
    book.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const x = event.clientX - drag.x, y = event.clientY - drag.y;
      if (!stage.hasAttribute('data-dragging')) {
        if (Math.hypot(x, y) < 5) return;
        book.setPointerCapture(event.pointerId);
        stage.setAttribute('data-dragging', '');
      }
      aim(drag.initial.pitch - y * .16, drag.initial.yaw + x * .16);
    });
    function stopDrag(event) {
      if (drag?.id !== event.pointerId) return;
      drag = undefined;
      stage.removeAttribute('data-dragging');
    }
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    book.addEventListener('lostpointercapture', stopDrag);
  }

  function clearPageTurn() {
    if (!pageTurn) return;
    pageTurn.animation.cancel();
    pageTurn.sheet.remove();
    pageTurn = undefined;
  }

  function turnPage(frame, outgoing, backwards) {
    clearPageTurn();
    if (!outgoing || !hasPerspective || reducedMotion.matches || !frame.animate) return;

    const sheet = document.createElement('div');
    sheet.className = 'scene-turn';
    sheet.setAttribute('aria-hidden', 'true');
    const front = document.createElement('img');
    front.className = 'scene-image scene-turn-front';
    front.alt = '';
    front.src = outgoing;
    const back = document.createElement('div');
    back.className = 'scene-turn-back';
    sheet.append(front, back);
    frame.append(sheet);

    // Front and back are separate faces of a sheet hinged at the book's gutter.
    const direction = backwards ? 1 : -1;
    sheet.style.transformOrigin = backwards ? 'right center' : 'left center';
    const animation = sheet.animate([
      {transform: 'perspective(1000px) rotateY(0deg) translateZ(1px)'},
      {transform: `perspective(1000px) rotateY(${direction * 54}deg) translateZ(8px)`, offset: .62},
      {transform: `perspective(1000px) rotateY(${direction * 154}deg) translateZ(1px)`}
    ], {duration: 620, easing: 'cubic-bezier(.45,.22,.45,1)', fill: 'both'});
    pageTurn = {sheet, animation};
    animation.finished.then(() => {
      sheet.remove();
      if (pageTurn?.sheet === sheet) pageTurn = undefined;
    }, () => sheet.remove());
  }

  function copyPage(page) {
    const copy = page.cloneNode(true);
    copy.removeAttribute('id');
    copy.removeAttribute('aria-labelledby');
    copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    const style = getComputedStyle(page);
    for (const property of ['--catalog-tint', '--catalog-tag']) {
      copy.style.setProperty(property, style.getPropertyValue(property));
    }
    return copy;
  }

  function pageFace(page, side, offset) {
    const face = document.createElement('div');
    face.className = 'catalog-turn-face catalog-turn-' + side;
    const copy = page.cloneNode(true);
    // The 1px overlap hides antialiasing at the shared facet edges.
    copy.style.left = 1 - offset + 'px';
    face.append(copy);
    return face;
  }

  function bendLeaf(sheet, width, front, back, direction, duration, slope) {
    const count = width < 360 ? 14 : 20;
    const step = width / count;
    const strips = [];
    sheet.style.setProperty('--turn-width', width + 'px');
    for (let i = 0; i < count; i++) {
      const strip = document.createElement('div');
      strip.className = 'catalog-turn-strip';
      strip.style.width = step + 'px';
      const distanceFromLeft = (direction > 0 ? i : count - i - 1) * step;
      strip.append(pageFace(front, 'front', distanceFromLeft),
        pageFace(back, 'back', width - step - distanceFromLeft));
      sheet.append(strip);
      strips.push({strip, frames:[]});
    }
    // The edge starts moving before the spine. Integrating each facet keeps the
    // paper attached and the same length while it curls and settles.
    const intervals = 30;
    for (let frame = 0; frame <= intervals; frame++) {
      const progress = frame / intervals;
      const lead = .26 * Math.sin(Math.PI * progress);
      let x = 0, z = .5;
      strips.forEach(({frames}, i) => {
        const reach = (i + .5) / count;
        const t = Math.max(0, Math.min(1, (progress + lead * reach ** 1.6 - .02) / .94));
        const angle = slope + (Math.PI - 2 * slope) * t * t * (3 - 2 * t);
        const rise = Math.sin(angle);
        const lifted = Math.max(0, rise - Math.sin(slope));
        frames.push({
          transform: `translate3d(${x}px,0,${z}px) rotateY(${-direction * angle}rad)`,
          '--turn-shade': (.23 * lifted * (1 - reach * .46)).toFixed(4),
          '--turn-light': (.16 * lifted * reach).toFixed(4)
        });
        x += direction * Math.cos(angle) * step;
        z += rise * step;
      });
    }
    return strips.map(({strip,frames}) => strip.animate(frames, {duration, fill:'both'}));
  }

  function clearCatalogTurn() {
    if (!catalogTurn) return;
    catalogTurn.animations.forEach(animation => animation.cancel());
    catalogTurn.layer.replaceChildren();
    catalogTurn = undefined;
  }

  function clearCatalogMotion() {
    clearCatalogTurn();
    catalogReveal?.cancel();
    catalogReveal = undefined;
  }

  function castPageShadows(layer, direction, duration, narrow) {
    const frames = [
      {opacity:0,transform:`translateX(${50 * direction}%) scaleX(.4)`},
      {opacity:.57,transform:`translateX(${33 * direction}%) scaleX(.75)`,offset:.29},
      {opacity:.76,transform:'translateX(0) scaleX(.92)',offset:.5},
      {opacity:.38,transform:`translateX(${-36 * direction}%) scaleX(.8)`,offset:.73},
      {opacity:0,transform:`translateX(${-55 * direction}%) scaleX(.45)`}
    ];
    return (narrow ? ['full'] : ['left','right']).map(side => {
      const page = document.createElement('div');
      page.className = 'catalog-shadow-page';
      page.dataset.side = side;
      const shadow = document.createElement('div');
      shadow.className = 'catalog-turn-shadow';
      page.append(shadow);
      layer.append(page);
      return shadow.animate(frames, {duration, fill:'both'});
    });
  }

  function turnCatalog(direction, swap) {
    clearCatalogTurn();
    const layer = document.getElementById('catalog-turn-layer');
    if (!hasPerspective || reducedMotion.matches || !layer.animate) {
      swap();
      return;
    }
    const cover = document.getElementById('catalog-cover-page');
    const detail = document.getElementById('catalog-detail-page');
    const narrow = matchMedia('(max-width: 680px)').matches;
    const forwards = direction > 0;
    const turning = narrow || !forwards ? cover : detail;
    const other = turning === cover ? detail : cover;
    const style = getComputedStyle(turning);
    const width = parseFloat(style.width);
    const slope = parseFloat(style.getPropertyValue('--catalog-page-slope')) * Math.PI / 180;

    const held = document.createElement('div');
    held.className = 'catalog-held-page';
    held.dataset.side = other === cover ? 'left' : 'right';
    const front = copyPage(turning);
    held.append(copyPage(other));

    swap();
    const back = copyPage(narrow ? cover : other);

    const sheet = document.createElement('div');
    sheet.className = 'catalog-turn-sheet';
    sheet.dataset.direction = forwards ? 'forward' : 'backward';
    const duration = narrow ? 640 : 760;
    layer.append(held);
    const shadows = castPageShadows(layer, direction, duration, narrow);
    layer.append(sheet);
    const animations = bendLeaf(sheet, width, front, back, direction, duration, slope);
    animations.push(...shadows);
    const turn = {animations,layer};
    catalogTurn = turn;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (catalogTurn !== turn) return;
      layer.replaceChildren();
      catalogTurn = undefined;
    }, () => {});
  }

  reducedMotion.addEventListener?.('change', () => {
    clearPageTurn();
    clearCatalogMotion();
  });
  return {enableEntrance, enableCatalogRotation, revealCatalog, turnPage, clearPageTurn, turnCatalog, clearCatalogMotion};
})();
