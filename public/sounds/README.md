# /public/sounds/

The site ships with **synthesized** click sounds (generated on the fly via the
Web Audio API in `src/lib/sounds.ts`). They work without any files in this
folder.

If you want to swap in real samples, drop MP3s here with these exact names
**and set `NEXT_PUBLIC_SOUND_SAMPLES=true`** in `.env.local`. Without that
flag the app never requests these files, so a folder with no samples costs
nothing (it used to fire seven 404s per page load):

| File | Variant | Used for | Default volume |
|---|---|---|---|
| `click-primary.mp3` | `primary` | Main CTAs: "start", "submit", "continue", "download_pdf" | 0.50 |
| `click-secondary.mp3` | `secondary` | Retry, "keep going", share, default AsciiButton sound | 0.50 |
| `click-nav.mp3` | `nav` | Navbar links (`~/hireloop`, `~/setup`, github, docs) | 0.40 |
| `click-toggle.mp3` | `toggle` | Role chips, seniority tiles, mode tiles, role list, mic toggle | 0.40 |
| `click-success.mp3` | `success` | "view report", "copied ✓", PDF generated | 0.55 |
| `click-danger.mp3` | `danger` | "end_interview", "end & get report", PDF gen failure | 0.60 |
| `click-soft.mp3` | `soft` | Expand/collapse rows, theme toggle, MuteToggle, fallback | 0.30 |

Guidance:

- Keep each file < 50 KB. Aim for 50–200 ms duration.
- Crisp UI clicks work best — avoid reverb tails.
- Real files take precedence over the synth fallback the moment they are
  preloaded (`preloadSounds()` runs when the navbar's `MuteToggle` mounts).

Where to source royalty-free UI click sounds:

- **mixkit.co/free-sound-effects/click/** — short, license-free UI clicks
- **pixabay.com/sound-effects/search/click/** — large library, CC0
- **freesound.org/search/?q=ui+click+short** — community-uploaded, check
  individual licenses (CC0 / CC-BY)

I cannot ship specific URLs to specific files because I can't verify they
still exist, but the search terms above land on usable libraries in
seconds. Browse, audition, download with the exact filename above, drop in
this folder, refresh.
