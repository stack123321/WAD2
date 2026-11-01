// Owner: Eashvar (testing; for Hugo's 09 Nearby spots). Component test for SpotCard (Week 10b):
// one spot on 09, with its rating, match %, distance, price and any reasons it doesn't suit the
// group, and the "Add to vote" button.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpotCard from '../SpotCard.vue'

const cafe = {
  name: 'Quiet Corner Cafe',
  category: 'cafe',
  rating: 4.5,
  matchPct: 84,
  priceLevel: 2,
  stationDistanceM: 250,
  nearestStationName: 'Bishan',
}

describe('TestSuite: SpotCard', () => {
  it('Test1: shows the spot’s name, rating, match %, price and walk from the station', () => {
    const wrapper = mount(SpotCard, { props: cafe })
    expect(wrapper.text()).toContain('Quiet Corner Cafe')
    expect(wrapper.text()).toContain('⭐ 4.5')
    expect(wrapper.text()).toContain('84% match')
    expect(wrapper.text()).toContain('$$')
    expect(wrapper.text()).toContain('250 m from Bishan')
    expect(wrapper.text()).toContain('3 min walk') // 250 m at 80 m a minute
  })

  it('Test2: a kilometre or more is shown in km, and price level 0 as Free', () => {
    const wrapper = mount(SpotCard, { props: { ...cafe, stationDistanceM: 1200, priceLevel: 0 } })
    expect(wrapper.text()).toContain('1.2 km from Bishan')
    expect(wrapper.text()).toContain('Free')
  })

  it('Test3: clicking "Add to vote" emits add', async () => {
    const wrapper = mount(SpotCard, { props: cafe })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('Test4: once added, the button says "Added to vote" and can’t be clicked again', () => {
    const wrapper = mount(SpotCard, { props: { ...cafe, added: true } })
    const button = wrapper.find('button')
    expect(button.text()).toBe('Added to vote')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('Test5: a 0% match shows why it doesn’t suit the group', () => {
    const closed = { ...cafe, matchPct: 0, vetoReason: "Closed during your hangout's time" }
    const wrapper = mount(SpotCard, { props: closed })
    expect(wrapper.text()).toContain('0% match')
    expect(wrapper.text()).toContain("Closed during your hangout's time")
  })

  it('Test6: smaller problems that lower the match are listed too', () => {
    const far = { ...cafe, softVetoReasons: ["Far from the group's midpoint (~30 min walk)"] }
    const wrapper = mount(SpotCard, { props: far })
    expect(wrapper.text()).toContain("Far from the group's midpoint (~30 min walk)")
  })
})
