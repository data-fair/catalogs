import type { Timezone } from 'timezones.json'
import timeZonesModule from 'timezones.json'

// a commonjs module: its default import is the array at runtime, typed as the module under nodenext
const timeZones = timeZonesModule as unknown as Timezone[]

// the distinct UTC time zone names of timezones.json, the items of the scheduling time zone
// (context.utcs of its vjsf layout), for the UI forms and the agent-ready schemas of the api
export const utcs: string[] = []
for (const tz of timeZones) {
  for (const utc of tz.utc) {
    if (!utcs.includes(utc)) utcs.push(utc)
  }
}
