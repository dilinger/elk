import { stringifyQuery } from 'vue-router'
import { createError, defineEventHandler, getQuery, getRouterParams, sendRedirect } from 'h3'
import { getApp, getRedirectURI } from '~/server/shared'

export default defineEventHandler(async (event) => {
  const { origin } = getQuery(event) as { origin: string }
  let { server } = getRouterParams(event)
  server = server.toLocaleLowerCase().trim()
  const app = await getApp(origin, server)

  if (!app) {
    throw createError({
      statusCode: 400,
      statusMessage: `App not registered for server: ${server}`,
    })
  }

  const { code } = getQuery(event)
  if (!code) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Missing authentication code.',
    })
  }

  const result: any = await $fetch(`https://${server}/oauth/token`, {
    method: 'POST',
    body: {
      client_id: app.client_id,
      client_secret: app.client_secret,
      redirect_uri: getRedirectURI(origin, server),
      grant_type: 'authorization_code',
      code,
      scope: 'read write follow push',
    },
    retry: 3,
  })

  const url = `/signin/callback?${stringifyQuery({ server, token: result.access_token, vapid_key: app.vapid_key })}`
  await sendRedirect(event, url, 302)
})
