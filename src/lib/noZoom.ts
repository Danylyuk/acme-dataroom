/**
 * Глушить pinch-to-zoom на iOS Safari.
 *
 * Чому JS, а не meta viewport: Safari з iOS 10 НАВМИСНО ігнорує
 * `user-scalable=no` / `maximum-scale` (доступність), тож єдиний спосіб
 * прибрати «гумове» масштабування застосунку — перехопити нативні
 * Safari-події жестів та double-tap.
 */
export function installNoZoom() {
  // Двопальцевий pinch (gesture* — Safari-специфічні події).
  const prevent = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', prevent, { passive: false })
  document.addEventListener('gesturechange', prevent, { passive: false })
  document.addEventListener('gestureend', prevent, { passive: false })

  // Double-tap zoom: другий тап у межах 300 мс — гасимо.
  let lastTouch = 0
  document.addEventListener(
    'touchend',
    (e) => {
      const now = e.timeStamp
      if (now - lastTouch <= 300) e.preventDefault()
      lastTouch = now
    },
    { passive: false },
  )
}
