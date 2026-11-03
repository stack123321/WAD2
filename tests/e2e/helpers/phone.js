// Owner: Eashvar (testing). Some pages work differently on a phone (09's spots become a swipeable
// row with a menu, the chat fills the screen), so those tests make the browser phone-sized first.
// page.setViewportSize isn't covered in the course; it's only used through this file.

// An iPhone-sized screen: 375 px wide, 812 px tall
export async function onPhone(page) {
  await page.setViewportSize({ width: 375, height: 812 })
}
