import { style } from '@vanilla-extract/css';

export const toast = style({
    position: 'fixed', bottom: 24, left: '50%', zIndex: 10,
    maxWidth: 'calc(100vw - 32px)', padding: '10px 18px',
    border: '1px solid #42634d', borderRadius: 8,
    background: '#283f33', color: 'var(--text)', boxShadow: '0 6px 24px #0006',
    opacity: 0, transform: 'translate(-50%, 10px)', pointerEvents: 'none',
    transition: 'opacity .15s, transform .15s',
});
export const visible = style({
    selectors: { [`${toast}&`]: { opacity: 1, transform: 'translate(-50%, 0)' } },
});
