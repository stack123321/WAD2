// Owner: Eashvar (testing). Component test for TripTable (Week 10b): "Fair for everyone" on 12
// Final plan and the debrief, with the gap, the longest and shortest trip, and one row per person
// with their trip and when to leave.
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TripTable from '../TripTable.vue'

// three people meeting at 7 pm on Fri 16 Oct (11:00 UTC); Amy is "me"
const startsAt = '2026-10-16T11:00:00Z'
const members = [
  {
    user_id: 'amy',
    display_name: 'Amy',
    start_label: 'Tampines MRT',
    mode: 'mrt',
    travel_mins: 18,
    travel_cost: 1.5,
  },
  {
    user_id: 'ben',
    display_name: 'Ben',
    start_label: 'Jurong East MRT',
    mode: 'bus',
    travel_mins: 25,
    travel_cost: 1.2,
  },
  {
    user_id: 'cara',
    display_name: 'Cara',
    start_label: 'Punggol MRT',
    mode: 'car',
    travel_mins: 21,
    travel_cost: 1.2,
  },
]

function mountTable(props) {
  return mount(TripTable, { props: { members, startsAt, myId: 'amy', ...props } })
}

describe('TestSuite: TripTable', () => {
  it('Test1: shows the gap, the longest and the shortest trip, and who has them', () => {
    const text = mountTable().text()
    expect(text).toContain('7 min')
    expect(text).toContain("Everyone's trip is within 7 min of each other.")
    expect(text).toContain('Longest: Ben. Shortest: Amy.')
  })

  it('Test2: tags my row, the longest trip and the shortest trip', () => {
    const rows = mountTable().findAll('li')
    expect(rows).toHaveLength(3)
    expect(rows[0].text()).toContain('You')
    expect(rows[0].text()).toContain('Shortest')
    expect(rows[1].text()).toContain('Longest')
    expect(rows[2].text()).not.toContain('Longest')
  })

  it('Test3: each row shows the trip, its cost and when to leave', () => {
    const rows = mountTable().findAll('li')
    expect(rows[0].text()).toContain('Tampines MRT')
    expect(rows[0].text()).toContain('S$1.50')
    expect(rows[0].text()).toContain('18 min')
    expect(rows[0].text()).toContain('6:42') // 18 min before 7 pm
    expect(rows[2].text()).toContain('S$1.20/h parking')
  })

  it('Test4: when everyone’s trip is the same, no row is tagged longest or shortest', () => {
    const sameTime = members.map((m) => ({ ...m, travel_mins: 20 }))
    const wrapper = mountTable({ members: sameTime })
    expect(wrapper.text()).toContain('within 0 min')
    for (const row of wrapper.findAll('li')) {
      expect(row.text()).not.toContain('Longest')
      expect(row.text()).not.toContain('Shortest')
    }
  })

  it('Test5: on the debrief it looks back, without costs or leave-by times', () => {
    const text = mountTable({ past: true }).text()
    expect(text).toContain("Everyone's trip was within 7 min of each other.")
    expect(text).not.toContain('Leave by')
    expect(text).not.toContain('S$')
  })

  it('Test6: before anyone has a travel time, it says when they will appear', () => {
    const noTimes = members.map((m) => ({ ...m, travel_mins: null }))
    expect(mountTable({ members: noTimes }).text()).toContain(
      "Travel times appear once everyone has picked how they're travelling.",
    )
  })
})
