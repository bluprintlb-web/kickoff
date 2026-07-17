// Set for one reload cycle by anything that intentionally triggers a full
// page reload as an implementation detail (e.g. the language toggle), so
// that reload-driven UX (the splash's artificial delay, the reload -> home
// redirect) doesn't kick in for it. Self-expires after a few seconds so it
// never lingers to affect a later, genuine reload.
export const QUIET_RELOAD_COOKIE = "ls-quiet-reload";
