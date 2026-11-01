// Owner: Eashvar (testing). Component test for StartPanel (Week 10b): the host's card on 11 to
// pick when voting closes and start the vote. RouterLink (the "Find nearby spots" link) is
// replaced with a custom stub that shows its text.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StartPanel from '../StartPanel.vue'

// the closing times the host can pick for a hangout on Sat 24 Oct, 2 pm
const dayBefore = { iso: '2026-10-23T06:00:00.000Z', label: '1 day before the hangout' }
const twoHoursBefore = { iso: '2026-10-24T04:00:00.000Z', label: '2 hours before the hangout' }

function mountPanel(props) {
  return mount(StartPanel, {
    props: { spotCount: 2, options: [dayBefore, twoHoursBefore], exploreTo: {}, ...props },
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
}

describe('TestSuite: StartPanel', () => {
  it('Test1: says how many spots are on the shortlist', () => {
    expect(mountPanel().text()).toContain('2 spots are on the shortlist')
    expect(mountPanel({ spotCount: 1 }).text()).toContain('1 spot is on the shortlist')
  })

  it('Test2: starts with "2 hours before", and starting emits that time', async () => {
    const wrapper = mountPanel()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('start')[0]).toEqual([twoHoursBefore.iso])
  })

  it('Test3: picking another closing time starts the vote with that one', async () => {
    const wrapper = mountPanel()
    await wrapper.find('select').setValue(dayBefore.iso)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('start')[0]).toEqual([dayBefore.iso])
  })

  it('Test4: with nothing shortlisted, it can’t start and says to add a spot', () => {
    const wrapper = mountPanel({ spotCount: 0 })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Add at least one spot first.')
  })

  it('Test5: with no closing time left before the hangout, it can’t start', () => {
    const wrapper = mountPanel({ options: [] })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain("there's no time left to vote")
  })
})
