# IMLADRIS

**Integrated Models Linking Analytics Directly, Retroactively, and In-Situ**

Analytics platform that reveals insights through cross-domain correlation. Compares subjective perception against calculated indices to detect divergence patterns and unexpected connections across data domains.

---

## 🚀 Quick Start

### Prerequisites
- Google Account (for Google Sheets + Apps Script)
- Modern web browser (Chrome, Safari, Firefox, Edge)

### Setup (5 minutes)

1. **Create Google Sheet**
   - Create new Google Sheet
   - Add tabs: `User_Profiles`, `RawData`, `Categories`, `IDX_Rules`, `User_Config`, `Verification_Codes`
   - See [SHEET_STRUCTURE.md](docs/SHEET_STRUCTURE.md) for column headers

2. **Deploy Apps Script**
   - In your Sheet: Extensions → Apps Script
   - Paste code from `/apps-script/imladris_backend.gs`
   - Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone
   - Copy Web App URL

3. **Configure HTML**
   - Open `IMLADRIS_SpecialEdition.html`
   - Find line: `const API_URL = 'https://script.google.com/...'`
   - Replace with your Web App URL
   - Save file

4. **Launch**
   - Open `IMLADRIS_SpecialEdition.html` in browser
   - Create profile (handle + 4-char PIN)
   - Add first entry
   - Watch data appear in Sheet

---

## 📊 Architecture

### Data Flow
```
HTML Interface (localStorage default)
    ↓
Apps Script API (GET/POST handlers)
    ↓
Google Sheet (6 tabs: profiles, data, categories, rules, config, codes)
```

### Key Features
- **Authentication**: Multi-user with PIN + security questions
- **Data Entry**: Mobile-optimized 24-category input
- **Validation Panel**: OVR vs IDX divergence tracking
- **Visualization**: ASCII graph with SVG overlays (Phase 3)
- **Privacy**: Offline-first, single-file deployment

### Categories (24)
`pro` `scl` `fit` `lov` `gnh` `fnc` `usl` `fth` `rst` `pyn` `stx` `emo` `fml` `crt` `dyt` `ptn` `ppl` `pol` `anx` `mtv` `imp` `opt` `spr` `foc`

---

## 🔧 Development Status

### ✅ Phase 1-2 Complete
- Authentication system (login, create, reset PIN)
- Data entry modal
- Category/IDX chip selectors
- Basic graph rendering
- Validation panel (divergence calculation)
- Settings sidebar
- Mobile-optimized UI

### 🚧 Phase 3 In Progress
- Full ASCII 7-column graph rendering
- SVG overlay system with IDX lines
- Number rank pathways
- Pulsating line animation
- Find Similar Days
- Export functionality
- Category descriptor sidebar

---

## 📝 Usage

### Adding Data
1. Click "➕ Add Entry"
2. Select date (defaults to today)
3. Enter OVERALL rating (your subjective assessment)
4. Fill in category values (0-10 scale, optional)
5. Add notes (optional, 1000 char max)
6. Submit

### Reading the Validation Panel
- **🟢 Harmony** (< 1σ): Perception aligns with reality
- **🟡 Caution** (1-2σ): Moderate divergence detected
- **🔴 Alert** (> 2σ): High divergence - examine why

### Customizing
- **Font Size**: Settings → S/M/L/XL
- **SVG Lines**: Adjust size, transparency, glow
- **Gradients**: Pick 3-color custom gradient
- **IDX Formulas**: Edit in Google Sheet `IDX_Rules` tab

---

## 🔒 Security

- **No PII by default** - User controls all data
- **PIN hashing** - SHA-256, never stored plain text
- **Single-file** - No external dependencies
- **localStorage default** - No centralized data honeypot
- **Optional cloud sync** - User chooses Sheet permissions

---

## 🎯 Use Cases

### Personal
- Wellness tracking (sleep, mood, energy)
- Budget correlation with life events
- Relationship quality monitoring

### Business
- Property management metrics (HostEase integration)
- Restaurant sustainability ratings (Osprey/JNSQ)
- Team performance tracking

### Research
- Self-awareness studies
- Perception vs reality analysis
- Cross-domain correlation discovery

---

## 🤝 Collaborators

- **Jeremy** - Lead developer, architecture, business model
- **Brett** - First client, HostEase property management integration
- **Don Bates** - Osprey restaurant sustainability (JNSQ)

---

## 📞 Support

For setup issues or questions:
1. Check [docs/SETUP.md](docs/SETUP.md) for detailed troubleshooting
2. Verify Apps Script deployment status
3. Check browser console for errors
4. Confirm Sheet permissions ("Anyone with link can edit")

---

## 📜 Version History

### v2.4.0 (SpecialEdition) - Current
- Multi-user authentication
- Google Sheets integration
- Mobile-first responsive design
- Validation panel (Perception vs Reality)
- Category/IDX selector chips
- Basic graph rendering

### Next: v2.5.0
- Full ASCII graph system
- SVG overlay rendering
- Advanced features (Find Similar Days, Export)

---

## 🗺️ Roadmap

**Short Term**
- [ ] Complete Phase 3 visualization
- [ ] HostEase (Brett) integration testing
- [ ] Osprey (Don) integration testing

**Medium Term**
- [ ] OAuth for production security
- [ ] Multi-Sheet support (cross-domain correlation)
- [ ] Advanced forecasting (polynomial regression)
- [ ] Public v1.0 release

**Long Term**
- [ ] API for third-party integrations
- [ ] Mobile native app (React Native)
- [ ] Enterprise features (team workspaces)

---

**Built with ❤️ by Jeremy | IMLADRIS Project**
