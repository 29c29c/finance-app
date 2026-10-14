(() => {
    const FinanceUI = window.FinanceUI || (window.FinanceUI = {});

    // Mobile keyboards can resize/pan the visual viewport while leaving 100dvh unchanged.
    // Keep the overlay in the visible area and scroll only the form, never the page.
    function bindModalViewport(overlay, scroller, environment = window) {
        const viewport = environment.visualViewport;
        let frame = null;

        const keepInputVisible = () => {
            const input = environment.document.activeElement;
            if (!scroller.contains(input) || !input.matches('input, select, textarea')) return;
            const visible = scroller.getBoundingClientRect();
            const field = input.getBoundingClientRect();
            const margin = 12;
            if (field.bottom > visible.bottom - margin) {
                scroller.scrollTop += field.bottom - visible.bottom + margin;
            } else if (field.top < visible.top + margin) {
                scroller.scrollTop -= visible.top + margin - field.top;
            }
        };

        const update = () => {
            const height = viewport?.height ?? environment.innerHeight;
            overlay.dataset.compact = height < 420 ? 'true' : 'false';
            overlay.style.setProperty('--modal-viewport-height', `${height}px`);
            overlay.style.setProperty('--modal-viewport-width', `${viewport?.width ?? environment.innerWidth}px`);
            overlay.style.setProperty('--modal-viewport-top', `${viewport?.offsetTop ?? 0}px`);
            overlay.style.setProperty('--modal-viewport-left', `${viewport?.offsetLeft ?? 0}px`);
        };

        const schedule = () => {
            if (frame !== null) return;
            frame = environment.requestAnimationFrame(() => {
                frame = null;
                update();
                keepInputVisible();
            });
        };

        update();
        schedule();
        viewport?.addEventListener('resize', schedule);
        viewport?.addEventListener('scroll', schedule);
        environment.addEventListener('resize', schedule);
        scroller.addEventListener('focusin', schedule);

        return () => {
            if (frame !== null) environment.cancelAnimationFrame(frame);
            viewport?.removeEventListener('resize', schedule);
            viewport?.removeEventListener('scroll', schedule);
            environment.removeEventListener('resize', schedule);
            scroller.removeEventListener('focusin', schedule);
        };
    }

    FinanceUI.bindModalViewport = bindModalViewport;
})();
