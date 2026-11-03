// Owner: Eashvar (testing). Component test for ClosePanel (Week 10b): the host's card on 11 to pick
// the winner and close the vote, which can't close until someone has voted. Once the vote is
// closed (by the host or the wheel), the card stays so the host can change the winner.
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

  it('Test6: once closed, Change the winner waits until another spot is picked', () => {
    const wrapper = mountPanel({ closed: true, currentId: 's1' })
    const button = wrapper.find('button')
    expect(button.text()).toBe('Change the winner')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Voting is closed. Pick another spot to change the winner.')
  })

  it('Test7: once closed, picking another spot lets the host change the winner', async () => {
    const wrapper = mountPanel({ closed: true, currentId: 's1', selectedId: 's2' })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('close')[0]).toEqual(['s2'])
  })

  it("Test8: once closed, it doesn't say when voting closes", () => {
    const wrapper = mountPanel({ closed: true, currentId: 's1', deadlineText: 'Thu, 15 Oct' })
    expect(wrapper.text()).not.toContain('Voting closes')
  })
})
