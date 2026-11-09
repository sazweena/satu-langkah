# Kawan Kata: working prototype

**One object. One word. One step at a time.**
A calm, step-by-step app that turns a real classroom object into a short KSSR Bahasa Melayu word lesson for autistic pupils in Standard 1–3 (PPKI/PPI), and any pupil who needs clear steps. This is a concept prototype for the **Festival Idea Putrajaya (FOI) 2026 Innovation Challenge** (Edutainment, IPT category).

**▶ Live demo:** https://sazweena.github.io/kawan-kata/ · recording mode: https://sazweena.github.io/kawan-kata/?demo

It's a static web app built from the team's mockups (see [`mockups/`](mockups/)). It has no build step and no server code.

| Setup (teacher) | Mission + first/then | "Adakah ini pensel?" | Listen & pick |
|---|---|---|---|
| ![](screenshots/1_setup.png) | ![](screenshots/2_mission.png) | ![](screenshots/4_confirm.png) | ![](screenshots/6_listen.png) |
| **Done + sticker** | **Break board** | **Teacher summary** | |
| ![](screenshots/7_done.png) | ![](screenshots/9_rehat.png) | ![](screenshots/8_summary.png) | |

## Run it
```bash
cd kawan-kata
python3 -m http.server 8765
```
Then open **http://localhost:8765** in Chrome, or just use the live link above. The camera only works on `localhost` or https, so opening `index.html` by double-clicking won't give you a camera.

| URL | Use |
|---|---|
| `http://localhost:8765/` | Real camera + on-device object recognition (TensorFlow.js MobileNet, loaded from a CDN, so you need internet) |
| `http://localhost:8765/?demo` | **For recording:** the camera is replaced by a drawn pencil, and every snap suggests "Pensel". Shows a small DEMO badge |
| `http://localhost:8765/?demo&nobadge` | Same, without the badge, for the final video |

