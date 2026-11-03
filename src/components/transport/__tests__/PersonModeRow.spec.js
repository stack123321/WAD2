// Owner: Eashvar (testing; for Nicole's 07 Mode of transport). Component test for PersonModeRow
// (Week 10b): one person's row on 07. Friends who haven't added a starting point or picked a mode
// get a Remind button (from the prof's feedback: reminders shouldn't need going back a step),
// only your own row lets you pick a mode, and each row shows the travel time and cost.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PersonModeRow from '../PersonModeRow.vue'

// someone who has added Tampines MRT and picked MRT: 34 min, $1.79
const allSet = {
  display_name: 'Ryan',
  start_label: 'Tampines MRT',
  start_lat: 1.3547,
  mode: 'mrt',
  travel_mins: 34,
  travel_cost: 1.79,
}
const noStart = { ...allSet, start_label: null, start_lat: null, mode: null, travel_mins: null }
const noMode = { ...allSet, mode: null }

describe('TestSuite: PersonModeRow', () => {
  it('Test1: a friend with no starting point says so and gets a Remind button', async () => {
    const wrapper = mount(PersonModeRow, { props: { member: noStart } })
    expect(wrapper.text()).toContain('No starting point yet')

    await wrapper.find('.remind').trigger('click')

    expect(wrapper.emitted('remind')).toHaveLength(1)
  })

  it('Test2: a friend with a starting point but no mode can be reminded too', () => {
    const wrapper = mount(PersonModeRow, { props: { member: noMode } })
    expect(wrapper.text()).toContain('From Tampines MRT')
    expect(wrapper.findAll('.remind')).toHaveLength(1)
  })

  it('Test3: a friend who is all set has no Remind button', () => {
    const wrapper = mount(PersonModeRow, { props: { member: allSet } })
    expect(wrapper.findAll('.remind')).toHaveLength(0)
  })

  it('Test4: my own row never shows Remind, even before I pick a mode', () => {
    const wrapper = mount(PersonModeRow, { props: { member: noMode, isMe: true } })
    expect(wrapper.text()).toContain('Ryan (you)')
    expect(wrapper.text()).toContain('Pick your mode')
    expect(wrapper.findAll('.remind')).toHaveLength(0)
  })

  it('Test5: just after reminding, the button says "Sent ✓" and can’t be pressed again', () => {
    const wrapper = mount(PersonModeRow, { props: { member: noStart, remindStatus: 'Sent ✓' } })
    const remind = wrapper.find('.remind')
    expect(remind.text()).toBe('Sent ✓')
    expect(remind.attributes()).toHaveProperty('disabled')
  })

  it('Test6: on my own row, clicking Bus emits pick with "bus"', async () => {
    const wrapper = mount(PersonModeRow, { props: { member: allSet, isMe: true } })
    const bus = wrapper.findAll('button').find((b) => b.text() === 'Bus')

    await bus.trigger('click')

    expect(wrapper.emitted('pick')[0]).toEqual(['bus'])
  })

  it('Test7: on a friend’s row, the mode buttons can’t be clicked', () => {
    const wrapper = mount(PersonModeRow, { props: { member: allSet } })
    const mrt = wrapper.findAll('button').find((b) => b.text() === 'MRT')
    expect(mrt.attributes()).toHaveProperty('disabled')
  })

  it('Test8: shows the travel time and the fare one way', () => {
    const wrapper = mount(PersonModeRow, { props: { member: allSet } })
    expect(wrapper.text()).toContain('34 min')
    expect(wrapper.text()).toContain('$1.79 one way')
  })

  it('Test9: driving shows the hourly parking rate instead', () => {
    const driving = { ...allSet, mode: 'car', travel_mins: 22, travel_cost: 1.2 }
    const wrapper = mount(PersonModeRow, { props: { member: driving } })
    expect(wrapper.text()).toContain('$1.20/h parking')
  })

  it('Test10: while new times are being worked out, it says so', () => {
    const wrapper = mount(PersonModeRow, { props: { member: allSet, updating: true } })
    expect(wrapper.text()).toContain('Working out…')
    expect(wrapper.text()).not.toContain('34 min')
  })
})
