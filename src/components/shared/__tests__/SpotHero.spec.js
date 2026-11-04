// Owner: Eashvar (testing). Component test for SpotHero (Week 10b): the big spot card on 12 Final
// plan and the Debrief shows the spot's photo, or a tinted block with its initial when there's no
// photo or the photo fails to load.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpotHero from '../SpotHero.vue'

const spot = {
  name: 'Bishan Hawker Centre',
  category: 'hawker',
  image_url: '/api/place-photo?name=places/p1/photos/a',
}

describe('TestSuite: SpotHero', () => {
  it('Test1: shows the photo when the spot has one', () => {
    const wrapper = mount(SpotHero, { props: { spot, label: 'Confirmed spot' } })
    expect(wrapper.find('img').attributes('alt')).toBe('Photo of Bishan Hawker Centre')
    expect(wrapper.findAll('.hero__fallback')).toHaveLength(0)
  })

  it('Test2: with no photo, shows the initial and category instead', () => {
    const noPhoto = { ...spot, image_url: null }
    const wrapper = mount(SpotHero, { props: { spot: noPhoto, label: 'Confirmed spot' } })
    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(wrapper.find('.hero__initial').text()).toBe('B')
  })

  it("Test3: a photo that doesn't load is swapped for the initial", async () => {
    const wrapper = mount(SpotHero, { props: { spot, label: 'Confirmed spot' } })
    await wrapper.find('img').trigger('error')
    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(wrapper.find('.hero__fallback').text()).toContain('hawker')
  })
})
