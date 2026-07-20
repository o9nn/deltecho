# DTEcho Next Steps

## Step 1: Live2D Cubism Integration
- [x] Read live2d-avatar and live2d-miara skills for model specs
- [x] Install pixi-live2d-display and pixi.js dependencies (CDN)
- [x] Find/host Miara .moc3 model files (or use a free Cubism model) — Using Haru (Cubism 4) and Shizuku (Cubism 2) from CDN
- [x] Replace SVG avatar with actual Live2D renderer in AvatarDisplay
- [x] Map DTE expression system to Cubism parameters (ParamMouthForm, ParamEyeLOpen, ParamEyeROpen, ParamBrowLY, ParamBrowRY, ParamEyeBallY)
- [x] Wire endocrine bus to drive Live2D expressions (requestAnimationFrame loop)
- [x] Fix dark background for transparent areas in WebGL canvas
- [x] Adjust model positioning for portrait-style face framing

## Step 2: Nakama Server Connectivity
- [x] Upgrade to web-db-user for backend API proxy
- [x] Create Nakama client with WebSocket connection support
- [x] Implement authentication flow (device auth)
- [x] Wire real-time presence to PresencePanel with connect/disconnect UI
- [x] Enable match-based cognitive state sharing (NakamaClient class)
- [ ] Deploy actual Nakama server for live testing (requires Docker)

## Step 3: LLM-Powered Chat
- [x] Create backend API route for LLM proxy (tRPC dte.chat mutation)
- [x] Integrate with Forge API (built-in invokeLLM) for chat completions
- [x] Build DTE system prompt with cognitive state context
- [x] Feed LLM responses back into endocrine system (analyzeResponseForEndocrine)
- [x] Display responses in ChatPanel with conversation history
- [x] Write vitest tests for DTE chat router (7 tests passing)

## Additional Completed
- [x] Upgrade project to web-db-user template (tRPC + auth + database)
- [x] Resolve merge conflicts from template upgrade
- [x] Push database schema
- [x] Model selector (Haru/Shizuku) with dynamic switching

## Step 4: Host Custom Miara .moc3 Model
- [x] Find Miara .moc3 model assets from deltecho repo (cubism/miara_pro_en/)
- [x] Upload model files (.moc3, textures, .model3.json, physics, motions, cdi) to S3 via manus-upload-file
- [x] Create CDN-absolute-path model3.json with all file references
- [x] Update Live2DCanvas to use hosted Miara model as primary (Haru/Shizuku as fallbacks)
- [x] Adjust expression parameter mapping for Miara's rich parameter set (face, body, hair, breath, brows)
- [x] Configure model selector with Miara as default

## Step 5: Max Resolution & Face Positioning Fix
- [x] Upload original 4096px texture to S3 (13MB, full resolution)
- [x] Create model3.json pointing to 4K texture with CDN URLs
- [x] Fix face positioning — yOffsetFactor: -0.05 to show face in circular frame
- [x] Increase Live2D canvas resolution to 2x DPR (576x576 physical for 288x288 CSS)
- [x] Test model rendering at full resolution — confirmed via canvas extract (Miara's face, purple eyes, cat ears, golden bird visible)
- [x] Note: Browser screenshot capture shows white circle due to WebGL compositing limitation; actual user experience shows model correctly
