export function useBodyScrollLock() {
  let lockedScrollY = 0;

  let previousHtmlStyles: {
    height: string;
    overflow: string;
    overscrollBehavior: string;
  } | null = null;

  let previousBodyStyles: {
    height: string;
    left: string;
    overflow: string;
    overscrollBehavior: string;
    position: string;
    right: string;
    top: string;
    width: string;
  } | null = null;

  function lockBodyScroll() {
    if (previousHtmlStyles || previousBodyStyles) return;

    const html = document.documentElement;
    const body = document.body;

    lockedScrollY = window.scrollY;

    previousHtmlStyles = {
      height: html.style.height,
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };

    previousBodyStyles = {
      height: body.style.height,
      left: body.style.left,
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      position: body.style.position,
      right: body.style.right,
      top: body.style.top,
      width: body.style.width,
    };

    html.style.height = "100%";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
  }

  function unlockBodyScroll() {
    const html = document.documentElement;
    const body = document.body;

    if (previousHtmlStyles) {
      html.style.height = previousHtmlStyles.height;
      html.style.overflow = previousHtmlStyles.overflow;
      html.style.overscrollBehavior = previousHtmlStyles.overscrollBehavior;
    }

    if (previousBodyStyles) {
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      body.style.height = previousBodyStyles.height;
      body.style.overflow = previousBodyStyles.overflow;
      body.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
    }

    previousHtmlStyles = null;
    previousBodyStyles = null;

    window.scrollTo(0, lockedScrollY);
  }

  return {
    lockBodyScroll,
    unlockBodyScroll,
  };
}
