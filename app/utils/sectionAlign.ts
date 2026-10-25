// A section is pulled up to the top only when scrolling down has just stopped with its top in the upper part of
// the window; scrolling up (e.g. back from the footer) is never pulled back
const ALIGN_ZONE = 0.4;
const ALIGNED_SLACK_PX = 2;

export function shouldAlignSection(sectionTop: number, viewportHeight: number, scrollingDown: boolean): boolean {
  return scrollingDown && sectionTop > ALIGNED_SLACK_PX && sectionTop <= viewportHeight * ALIGN_ZONE;
}
