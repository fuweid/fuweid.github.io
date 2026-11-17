/* Hover over a county to see its name; click to zoom into its state. */
(function () {
    var smallScreen = matchMedia('(max-width: 640px)');
    var svg = document.getElementById('roadtrip-map');
    var controls = document.getElementById('roadtrip-controls');
    var countyName = document.getElementById('roadtrip-county');
    var resetButton = document.getElementById('roadtrip-reset');
    var hint = document.getElementById('roadtrip-hint');
    var full = svg.getAttribute('viewBox').split(' ').map(Number);
    var current = null;     // the state the map is zoomed into, like "51"
    var moves = 0;

    // Keep accessible names without also showing the browser's native tooltip.
    svg.querySelectorAll('.counties title').forEach(function (title) {
        title.parentElement.setAttribute('aria-label', title.textContent);
        title.remove();
    });

    // An outline on top of the map, around the county that is named.
    var outline = document.createElementNS(svg.namespaceURI, 'path');
    outline.setAttribute('class', 'outline');
    svg.insertBefore(outline, svg.querySelector('.names'));

    // Name and outline a county; without one, clear both.
    function mark(county) {
        var name = county ? county.getAttribute('aria-label') : '';
        if (countyName.textContent !== name) {
            countyName.textContent = name;
            outline.setAttribute('d', county ? county.getAttribute('d') : '');
        }
        return name;
    }

    function setViewBox(box) {
        svg.setAttribute('viewBox', box.join(' '));
        // Keep lines and names at their size on screen.
        svg.style.setProperty('--zoom', full[2] / box[2]);
    }

    function zoom(to, immediate) {
        var move = ++moves, start;
        if (immediate) {
            setViewBox(to);
            return;
        }
        var from = svg.getAttribute('viewBox').split(' ').map(Number);

        requestAnimationFrame(function step(now) {
            if (move !== moves) {
                return;     // another click took over
            }
            start = start || now;

            var t = Math.min(1, (now - start) / 400);
            var box = from.map(function (v, i) { return v + (to[i] - v) * t * (2 - t); });

            setViewBox(box);
            if (t < 1) {
                requestAnimationFrame(step);
            }
        });
    }

    // Hide the selected state's label while zoomed in.
    function stateName(state, zoomed) {
        var el = document.getElementById('n' + state);
        if (el) {
            el.classList.toggle('zoomed', zoomed);
        }
    }

    function reset(immediate) {
        stateName(current, false);
        current = null;
        mark();
        resetButton.hidden = true;
        hint.hidden = false;
        zoom(full, immediate);
    }

    function updateLayout() {
        // Switching layouts also cancels any zoom animation in progress.
        reset(true);
        controls.hidden = smallScreen.matches;
    }

    function showCounty(e) {
        var name = mark(e.target.matches('.counties path') ? e.target : null);
        var floating = e.pointerType === 'mouse';
        countyName.classList.toggle('tooltip', floating);
        if (!name || !floating) {
            return;
        }

        var box = countyName.getBoundingClientRect();
        var x = e.clientX + 12, y = e.clientY + 12;
        if (x + box.width > document.documentElement.clientWidth - 8) {
            x = e.clientX - box.width - 12;
        }
        if (y + box.height > window.innerHeight - 8) {
            y = e.clientY - box.height - 12;
        }
        countyName.style.left = Math.max(8, x) + 'px';
        countyName.style.top = Math.max(8, y) + 'px';
    }

    function hideTooltip() {
        if (countyName.classList.contains('tooltip')) {
            mark();
        }
    }

    ['pointerover', 'pointermove'].forEach(function (type) {
        svg.addEventListener(type, function (e) {
            if (!smallScreen.matches && e.pointerType === 'mouse') {
                showCounty(e);
            }
        });
    });
    svg.addEventListener('pointerleave', hideTooltip);
    window.addEventListener('scroll', hideTooltip);
    window.addEventListener('resize', hideTooltip);

    svg.addEventListener('click', function (e) {
        if (smallScreen.matches) {
            return;
        }
        // the counties are on top, and the county "c51059" is in the state "51"
        var state = (/^c(\d\d)/.exec(e.target.id) || [])[1];

        if (!state) {
            reset();
            return;
        }

        showCounty(e);
        // Inspect other counties in the same state without zooming back out.
        if (state === current) {
            return;
        }
        stateName(current, false);

        // the state with some room around it, in the proportions of the map
        var box = document.getElementById('s' + state).getBBox();
        var width = Math.max(60, box.width * 1.2, box.height * 1.2 * full[2] / full[3]);
        var height = width * full[3] / full[2];

        current = state;
        resetButton.hidden = false;
        hint.hidden = true;
        stateName(state, true);
        zoom([box.x + box.width / 2 - width / 2, box.y + box.height / 2 - height / 2, width, height]);
    });

    resetButton.addEventListener('click', function () {
        reset();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hideTooltip();
            if (current) {
                reset();
            }
        }
    });
    smallScreen.addEventListener('change', updateLayout);
    updateLayout();
})();
