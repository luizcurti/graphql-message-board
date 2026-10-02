/**
 * @jest-environment node
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import GlobalStyles from './global';

describe('GlobalStyles', () => {
  it('emits the reset, background and font rules', () => {
    const sheet = new ServerStyleSheet();
    renderToString(sheet.collectStyles(<GlobalStyles />));
    const css = sheet.getStyleTags();
    sheet.seal();

    expect(css).toContain('box-sizing:border-box');
    expect(css).toContain('background-color:#282a36');
    expect(css).toContain("font:14px 'Roboto',sans-serif");
    expect(css).toContain('cursor:pointer');
  });
});