### Keyboard shortcuts while recording
- **U**: the next "Ambil gambar" (take photo) returns **"Saya belum pasti."** (I'm not sure yet), to show the fallback.
- **D**: turn demo mode on or off.

## Screens (match the mockups)
1. **Sediakan sesi pembelajaran:** the teacher ticks words (Buku, Pensel, Pemadam, Bola, Cawan) → **Mula sesi**
2. **Hai! Kita belajar tentang objek:** the mission "Cari satu objek" → **Mula**
3. **Ambil gambar satu objek:** live camera with frame corners → **Ambil gambar**
4. **Adakah ini pensel?:** "MUNGKIN …", **Dengar perkataan**, **Ya, ini** / **Saya tak pasti**
5. **Saya belum pasti.:** choose from the teacher's words; "Ambil gambar semula" (take the photo again)
6. **Dengar dan pilih perkataan:** hear the word and pick the matching card; a wrong pick shows "Tidak mengapa…" (that's okay) with no penalty
7. **Bagus, sesi sudah selesai.:** **Selesai** or "Seterusnya: belajar perkataan lain"
8. **Ringkasan sesi (Paparan guru):** words attempted plus supports used (Ulang / Bantu / Rehat / Henti), and a note box

Always on the bottom bar:
- **Ulang:** repeats the instruction aloud
- **Bantu:** "Cikgu sudah dimaklumkan" (the teacher has been told)
- **Rehat:** a calm break screen, with no timer
- **Henti:** stop, which goes to the summary
- **Pilihan anda:** sound, large text, reduced animation

## How the AI works (and the privacy claim)
- Matching uses a **closed word set**. The model's guesses only count if they map to one of the teacher's selected words: pen or pencil → Pensel, eraser → Pemadam, any ball → Bola, cup or mug → Cawan, book or binder → Buku.
- If the score is below 0.15, the app **never guesses**. It goes to "Saya belum pasti."
- Even when it's confident, the child confirms ("Ya, ini"), so a match is never shown as fact.
- Recognition runs **in the browser on the device**. The photo is held only in memory for the current word and discarded on the "selesai" (finished) screen. Nothing is uploaded or saved. Only the sound, text-size and animation settings are kept, in browser storage.
- Voice uses the browser's speech engine: a Malay voice if the device has one, otherwise Indonesian, otherwise the default. On a Mac, add a Malay voice under System Settings → Accessibility → Spoken Content, and check how it sounds before recording.

## Known limits (be honest if asked)
- Recognition uses a general model (ImageNet). Pencils are often seen as "pen", which we treat as Pensel, and some objects simply won't match. That's exactly when the "Saya belum pasti" fallback appears.
- A real product would use a model trained on KSSR classroom objects, which is what the R&D grant would pay for.


## v2 additions
- **Teacher setup:** pick a pupil code (Murid 01–03), add the class's **own words with a photo** (+ Tambah perkataan), and set the session options: Suara (voice), Ganjaran pelekat (sticker reward), Pemasa rehat (break timer). Open `?reward` to start with the reward switched on.
- **Visual schedule:** 📷 Cari & ambil gambar → 👂 Dengar & pilih → ✅ Siap. Finished steps are ticked, with a soft chime.
- **"Saya usaha untuk…" (I'm working towards…):** a first → then board. The child picks ⭐ Pelekat (sticker), 🌿 Rehat (break) or 🎵 Lagu (song).
- **🔊 on every heading:** the instruction is read slowly, and the text stays visible.
- **Camera:** a big round shutter, no flash, **🖼️ Muat naik gambar** (upload a photo) for devices without a camera, and 📷 Ambil semula (retake).
- **Picture + word cards:** each card has its own 🔊. Mistakes are never penalised, and Bantu (help) is logged against the word.
- **Koleksi pelekat saya:** a calm sticker collection. It only appears when the teacher turns rewards on.
- **Rehat board:** the child chooses 1 minit, 2 minit or Bila saya sedia (when I'm ready). The calm ring timer has no ticking, and Kembali (back) is always available.
- **Teacher summary:** attempts per word, supports with counts, a note box and **🖨️ Cetak versi kertas** (printable picture–word cards for pupils who prefer paper).
- **Accessibility:**
  - icon + text on every control, in fixed positions
  - keyboard focus rings and a skip link
  - `prefers-reduced-motion` respected
  - Kontras tinggi (high contrast), Teks besar (large text), Kurangkan animasi (less animation)
  - touch targets ≥ 48–64 px

## Design principles & references
| Pattern | Where it comes from |
|---|---|
| Simple colours, plain words, descriptive buttons, simple consistent layouts, no autoplay or motion | GOV.UK / Home Office, *Designing for users on the autistic spectrum* ([poster](https://ukhomeoffice.github.io/accessibility-posters/autism), [blog](https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/)) |
| Visual schedule with an "all done" column and audio/visual confirmation; first–then board; waiting/break board with an optional timer | Choiceworks ([App Store](https://apps.apple.com/app/choiceworks/id486210964), [BridgingApps](https://bridgingapps.org/bridgingapps-featured-app-choiceworks-2/)); First Then Visual Schedule ([App Store](https://apps.apple.com/us/app/id624035410)) |
| Audio layer on every screen, icons over text, slow narration, big touch targets, no complex gestures | Khan Academy Kids ([blog](https://blog.khanacademy.org/supporting-english-language-acquisition-with-khan-academy-kids/)); Google, [Designing engaging apps for kids](https://developers.google.com/building-for-kids/designing-engaging-apps) |
| Fixed button positions (motor planning); colour-coded word cards | Proloquo2Go ([AssistiveWare colour coding](https://www.assistiveware.com/support/proloquo2go/appearance/color-code-page-background), [Crescendo](https://medium.com/@AssistiveWare/proloquo2go-4-0-goes-deeper-into-the-core-of-communication-with-crescendo-940ccde3b964)) |
| Calm, uncluttered screens; sticker rewards; adjustable sound/colour; teacher progress view | Otsimo ([App Store](https://apps.apple.com/app/id1475410615), [review](https://www.theautismdad.com/2019/06/23/review-otsimo-is-a-fantastic-educational-app-for-kids-with-autism/2)) |
