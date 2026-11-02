// Owner: Eashvar (testing). Component test for VoteTurnout (Week 10b): the turnout line on 11.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VoteTurnout from '../VoteTurnout.vue'

describe('TestSuite: VoteTurnout', () => {
  it('Test1: shows how many of the group have voted', () => {
    const wrapper = mount(VoteTurnout, { props: { votedCount: 3, memberCount: 4 } })
    expect(wrapper.text()).toContain('3 of 4 voted')
  })

  it('Test2: shows the turnout as a percentage', () => {
    const wrapper = mount(VoteTurnout, { props: { votedCount: 3, memberCount: 4 } })
    expect(wrapper.text()).toContain('75%')
  })

  it('Test3: shows 0% when nobody has voted', () => {
    const wrapper = mount(VoteTurnout, { props: { votedCount: 0, memberCount: 4 } })
    expect(wrapper.text()).toContain('0 of 4 voted')
    expect(wrapper.text()).toContain('0%')
  })

  it('Test4: shows the intro text passed in', () => {
    const wrapper = mount(VoteTurnout, {
      props: { votedCount: 1, memberCount: 2 },
      slots: { default: 'Voting closes Thu 9 pm' },
    })
    expect(wrapper.text()).toContain('Voting closes Thu 9 pm')
  })
})
