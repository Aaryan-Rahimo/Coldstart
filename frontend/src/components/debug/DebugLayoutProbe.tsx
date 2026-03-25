'use client';

import { useEffect } from 'react';

const ENDPOINT =
  'http://127.0.0.1:7642/ingest/fd4b95e6-3d60-41ae-9580-294dfff72104';
const SESSION = '5cf372';

function send(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) {
  // #region agent log
  fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION,
    },
    body: JSON.stringify({
      sessionId: SESSION,
      location,
      message,
      data,
      timestamp: Date.now(),
      hypothesisId,
      runId: 'pre-fix',
    }),
  }).catch(() => {});
  // #endregion
}

export function DebugLayoutProbe() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const ch = getComputedStyle(html);
    const cb = getComputedStyle(body);
    const main = document.querySelector('main');

    send(
      'DebugLayoutProbe.tsx:H3',
      'overflow and viewport widths',
      {
        htmlOverflowX: ch.overflowX,
        bodyOverflowX: cb.overflowX,
        innerWidth: window.innerWidth,
        docElClientWidth: html.clientWidth,
        bodyClientWidth: body.clientWidth,
        deltaInnerVsClient: window.innerWidth - html.clientWidth,
      },
      'H3'
    );

    send(
      'DebugLayoutProbe.tsx:H2-H4',
      'body flex and main growth',
      {
        bodyDisplay: cb.display,
        bodyFlexDirection: cb.flexDirection,
        bodyMinHeight: cb.minHeight,
        mainExists: !!main,
        mainFlexGrow: main ? getComputedStyle(main).flexGrow : null,
        mainFlex: main ? getComputedStyle(main).flex : null,
        mainMargin: main ? getComputedStyle(main).margin : null,
        mainPadding: main ? getComputedStyle(main).padding : null,
        mainRectTop: main ? main.getBoundingClientRect().top : null,
        firstMainChildTag: main?.firstElementChild?.tagName ?? null,
      },
      'H2-H4'
    );

    const sampleBtn = document.querySelector('button');
    if (sampleBtn) {
      const sb = getComputedStyle(sampleBtn);
      send(
        'DebugLayoutProbe.tsx:H1',
        'sample button box model after universal reset',
        {
          marginTop: sb.marginTop,
          marginBottom: sb.marginBottom,
          paddingTop: sb.paddingTop,
          paddingBottom: sb.paddingBottom,
        },
        'H1'
      );
    }

    const header = document.querySelector('header');
    send(
      'DebugLayoutProbe.tsx:H5',
      'fixed header vs main top (dashboard vs landing)',
      {
        headerPosition: header ? getComputedStyle(header).position : null,
        headerHeight: header?.getBoundingClientRect().height ?? null,
        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
      },
      'H5'
    );
  }, []);

  return null;
}
