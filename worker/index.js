// Serves the pre-built site, and sends visitors on secondary addresses (www, the old workers.dev URL)
// to the main domain with a permanent redirect, so search engines index one address.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const canonical = env.CANONICAL_HOST
    // preview builds use "<version>-toolbox.<account>.workers.dev" and are left alone
    const secondary = url.hostname === `www.${canonical}` || (url.hostname.startsWith('toolbox.') && url.hostname.endsWith('.workers.dev'))
    if (canonical && secondary) {
      url.protocol = 'https:'
      url.hostname = canonical
      url.port = ''
      return Response.redirect(url.toString(), 301)
    }
    return env.ASSETS.fetch(request)
  },
}
