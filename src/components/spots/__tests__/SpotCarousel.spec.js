import { describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SpotCarousel from '../SpotCarousel.vue'

const spots = [
  { id: 'one', name: 'Spot One' },
  { id: 'two', name: 'Spot Two' },
  { id: 'three', name: 'Spot Three' },
]

function mountCarousel(items = spots) {
  const wrapper = mount(SpotCarousel, {
    props: { items },
    slots: {
      default: ({ item }) => h('article', item.name),
    },
  })
  const viewport = wrapper.get('.cards').element
  Object.defineProperty(viewport, 'clientWidth', { configurable: true, value: 320 })
  viewport.scrollTo = vi.fn()
  return { wrapper, viewport }
}

describe('SpotCarousel', () => {
  it('renders each item and only shows arrows when there are multiple items', () => {
    const { wrapper } = mountCarousel()

    expect(wrapper.findAll('.cards article').map((card) => card.text())).toEqual([
      'Spot One',
      'Spot Two',
      'Spot Three',
    ])
    expect(wrapper.get('[aria-label="Previous spot"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Next spot"]').exists()).toBe(true)

    const singleItem = mountCarousel([spots[0]]).wrapper
    expect(singleItem.find('[aria-label="Previous spot"]').exists()).toBe(false)
    expect(singleItem.find('[aria-label="Next spot"]').exists()).toBe(false)
  })

  it('moves through items and disables arrows at the ends', async () => {
    const { wrapper, viewport } = mountCarousel()
    const previous = wrapper.get('[aria-label="Previous spot"]')
    const next = wrapper.get('[aria-label="Next spot"]')

    await next.trigger('click')
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: 'smooth' })
    expect(previous.attributes('disabled')).toBeUndefined()
    expect(next.attributes('disabled')).toBeUndefined()

    await next.trigger('click')
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: 'smooth' })
    expect(next.attributes('disabled')).toBeDefined()

    await previous.trigger('click')
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 320, behavior: 'smooth' })
    expect(next.attributes('disabled')).toBeUndefined()
  })

  it('clamps externally requested indexes to the available items', async () => {
    const { wrapper, viewport } = mountCarousel()

    wrapper.vm.scrollToIndex(-4)
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' })

    wrapper.vm.scrollToIndex(99)
    await nextTick()
    expect(viewport.scrollTo).toHaveBeenLastCalledWith({ left: 640, behavior: 'smooth' })
    expect(wrapper.get('[aria-label="Next spot"]').attributes('disabled')).toBeDefined()
  })
})
