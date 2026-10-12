import 'dotenv/config'
import { defineSimConfig } from '@data-fair/lib-agents-sim'

// No path suffix: cases run in the data-fair back-office shell, their routes carry /data-fair/.
export default defineSimConfig({ baseURL: `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}` })
