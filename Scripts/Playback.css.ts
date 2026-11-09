import { globalStyle, style } from '@vanilla-extract/css';

// Icon elements remain in HTML; the generated state is shared by both players.
export const playing = style({});
globalStyle(`#preview-toggle .preview-pause-icon, #preview-toggle.${playing} .preview-play-icon`, { display: 'none' });
globalStyle(`#preview-toggle.${playing} .preview-pause-icon`, { display: 'block' });
globalStyle(`#composition-play .composition-stop-icon, #composition-play.${playing} .composition-play-icon`, { display: 'none' });
globalStyle(`#composition-play.${playing} .composition-stop-icon`, { display: 'block' });
