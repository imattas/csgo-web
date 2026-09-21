# CS:GO Web

Standalone browser port of the CS:GO-inspired web game.

## Local development

Run a static server from the repository root, then open `/csgo/`:

```powershell
python -m http.server 8765
```

Open `http://localhost:8765/csgo/`.

## Cloudflare deployment

The repository includes the Worker asset configuration used for deployment:

```powershell
npx wrangler@latest deploy
```

The `csgo/` directory is the game port. Other Web Dashers games are intentionally not included.
