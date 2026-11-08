/** 追加された項目まで一覧を移動し、軽く弾ませる。 */
export function revealAddedItem(list) {
    const added = list.lastElementChild;
    requestAnimationFrame(() => {
        if (!added?.isConnected || !list.clientHeight) return;
        list.scrollTop = list.scrollHeight;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        added.animate([
            { transform: 'scale(.96)', opacity: .4 },
            { transform: 'scale(1.015)', opacity: 1, offset: .55 },
            { transform: 'scale(.995)', offset: .8 },
            { transform: 'scale(1)', opacity: 1 },
        ], { duration: 320, easing: 'ease-out' });
    });
}
