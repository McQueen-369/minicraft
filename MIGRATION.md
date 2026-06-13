# Moving this project to the minicraft repo

This folder is fully self-contained (own package.json, no imports from the rest of
deadline-dash), so moving it to https://github.com/McQueen-369/minicraft is a copy + push:

```bash
# 1. Get both repos locally
git clone https://github.com/McQueen-369/deadline-dash -b claude/local-minecraft-build-a5o5rs
git clone https://github.com/McQueen-369/minicraft

# 2. Copy the project to the root of the new repo
cp -r deadline-dash/Minecraft/. minicraft/
cd minicraft

# 3. Commit and push
git add -A
git commit -m "Import Minicraft voxel game"
git push origin main
```

Alternatively, start a Claude Code session scoped to the minicraft repo and ask it to
import the `Minecraft/` folder from the `claude/local-minecraft-build-a5o5rs` branch of
deadline-dash.

After moving, this folder can be deleted from deadline-dash.
