// Owner: Eashvar (testing). Component test for ClosePanel (Week 10b): the host's card on 11 to pick
// the winner and close the vote, which can't close until someone has voted.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ClosePanel from '../ClosePanel.vue'

const shortlist = [
  { id: 's1', name: 'Mock Cafe' },
  { id: 's2', name: 'Mock Board Game Cafe' },
]

function mountPanel(props) {
  return mount(ClosePanel, { props: { shortlist, selectedId: 's1', voteCount: 3, ...props } })
}

describe('TestSuite: ClosePanel', () => {
  it('Test1: the Winner list has every shortlisted spot', () => {
    const options = mountPanel().findAll('option')
    expect(options).toHaveLength(2)
    expect(options[1].text()).toBe('Mock Board Game Cafe')
  })

  it('Test2: choosing another winner emits select with that spot', async () => {
    const wrapper = mountPanel()
    await wrapper.find('select').setValue('s2')
    expect(wrapper.emitted('select')[0]).toEqual(['s2'])
  })

  it('Test3: closing emits close with the chosen winner', async () => {
    const wrapper = mountPanel()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('close')[0]).toEqual(['s1'])
  })

  it('Test4: with no votes yet, closing is blocked and it says why', () => {
    const wrapper = mountPanel({ voteCount: 0 })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Wait for at least one vote before closing.')
  })

  it('Test5: says when voting closes', () => {
    const wrapper = mountPanel({ deadlineText: 'Thu, 15 Oct, 9:00 pm' })
    expect(wrapper.text()).toContain('Voting closes Thu, 15 Oct, 9:00 pm SGT.')
  })
})
